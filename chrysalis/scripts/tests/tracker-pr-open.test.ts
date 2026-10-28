// End-to-end tests for pr-open and pr-edit, which let the TPM, or the factory-maintainer for factory
// issues, open a pull request and fix its title or body. Every test runs against the fake gh in
// fake-gh.ts, so no test calls GitHub. See factory ADR 0029.
import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NOT_GITHUB_ORIGIN } from "../lib/tracker/github";
import { emptyState } from "./fake-gh";
import { SECRET_ORIGINS, cleanup, fakeGh, makeRepo, sh, tracker, writeApp } from "./helpers";

afterEach(cleanup);

const BRANCH = "todo/1-dates-shift";
const PR = "https://github.com/acme/todo/pull/7";
const TITLE = "Keep due dates in the user's time zone";
const TPM = ["--app", "todo", "--agent", "tpm"];
const CR = ["--app", "todo", "--agent", "code-review"];
const FM = ["--app", "factory", "--agent", "factory-maintainer"];

const body = (ref = "todo#1") => `## Summary\n\nDue dates no longer shift by a day.\n\nIssue: ${ref}\nSpec: None\n`;
const verdict = (result: "pass" | "block", commit: string) => `Gate: code-review\nVerdict: ${result}\nCommit: ${commit}\nRange: master...HEAD\n\n## Findings\n\nNone\n`;

/**
 * A local-tracker app whose bug issue is at ready-for-pr with its branch linked. The branch has one
 * commit, and by default origin has it, as after git push -u. GitHub numbers the next pull request 7.
 */
async function setup(opts: { remote?: boolean; origin?: string; pushed?: boolean; ghVersion?: string } = {}) {
  const repo = await makeRepo();
  if (opts.remote ?? true) await sh(["git", "remote", "add", "origin", opts.origin ?? "git@github.com:acme/todo.git"], repo);
  writeApp(repo, "todo", "tracker:\n  type: local\n");
  await sh(["git", "checkout", "--quiet", "-b", BRANCH], repo);
  writeFileSync(join(repo, "fix.txt"), "fix\n");
  await sh(["git", "add", "fix.txt"], repo);
  await sh(["git", "commit", "--quiet", "-m", "Keep due dates in the user's time zone"], repo);
  const head = (await sh(["git", "rev-parse", "HEAD"], repo)).trim();
  await sh(["git", "checkout", "--quiet", "master"], repo);
  if (opts.pushed ?? true) await sh(["git", "update-ref", `refs/remotes/origin/${BRANCH}`, head], repo);

  const gh = fakeGh({ version: opts.ghVersion, state: { ...emptyState(), next: 7, branches: { [BRANCH]: head } } });
  const cli = (args: string[], input?: string) => tracker(repo, args, { input, env: gh.env });
  await cli(["create", ...TPM, "--kind", "bug", "--title", "Dates shift", "--body-file", "-"], "b");
  for (const status of ["red", "implementing", "security-review", "test-review", "docs", "ready-for-pr"]) await cli(["set", "todo#1", ...TPM, "--status", status]);
  await cli(["link", "todo#1", ...TPM, "--field", "branch", "--value", BRANCH]);
  const open = (args: string[] = TPM, text = body(), title = TITLE) => cli(["pr-open", "todo#1", ...args, "--title", title, "--body-file", "-"], text);
  const creates = () => gh.calls().filter((call) => call[0] === "pr" && call[1] === "create");
  return { repo, gh, cli, head, open, creates };
}

