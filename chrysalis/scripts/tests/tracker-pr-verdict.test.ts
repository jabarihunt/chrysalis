// End-to-end tests for pr-verdict, which posts the code review gate's verdict on the pull request,
// and for the rules that keep code review verdicts off the issue. Every test runs against the fake gh
// in fake-gh.ts, so no test calls GitHub.
import { afterEach, describe, expect, test } from "bun:test";
import { latestVerdictComment } from "../lib/tracker/pr";
import { emptyState } from "./fake-gh";
import type { FakePrComment } from "./fake-gh";
import { cleanup, fakeGh, makeRepo, sh, tracker, writeApp } from "./helpers";

afterEach(cleanup);

const HEAD = "8d41e07a1b2c3d4e5f60718293a4b5c6d7e8f901";
const PR = "https://github.com/acme/todo/pull/7";
const TPM = ["--app", "todo", "--agent", "tpm"];
const CR = ["--app", "todo", "--agent", "code-review"];

const verdict = (result: "pass" | "block", commit = HEAD.slice(0, 7)) =>
  `Gate: code-review\nVerdict: ${result}\nCommit: ${commit}\nRange: master...HEAD\n\n## Findings\n\n${result === "pass" ? "None" : "1. The route skips the owner check."}\n`;

/**
 * A local-tracker app with a bug issue at ready-for-pr and open pull request #7 in acme/todo. By
 * default the repository has a GitHub origin, and the TPM links the pull request and sets code-review.
 */
async function setup(opts: { prState?: "OPEN" | "CLOSED" | "MERGED"; remote?: boolean; link?: boolean; comments?: FakePrComment[]; ghVersion?: string } = {}) {
  const repo = await makeRepo();
  if (opts.remote ?? true) await sh(["git", "remote", "add", "origin", "git@github.com:acme/todo.git"], repo);
  writeApp(repo, "todo", "tracker:\n  type: local\n");
  const prs = [{ number: 7, state: opts.prState ?? "OPEN", headRefOid: HEAD, comments: opts.comments ?? [] }];
  const gh = fakeGh({ version: opts.ghVersion, state: { ...emptyState(), prs } });
  const cli = (args: string[], input?: string) => tracker(repo, args, { input, env: gh.env });
  await cli(["create", ...TPM, "--kind", "bug", "--title", "Dates shift", "--body-file", "-"], "b");
  for (const status of ["red", "implementing", "security-review", "test-review", "docs", "ready-for-pr"]) await cli(["set", "todo#1", ...TPM, "--status", status]);
  if (opts.link ?? true) {
    await cli(["link", "todo#1", ...TPM, "--field", "pr", "--value", PR]);
    await cli(["set", "todo#1", ...TPM, "--status", "code-review"]);
  }
  return { gh, cli };
}

const postVerdict = (cli: Awaited<ReturnType<typeof setup>>["cli"], result: "pass" | "block", commit?: string) =>
  cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], verdict(result, commit));

describe("pr-verdict", () => {
  test("a pass posts the verdict comment and a success status on the head commit", async () => {
    const { gh, cli } = await setup();
    const result = await postVerdict(cli, "pass");
    expect(result.error).toBeNull();
    expect(result.json).toEqual({ ref: "todo#1", gate: "code-review", verdict: "pass", pr: PR, commit: HEAD, state: "success", comment_url: `${PR}#issuecomment-1001`, reused_comment: false });
    const state = gh.state();
    expect(state.prs[0]!.comments[0]!.body).toMatch(/^verdict from code-review at \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\n\nGate: code-review\nVerdict: pass\n/);
    expect(state.statuses).toEqual([{ sha: HEAD, state: "success", context: "chrysalis/code-review", description: "Code review passed", target_url: `${PR}#issuecomment-1001` }]);
  });

  test("a block sets a failure status, and the gate's own block can then pass with a new comment", async () => {
    const { gh, cli } = await setup();
    expect((await postVerdict(cli, "block")).json.state).toBe("failure");
    expect((await cli(["set", "todo#1", ...CR, "--status", "blocked", "--gate", "code-review"])).json.status).toBe("blocked");
    expect((await postVerdict(cli, "pass")).json).toMatchObject({ state: "success", reused_comment: false });
    expect(gh.state().statuses.map((s) => s.state)).toEqual(["failure", "success"]);
    expect(gh.state().prs[0]!.comments).toHaveLength(2);
  });

  test("a second block on a rerun posts a new verdict and raises the gate's count", async () => {
    const { gh, cli } = await setup();
    const block = ["set", "todo#1", ...CR, "--status", "blocked", "--gate", "code-review"];
    await postVerdict(cli, "block");
    expect((await cli(block)).json.blocks).toEqual({ "code-review": 1 });
    const rerun = verdict("block").replace("1. The route skips the owner check.", "1. The owner check still skips archived tasks.");
    expect((await cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], rerun)).json).toMatchObject({ state: "failure", reused_comment: false });
    expect((await cli(block)).json).toMatchObject({ status: "blocked", blocked_by: "code-review", blocks: { "code-review": 2 } });
    expect(gh.state().prs[0]!.comments).toHaveLength(2);
  });

  test("refuses a verdict on a commit that isn't the pull request's head", async () => {
    const { gh, cli } = await setup();
    const result = await postVerdict(cli, "pass", "1234567");
    expect(result.error).toContain("the head of https://github.com/acme/todo/pull/7 is 8d41e07");
    expect(gh.state().prs[0]!.comments).toEqual([]);
    expect(gh.state().statuses).toEqual([]);
  });

  test("refuses a pull request that is no longer open", async () => {
    const { gh, cli } = await setup({ prState: "MERGED" });
    expect((await postVerdict(cli, "pass")).error).toContain("is merged");
    expect(gh.state().statuses).toEqual([]);
  });

  test("checks for gh even when the app uses the local tracker", async () => {
    const repo = await makeRepo();
    writeApp(repo, "todo", "tracker:\n  type: local\n");
    const gh = fakeGh({ version: "2.80.0" });
    const result = await tracker(repo, ["pr-verdict", "todo#1", ...CR, "--body-file", "-"], { input: verdict("pass"), env: gh.env });
    expect(result.error).toContain("gh 2.94.0 or later is required. Found 2.80.0.");
  });
});

