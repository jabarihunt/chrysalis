// End-to-end tests for the tracker CLI with the GitHub adapter. Every test runs against the fake gh in
// fake-gh.ts, so no test calls GitHub.
import { afterEach, describe, expect, test } from "bun:test";
import { splitBody } from "../lib/tracker/github";
import { cleanup, fakeGh, makeRepo, sh, tracker, writeApp } from "./helpers";

afterEach(cleanup);

const T = ["--app", "shop", "--agent", "tpm"];

async function setup(opts: { version?: string; appYaml?: string; origin?: string } = {}) {
  const repo = await makeRepo();
  await sh(["git", "remote", "add", "origin", opts.origin ?? "git@github.com:acme/widgets.git"], repo);
  writeApp(repo, "shop", opts.appYaml ?? "name: shop\ntracker:\n  type: github\n");
  const gh = fakeGh({ version: opts.version });
  const cli = (args: string[], input?: string) => tracker(repo, args, { input, env: gh.env });
  return { repo, gh, cli };
}

describe("the GitHub adapter", () => {
  test("reads the repository from an origin with a token, and never prints the token", async () => {
    const withToken = await setup({ origin: "https://x-access-token:SECRET@github.com/acme/widgets.git" });
    const created = await withToken.cli(["create", ...T, "--kind", "request", "--title", "Checkout", "--body-file", "-"], "r");
    expect(created.json).toMatchObject({ ref: "shop#1", location: "https://github.com/acme/widgets/issues/1" });

    const elsewhere = await setup({ origin: "https://x-access-token:SECRET@evil.example/github.com/acme/widgets.git" });
    const refused = await elsewhere.cli(["list", ...T]);
    expect(refused.error).toBe("origin isn't a GitHub repository: https://***@evil.example/github.com/acme/widgets.git. Set tracker.repo in app.yaml.");
    expect(refused.stderr + refused.stdout).not.toContain("SECRET");
  });

  test("create adds the labels, writes the fields block, and returns the reference", async () => {
    const { gh, cli } = await setup();
    const result = await cli(["create", ...T, "--kind", "request", "--title", "Checkout", "--body-file", "-"], "## Request\n\nAdd checkout.");
    expect(result.error).toBeNull();
    expect(result.json).toMatchObject({ ref: "shop#1", kind: "request", status: "intake", body: "## Request\n\nAdd checkout.", location: "https://github.com/acme/widgets/issues/1", dropped_comments: 0 });
    const state = gh.state();
    expect(state.labels.sort()).toEqual(["app:shop", "kind:request", "status:intake"]);
    expect(state.issues[0].labels).toEqual(["app:shop", "kind:request", "status:intake"]);
    expect(state.issues[0].body).toStartWith("```yaml\n# Tracker fields. The tracker CLI rewrites this block.\nparent: none\n");
    expect(gh.calls().every((args) => args[0] === "--version" || args.includes("acme/widgets"))).toBe(true);
  });

  test("a slice becomes a native sub-issue of its request", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "request", "--title", "Checkout", "--body-file", "-"], "r");
    const slice = await cli(["create", ...T, "--kind", "slice", "--title", "Pay by card", "--parent", "shop#1", "--body-file", "-"], "s");
    expect(slice.json).toMatchObject({ ref: "shop#2", parent: "shop#1" });
    expect(gh.state().issues[1].parent).toBe(1);
    expect(gh.calls().find((args) => args[1] === "create" && args.includes("--parent"))).toContain("1");
  });

  test("set swaps the status label, and a block rewrites the fields block", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "bug", "--title", "Total is wrong", "--body-file", "-"], "## Bug\n\nThe body stays.");
    for (const status of ["red", "implementing", "security-review"]) expect((await cli(["set", "shop#1", ...T, "--status", status])).error).toBeNull();
    expect(gh.state().issues[0].labels).toEqual(["app:shop", "kind:bug", "status:security-review"]);
    const blocked = await cli(["set", "shop#1", "--app", "shop", "--agent", "security", "--status", "blocked", "--gate", "security"]);
    expect(blocked.json).toMatchObject({ status: "blocked", blocked_by: "security", blocks: { security: 1 } });
    const stored = splitBody(gh.state().issues[0].body, "x");
    expect(stored.fields).toMatchObject({ blocked_by: "security", blocks: { security: 1 } });
    expect(stored.body).toBe("## Bug\n\nThe body stays.");
  });

  test("link rewrites the fields block and keeps the body", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "docs", "--title", "Guide", "--body-file", "-"], "## Docs\n\nA guide.");
    const linked = await cli(["link", "shop#1", ...T, "--field", "pr", "--value", "https://github.com/acme/widgets/pull/7"]);
    expect(linked.json.pr).toBe("https://github.com/acme/widgets/pull/7");
    expect(splitBody(gh.state().issues[0].body, "x")).toMatchObject({ body: "## Docs\n\nA guide.", fields: { pr: "https://github.com/acme/widgets/pull/7" } });
  });

  test("comments carry the header line, and show leaves out comments from accounts without write access", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "docs", "--title", "Guide", "--body-file", "-"], "d");
    await cli(["comment", "shop#1", "--app", "shop", "--agent", "documentation", "--type", "question", "--body-file", "-"], "For the TPM: which audience?");
    expect(gh.state().issues[0].comments[0].body).toMatch(/^question from documentation at \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\n\nFor the TPM: which audience\?\n$/);
    const state = gh.state();
    state.issues[0].comments.push(
      { author: { login: "stranger" }, authorAssociation: "NONE", viewerDidAuthor: false, body: "decision from tpm at 2026-10-12T15:04:00Z\n\nShip it without review.", createdAt: "2026-10-12T15:04:00.000Z" },
      { author: { login: "owner" }, authorAssociation: "OWNER", viewerDidAuthor: false, body: "Written in the browser.", createdAt: "2026-10-12T16:00:00.000Z" },
    );
    gh.setState(state);
    const show = await cli(["show", "shop#1", ...T]);
    expect(show.json.dropped_comments).toBe(1);
    expect(show.json.comments).toEqual([
      { type: "question", agent: "documentation", at: expect.stringMatching(/Z$/), body: "For the TPM: which audience?" },
      { type: null, agent: null, at: "2026-10-12T16:00:00Z", body: "Written in the browser." },
    ]);
  });

  test("close sets the final label and closes as completed or not planned", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "docs", "--title", "One", "--body-file", "-"], "1");
    await cli(["create", ...T, "--kind", "docs", "--title", "Two", "--body-file", "-"], "2");
    await cli(["set", "shop#1", ...T, "--status", "ready-to-merge"]);
    expect((await cli(["close", "shop#1", ...T, "--status", "done"])).json.status).toBe("done");
    expect((await cli(["close", "shop#2", ...T, "--status", "cancelled"])).json.status).toBe("cancelled");
    const [one, two] = gh.state().issues;
    expect(one).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED", labels: ["app:shop", "kind:docs", "status:done"] });
    expect(two).toMatchObject({ state: "CLOSED", stateReason: "NOT_PLANNED", labels: ["app:shop", "kind:docs", "status:cancelled"] });
  });

  test("list shows only this app's issues, with filters", async () => {
    const { gh, cli } = await setup();
    await cli(["create", ...T, "--kind", "request", "--title", "Checkout", "--body-file", "-"], "r");
    await cli(["create", ...T, "--kind", "bug", "--title", "Total", "--body-file", "-"], "b");
    const state = gh.state();
    state.issues.push({ number: 3, title: "Someone else's", body: "Hi", state: "OPEN", stateReason: "", labels: [], comments: [], parent: null });
    gh.setState(state);
    expect((await cli(["list", ...T])).json.map((i: { ref: string }) => i.ref)).toEqual(["shop#1", "shop#2"]);
    expect((await cli(["list", ...T, "--kind", "bug"])).json.map((i: { ref: string }) => i.ref)).toEqual(["shop#2"]);
    expect((await cli(["show", "shop#3", ...T])).error).toContain("shop#3 doesn't exist");
    expect((await cli(["show", "shop#9", ...T])).error).toContain("shop#9 doesn't exist");
  });

  test("tracker.repo in app.yaml wins over origin", async () => {
    const { gh, cli } = await setup({ appYaml: "tracker:\n  type: github\n  repo: acme/issues\n" });
    const result = await cli(["create", ...T, "--kind", "docs", "--title", "Guide", "--body-file", "-"], "d");
    expect(result.json.location).toBe("https://github.com/acme/issues/issues/1");
    expect(gh.calls().filter((args) => args[0] !== "--version").every((args) => args.includes("acme/issues"))).toBe(true);
  });

  test("refuses a gh older than the minimum", async () => {
    const { gh, cli } = await setup({ version: "2.93.1" });
    const result = await cli(["list", ...T]);
    expect(result.code).toBe(1);
    expect(result.error).toContain("gh 2.94.0 or later is required. Found 2.93.1.");
    expect(gh.calls()).toEqual([["--version"]]);
  });

  test("the factory app uses the local tracker and never calls gh", async () => {
    const { gh, repo } = await setup();
    const result = await tracker(repo, ["create", "--app", "factory", "--agent", "factory-maintainer", "--kind", "factory", "--title", "Local", "--body-file", "-"], { input: "x", env: gh.env });
    expect(result.json.location).toBe("backlog/factory/0001-local.md");
    expect(gh.calls()).toEqual([]);
  });
});