describe("pr-open", () => {
  test("opens the pull request from the pushed branch into master, links it, and the code review runs on it", async () => {
    const { gh, cli, head, open } = await setup();
    const opened = await open();
    expect(opened.error).toBeNull();
    expect(opened.json).toEqual({ ref: "todo#1", pr: PR, title: TITLE, head: BRANCH, base: "master", commit: head });
    expect(gh.state().prs[0]).toMatchObject({ number: 7, state: "OPEN", title: TITLE, body: body(), headRefName: BRANCH, baseRefName: "master", headRefOid: head });
    expect((await cli(["show", "todo#1", ...TPM])).json.pr).toBe(PR);

    expect((await cli(["set", "todo#1", ...TPM, "--status", "code-review"])).json.status).toBe("code-review");
    const posted = await cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], verdict("pass", head.slice(0, 7)));
    expect(posted.json).toMatchObject({ pr: PR, commit: head, state: "success" });
  });

  test("only the TPM opens an app's pull requests, and only the factory-maintainer opens the factory's", async () => {
    const { cli, open, creates } = await setup();
    expect((await open(CR)).error).toContain("Only tpm may open pull requests");

    await cli(["create", ...FM, "--kind", "factory", "--title", "Fix the gate", "--body-file", "-"], "b");
    for (const status of ["implementing", "ready-for-pr"]) await cli(["set", "factory#1", ...FM, "--status", status]);
    await cli(["link", "factory#1", ...FM, "--field", "branch", "--value", BRANCH]);
    const factoryOpen = (agent: string) => cli(["pr-open", "factory#1", "--app", "factory", "--agent", agent, "--title", "Fix the gate", "--body-file", "-"], body("factory#1"));
    expect((await factoryOpen("tpm")).error).toContain("Only factory-maintainer may open pull requests");
    expect(creates()).toEqual([]);
    expect((await factoryOpen("factory-maintainer")).json).toMatchObject({ ref: "factory#1", pr: PR, head: BRANCH });
  });

  test("checks the issue, the title, and the body before it calls gh", async () => {
    const { cli, open, creates } = await setup();
    expect((await open(TPM, body(), "x".repeat(71))).error).toContain("70 characters or fewer");
    expect((await open(TPM, body(), "Two\nlines")).error).toContain("one line");
    expect((await open(TPM, body(), "One\rTwo")).error).toContain("no line breaks, carriage returns, tabs, or other control characters");
    expect((await open(TPM, body(), "One\tTwo")).error).toContain("no line breaks, carriage returns, tabs, or other control characters");
    // A control character counts wherever it is, even where trimming would remove it, and so do the
    // C1 controls and the Unicode line and paragraph separators.
    for (const title of ["Fix it\r", "\rFix it", "Fix it\n", "Fix\u0085it", "Fix\u009fit", "Fix\u2028it", "Fix\u2029it"]) {
      expect((await open(TPM, body(), title)).error).toContain("no line breaks, carriage returns, tabs, or other control characters");
    }
    expect((await open(TPM, "## Summary\n\nNo issue line.\n")).error).toContain(`"Issue: todo#1" line`);
    // Only the template's line counts: "Issue: todo#1" exactly, on a line of its own, with nothing after it.
    for (const line of ["Issue: todo#12", "Issue:todo#1", "Issue: todo#1 extra", "Issue: todo#1, which also does todo#2", " Issue: todo#1", "Issues: todo#1", "Issue: todo#1   ", "Issue: todo#1\t"]) {
      expect((await open(TPM, `## Summary\n\nText.\n\n${line}\nSpec: None\n`)).error).toContain(`"Issue: todo#1" line, exactly and on its own line`);
    }
    // Trailing spaces on the body's last line count too, though trimming the body would remove them.
    expect((await open(TPM, "## Summary\n\nText.\n\nIssue: todo#1   ")).error).toContain(`"Issue: todo#1" line, exactly and on its own line`);

    await cli(["set", "todo#1", ...TPM, "--status", "needs-human"]);
    expect((await open()).error).toContain("todo#1 is needs-human. Set ready-for-pr");
    await cli(["set", "todo#1", ...TPM, "--status", "ready-for-pr"]);

    await cli(["link", "todo#1", ...TPM, "--field", "branch", "--value", "none"]);
    expect((await open()).error).toContain("links no branch");
    expect(creates()).toEqual([]);
  });

  test("refuses a branch that origin doesn't have, or that has commits origin doesn't", async () => {
    const { repo, open, creates } = await setup({ pushed: false });
    expect((await open()).error).toContain(`This clone has no origin/${BRANCH}. Push the branch`);
    const master = (await sh(["git", "rev-parse", "master"], repo)).trim();
    await sh(["git", "update-ref", `refs/remotes/origin/${BRANCH}`, master], repo);
    expect((await open()).error).toContain(`but origin/${BRANCH} is at ${master.slice(0, 7)}. Push the branch`);
    expect(creates()).toEqual([]);
  });

  test("refuses an origin/<branch> ref when this clone has no branch to compare it with", async () => {
    const { repo, open, creates } = await setup();
    await sh(["git", "branch", "--quiet", "-D", BRANCH], repo);
    expect((await sh(["git", "rev-parse", "--verify", `refs/remotes/origin/${BRANCH}`], repo)).trim()).toMatch(/^[0-9a-f]{40}$/);
    expect((await open()).error).toContain(`This clone has no branch ${BRANCH}`);
    expect(creates()).toEqual([]);
  });

  test("refuses an origin that only looks like GitHub, and names the forms that work", async () => {
    for (const origin of ["https://evil.example/github.com/acme/todo.git", "git@evil.example:github.com/acme/todo.git"]) {
      const { open, creates } = await setup({ origin });
      expect((await open()).error).toBe(NOT_GITHUB_ORIGIN);
      expect(creates()).toEqual([]);
    }
  });

  test("opens from an origin with a token, and leaves the token out of its output", async () => {
    const { open, creates } = await setup({ origin: "https://x-access-token:SECRET@github.com/acme/todo.git" });
    const opened = await open();
    expect(opened.json).toMatchObject({ ref: "todo#1", pr: PR });
    expect(creates()[0]).toContain("acme/todo");
    expect(opened.stdout + opened.stderr).not.toContain("SECRET");
  });

  test("a refused origin's username or token never reaches the output, in any form git accepts", async () => {
    for (const origin of SECRET_ORIGINS) {
      const { open, creates } = await setup({ origin });
      const refused = await open();
      expect(refused.error).toBe(NOT_GITHUB_ORIGIN);
      expect(refused.stdout + refused.stderr).not.toContain("SECRET");
      expect(creates()).toEqual([]);
    }
  });

  test("without a remote no pull request can exist, and pr-open checks for gh", async () => {
    expect((await (await setup({ remote: false })).open()).error).toContain("has no remote, so no pull request can exist");
    expect((await (await setup({ ghVersion: "2.80.0" })).open()).error).toContain("gh 2.94.0 or later is required");
  });

  test("opens one pull request per issue, and links nothing when gh refuses", async () => {
    const first = await setup();
    await first.open();
    expect((await first.open()).error).toContain(`already links ${PR}. Change its title or body with pr-edit`);
    expect(first.creates()).toHaveLength(1);

    const second = await setup();
    second.gh.setState({ ...second.gh.state(), prs: [{ number: 5, state: "OPEN", headRefOid: second.head, comments: [], headRefName: BRANCH, baseRefName: "master" }] });
    expect((await second.open()).error).toContain(`a pull request for branch "${BRANCH}" into branch "master" already exists`);
    expect((await second.cli(["show", "todo#1", ...TPM])).json.pr).toBeNull();
  });
});