describe("retries", () => {
  test("after the status fails, a retry reuses the comment the first run posted", async () => {
    const { gh, cli } = await setup();
    gh.setState({ ...gh.state(), failStatuses: true });
    expect((await postVerdict(cli, "pass")).error).toContain(`gh api repos/acme/todo/statuses/${HEAD} failed`);
    expect(gh.state().prs[0]!.comments).toHaveLength(1);
    expect(gh.state().statuses).toEqual([]);

    gh.setState({ ...gh.state(), failStatuses: false });
    const retry = await postVerdict(cli, "pass");
    expect(retry.json).toMatchObject({ state: "success", comment_url: `${PR}#issuecomment-1001`, reused_comment: true });
    expect(gh.state().prs[0]!.comments).toHaveLength(1);
    expect(gh.state().statuses).toEqual([{ sha: HEAD, state: "success", context: "chrysalis/code-review", description: "Code review passed", target_url: `${PR}#issuecomment-1001` }]);
  });

  test("a rerun with the same verdict posts no second comment and sets the status again", async () => {
    const { gh, cli } = await setup();
    await postVerdict(cli, "pass");
    expect((await postVerdict(cli, "pass")).json.reused_comment).toBe(true);
    expect(gh.state().prs[0]!.comments).toHaveLength(1);
    expect(gh.state().statuses).toHaveLength(2);
  });

  test("the same text from another account is never reused", async () => {
    const copied = `verdict from code-review at 2026-10-18T09:00:00Z\n\n${verdict("pass").trim()}\n`;
    const { gh, cli } = await setup({ comments: [{ body: copied, url: `${PR}#issuecomment-900`, viewerDidAuthor: false }] });
    expect((await postVerdict(cli, "pass")).json).toMatchObject({ reused_comment: false, comment_url: `${PR}#issuecomment-1002` });
    expect(gh.state().prs[0]!.comments).toHaveLength(2);
  });

  test("only the newest verdict comment counts, and CRLF line endings still match", () => {
    const header = (at: string) => `verdict from code-review at ${at}`;
    const comments: FakePrComment[] = [
      { body: `${header("2026-10-18T09:00:00Z")}\r\n\r\nGate: code-review\r\nVerdict: pass\r\n`, url: "u1", viewerDidAuthor: true },
      { body: `${header("2026-10-18T10:00:00Z")}\n\nGate: code-review\nVerdict: block\n`, url: "u2", viewerDidAuthor: true },
      { body: "Thanks, merging after lunch.", url: "u3", viewerDidAuthor: true },
      { body: `verdict from security at 2026-10-18T11:00:00Z\n\nGate: security`, url: "u4", viewerDidAuthor: true },
    ];
    expect(latestVerdictComment(comments, "code-review")).toEqual({ body: "Gate: code-review\nVerdict: block", url: "u2" });
    expect(latestVerdictComment(comments.slice(0, 1), "code-review")).toEqual({ body: "Gate: code-review\nVerdict: pass", url: "u1" });
    expect(latestVerdictComment([], "code-review")).toBeNull();
  });
});

describe("keeping code review results off the issue", () => {
  test("with a remote, the TPM links the pull request before it sets code-review", async () => {
    const { cli } = await setup({ link: false });
    expect((await cli(["set", "todo#1", ...TPM, "--status", "code-review"])).error).toContain("links no pull request");
    expect((await cli(["link", "todo#1", ...TPM, "--field", "pr", "--value", "https://gitlab.com/acme/todo/-/merge_requests/7"])).error).toContain("GitHub pull request URL");
    expect((await cli(["link", "todo#1", ...TPM, "--field", "pr", "--value", PR])).json.pr).toBe(PR);
    expect((await cli(["set", "todo#1", ...TPM, "--status", "code-review"])).json.status).toBe("code-review");
  });

  test("with a remote, a code review verdict on the issue is refused, linked pull request or not", async () => {
    const linked = await setup();
    await postVerdict(linked.cli, "pass");
    expect((await linked.cli(["show", "todo#1", ...CR])).json.comments).toEqual([]);
    expect((await linked.cli(["comment", "todo#1", ...CR, "--type", "verdict", "--body-file", "-"], verdict("pass"))).error).toContain("with pr-verdict");

    const unlinked = await setup({ link: false });
    expect((await unlinked.cli(["comment", "todo#1", ...CR, "--type", "verdict", "--body-file", "-"], verdict("pass"))).error).toContain("has a remote");
  });

  test("without a remote, the verdict goes on the issue, and the local tracker needs no gh for it", async () => {
    const { cli } = await setup({ remote: false, link: false, ghVersion: "2.80.0" });
    expect((await cli(["set", "todo#1", ...TPM, "--status", "code-review"])).json.status).toBe("code-review");
    expect((await cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], verdict("pass"))).error).toContain("gh 2.94.0 or later is required");
    const posted = await cli(["comment", "todo#1", ...CR, "--type", "verdict", "--body-file", "-"], verdict("pass"));
    expect(posted.error).toBeNull();
    expect(posted.json.comments.map((c: { type: string; agent: string }) => [c.type, c.agent])).toEqual([["verdict", "code-review"]]);
  });
});