describe("pr-edit", () => {
  test("fixes the title or body while the code review runs or its block stands, and not after it passes", async () => {
    const { gh, cli, head, open } = await setup();
    await open();
    const edit = (args: string[], input?: string) => cli(["pr-edit", "todo#1", ...TPM, ...args], input);
    expect((await edit(["--title", "Keep due dates fixed"])).json).toEqual({ ref: "todo#1", pr: PR, title: true, body: false });
    expect(gh.state().prs[0]).toMatchObject({ title: "Keep due dates fixed", body: body() });
    expect((await edit([])).error).toContain("needs --title, --body-file, or both");

    await cli(["set", "todo#1", ...TPM, "--status", "code-review"]);
    await cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], verdict("block", head.slice(0, 7)));
    await cli(["set", "todo#1", ...CR, "--status", "blocked", "--gate", "code-review"]);
    const fixed = body().replace("shift by a day", "shift by a day after midnight");
    expect((await edit(["--body-file", "-"], fixed)).json).toEqual({ ref: "todo#1", pr: PR, title: false, body: true });
    expect(gh.state().prs[0]!.body).toBe(fixed);

    await cli(["pr-verdict", "todo#1", ...CR, "--body-file", "-"], verdict("pass", head.slice(0, 7)));
    await cli(["set", "todo#1", ...CR, "--status", "code-review"]);
    await cli(["set", "todo#1", ...TPM, "--status", "ready-to-merge"]);
    expect((await edit(["--title", "Late change"])).error).toContain("todo#1 is ready-to-merge. Edit its pull request only before or during the code review gate");
    expect(gh.state().prs[0]!.title).toBe("Keep due dates fixed");
  });

  test("refuses other agents, an issue with no pull request, a body without the issue, and a merged pull request", async () => {
    const { gh, cli, open } = await setup();
    expect((await cli(["pr-edit", "todo#1", ...TPM, "--title", "New"])).error).toContain("links no pull request. Open one with pr-open");
    await open();
    expect((await cli(["pr-edit", "todo#1", ...CR, "--title", "New"])).error).toContain("Only tpm may edit pull requests");
    expect((await cli(["pr-edit", "todo#1", ...TPM, "--body-file", "-"], "No issue line.\n")).error).toContain(`"Issue: todo#1" line`);

    gh.setState({ ...gh.state(), prs: gh.state().prs.map((pr) => ({ ...pr, state: "MERGED" as const })) });
    expect((await cli(["pr-edit", "todo#1", ...TPM, "--title", "New"])).error).toContain(`${PR} is merged`);
    expect(gh.calls().filter((call) => call[0] === "pr" && call[1] === "edit")).toEqual([]);
  });
});
