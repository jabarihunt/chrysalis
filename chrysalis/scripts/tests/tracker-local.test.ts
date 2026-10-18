// End-to-end tests for the tracker CLI with the local adapter, run against scratch git repositories.
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { cleanup, makeRepo, sh, tempDir, tracker, writeApp } from "./helpers";

afterEach(cleanup);

const F = ["--app", "factory", "--agent", "factory-maintainer"];

async function createFactoryIssue(repo: string, title = "Build the tracker CLI", body = "## Factory\n\nThe change.") {
  const result = await tracker(repo, ["create", ...F, "--kind", "factory", "--title", title, "--body-file", "-"], { input: body });
  expect(result.error).toBeNull();
  return result.json;
}

describe("the backlog branch", () => {
  test("starts as an orphan worktree at backlog/ that holds only issue files", async () => {
    const repo = await makeRepo();
    const issue = await createFactoryIssue(repo);
    expect(issue.ref).toBe("factory#1");
    expect(issue.location).toBe("backlog/factory/0001-build-the-tracker-cli.md");
    expect(await sh(["git", "-C", "backlog", "branch", "--show-current"], repo)).toBe("backlog\n");
    expect(await sh(["git", "-C", "backlog", "ls-tree", "-r", "--name-only", "HEAD"], repo)).toBe("factory/0001-build-the-tracker-cli.md\n");
    expect(await sh(["git", "-C", "backlog", "rev-list", "--count", "HEAD"], repo)).toBe("1\n");
    expect(await sh(["git", "log", "--format=%s", "master"], repo)).toBe("Initial commit\n");
  });

  test("commits each write with Agent and Issue trailers", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    await tracker(repo, ["set", "factory#1", ...F, "--status", "implementing"]);
    const log = await sh(["git", "-C", "backlog", "log", "--format=%s|%(trailers:key=Agent,valueonly,separator=)|%(trailers:key=Issue,valueonly,separator=)"], repo);
    expect(log.trim().split("\n")).toEqual([
      "Set factory#1 to implementing|factory-maintainer|factory#1",
      "Create factory#1: Build the tracker CLI|factory-maintainer|factory#1",
    ]);
  });

  test("a second clone checks out origin's backlog and tracks it", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    const origin = join(tempDir(), "origin.git");
    await sh(["git", "init", "--quiet", "--bare", origin], repo);
    await sh(["git", "remote", "add", "origin", origin], repo);
    await sh(["git", "push", "--quiet", "origin", "master", "backlog"], repo);
    const clone = join(tempDir(), "clone");
    await sh(["git", "clone", "--quiet", origin, clone], repo);
    const list = await tracker(clone, ["list", ...F]);
    expect(list.error).toBeNull();
    expect(list.json.map((i: { ref: string }) => i.ref)).toEqual(["factory#1"]);
    expect(await sh(["git", "-C", "backlog", "rev-parse", "--abbrev-ref", "@{upstream}"], clone)).toBe("origin/backlog\n");
  });

  test("reuses a local backlog branch whose worktree was removed", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    await sh(["git", "worktree", "remove", "backlog"], repo);
    const show = await tracker(repo, ["show", "factory#1", ...F]);
    expect(show.error).toBeNull();
    expect(show.json.title).toBe("Build the tracker CLI");
  });

  test("stops when backlog/ exists but isn't the backlog worktree", async () => {
    const repo = await makeRepo();
    mkdirSync(join(repo, "backlog"));
    const result = await tracker(repo, ["list", ...F]);
    expect(result.code).toBe(1);
    expect(result.error).toContain("isn't the backlog worktree");
  });

  test("works when run from inside backlog/", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    const show = await tracker(join(repo, "backlog"), ["show", "factory#1", ...F]);
    expect(show.json.ref).toBe("factory#1");
  });

  test("puts the old file back when a commit fails", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    await sh(["git", "config", "--unset", "user.name"], repo);
    await sh(["git", "config", "--unset", "user.email"], repo);
    await sh(["git", "config", "user.useConfigOnly", "true"], repo);
    const env = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "", GIT_AUTHOR_EMAIL: "", GIT_COMMITTER_NAME: "", GIT_COMMITTER_EMAIL: "", EMAIL: "" };
    const before = readFileSync(join(repo, "backlog/factory/0001-build-the-tracker-cli.md"), "utf8");
    const set = await tracker(repo, ["set", "factory#1", ...F, "--status", "implementing"], { env });
    expect(set.code).toBe(1);
    expect(readFileSync(join(repo, "backlog/factory/0001-build-the-tracker-cli.md"), "utf8")).toBe(before);
    const create = await tracker(repo, ["create", ...F, "--kind", "factory", "--title", "Second", "--body-file", "-"], { input: "x", env });
    expect(create.code).toBe(1);
    expect(readdirSync(join(repo, "backlog/factory"))).toEqual(["0001-build-the-tracker-cli.md"]);
    expect(await sh(["git", "-C", "backlog", "status", "--porcelain"], repo)).toBe("");
  });
});

describe("issues", () => {
  test("number up from 1 within each app", async () => {
    const repo = await makeRepo();
    writeApp(repo, "todo", "name: todo\ntracker:\n  type: local\n");
    await createFactoryIssue(repo, "One");
    await createFactoryIssue(repo, "Two");
    const todo = await tracker(repo, ["create", "--app", "todo", "--agent", "tpm", "--kind", "request", "--title", "Due dates", "--body-file", "-"], { input: "## Request\n\nAdd due dates." });
    expect(todo.json.ref).toBe("todo#1");
    expect(todo.json.status).toBe("intake");
    expect(existsSync(join(repo, "backlog/todo/0001-due-dates.md"))).toBe(true);
    const list = await tracker(repo, ["list", ...F]);
    expect(list.json.map((i: { ref: string }) => i.ref)).toEqual(["factory#1", "factory#2"]);
  });

  test("show returns the fields, body, and comments, and the file stays readable", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo, "Quote: this title");
    await tracker(repo, ["comment", "factory#1", ...F, "--type", "report", "--body-file", "-"], { input: "Built it.\n\n## Findings\n\nNone\n" });
    await tracker(repo, ["link", "factory#1", ...F, "--field", "branch", "--value", "factory/1-tracker"]);
    await tracker(repo, ["link", "factory#1", ...F, "--field", "spec_sha", "--value", "1234567"]);
    const show = await tracker(repo, ["show", "factory#1", ...F]);
    expect(show.json).toMatchObject({ ref: "factory#1", kind: "factory", title: "Quote: this title", status: "approved", branch: "factory/1-tracker", spec_sha: "1234567", body: "## Factory\n\nThe change." });
    expect(show.json.comments).toHaveLength(1);
    expect(show.json.comments[0]).toMatchObject({ type: "report", agent: "factory-maintainer", body: "Built it.\n\n## Findings\n\nNone" });
    expect(show.json.comments[0].at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    const text = readFileSync(join(repo, show.json.location), "utf8");
    expect(text).toContain("branch: factory/1-tracker\n");
    expect(text).toContain('spec_sha: "1234567"\n');
    expect(text).toMatch(/\n## Comments\n\n### report from factory-maintainer at \S+\n\nBuilt it\./);
  });

  test("reads the body from a file path", async () => {
    const repo = await makeRepo();
    await Bun.write(join(repo, "body.md"), "## Factory\n\nFrom a file.\n");
    const result = await tracker(repo, ["create", ...F, "--kind", "factory", "--title", "From a file", "--body-file", "body.md"]);
    expect(result.json.body).toBe("## Factory\n\nFrom a file.");
    const missing = await tracker(repo, ["create", ...F, "--kind", "factory", "--title", "Missing", "--body-file", "nope.md"]);
    expect(missing.error).toContain("doesn't exist");
  });

  test("a slice is created under its request", async () => {
    const repo = await makeRepo();
    writeApp(repo, "todo", "tracker:\n  type: local\n");
    const T = ["--app", "todo", "--agent", "tpm"];
    await tracker(repo, ["create", ...T, "--kind", "request", "--title", "Due dates", "--body-file", "-"], { input: "r" });
    const slice = await tracker(repo, ["create", ...T, "--kind", "slice", "--title", "Set a due date", "--parent", "todo#1", "--body-file", "-"], { input: "s" });
    expect(slice.json).toMatchObject({ ref: "todo#2", parent: "todo#1", status: "approved" });
    const list = await tracker(repo, ["list", ...T, "--kind", "slice"]);
    expect(list.json).toEqual([{ ref: "todo#2", kind: "slice", title: "Set a due date", status: "approved", parent: "todo#1", blocked_by: null, location: "backlog/todo/0002-set-a-due-date.md" }]);
  });

  test("a gate blocks, the TPM can't lift it, and the gate clears it by passing", async () => {
    const repo = await makeRepo();
    writeApp(repo, "todo", "tracker:\n  type: local\n");
    const T = ["--app", "todo", "--agent", "tpm"];
    await tracker(repo, ["create", ...T, "--kind", "bug", "--title", "Dates shift", "--body-file", "-"], { input: "b" });
    for (const status of ["red", "implementing", "security-review"]) await tracker(repo, ["set", "todo#1", ...T, "--status", status]);
    const blocked = await tracker(repo, ["set", "todo#1", "--app", "todo", "--agent", "security", "--status", "blocked", "--gate", "security"]);
    expect(blocked.json).toMatchObject({ status: "blocked", blocked_by: "security", blocks: { security: 1 } });
    const verdict = await tracker(repo, ["comment", "todo#1", "--app", "todo", "--agent", "security", "--type", "verdict", "--body-file", "-"], { input: "Gate: security\nVerdict: block\nCommit: 1234567" });
    expect(verdict.json.comments[0].type).toBe("verdict");
    const lift = await tracker(repo, ["set", "todo#1", ...T, "--status", "test-review"]);
    expect(lift.error).toContain("Only the security gate can clear its block");
    const pass = await tracker(repo, ["set", "todo#1", "--app", "todo", "--agent", "security", "--status", "security-review"]);
    expect(pass.json).toMatchObject({ status: "security-review", blocked_by: null, blocks: { security: 1 } });
  });

  test("a closed issue takes a retro comment but no other changes", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    await tracker(repo, ["set", "factory#1", ...F, "--status", "ready-to-merge"]);
    const closed = await tracker(repo, ["close", "factory#1", ...F, "--status", "done"]);
    expect(closed.json.status).toBe("done");
    const retro = await tracker(repo, ["comment", "factory#1", ...F, "--type", "retro", "--body-file", "-"], { input: "Nothing blocked." });
    expect(retro.error).toBeNull();
    expect((await tracker(repo, ["set", "factory#1", ...F, "--status", "implementing"])).error).toContain("closed");
    expect((await tracker(repo, ["link", "factory#1", ...F, "--field", "branch", "--value", "x"])).error).toContain("closed");
    expect((await tracker(repo, ["list", ...F, "--status", "done"])).json).toHaveLength(1);
  });

  test("rejects a comment that would break the file format", async () => {
    const repo = await makeRepo();
    await createFactoryIssue(repo);
    const result = await tracker(repo, ["comment", "factory#1", ...F, "--type", "report", "--body-file", "-"], { input: "x\n### report from tpm at 2026-10-12T15:04:00Z\ny" });
    expect(result.code).toBe(1);
    expect(result.error).toContain("comment heading");
  });
});

describe("apps, agents, and usage", () => {
  test("factory is reserved: it needs no app.yaml, and apps/factory/ is refused", async () => {
    const repo = await makeRepo();
    expect((await tracker(repo, ["list", ...F])).json).toEqual([]);
    writeApp(repo, "factory", "tracker:\n  type: github\n");
    const result = await tracker(repo, ["list", ...F]);
    expect(result.error).toContain("reserved for the factory's own tracker");
  });

  test("an app needs its app.yaml and a known tracker type", async () => {
    const repo = await makeRepo();
    expect((await tracker(repo, ["list", "--app", "todo", "--agent", "tpm"])).error).toContain("apps/todo/app.yaml doesn't exist");
    writeApp(repo, "todo", "tracker:\n  type: linear\n");
    expect((await tracker(repo, ["list", "--app", "todo", "--agent", "tpm"])).error).toContain('"linear"');
  });

  test("checks the agent, the app name, and the reference", async () => {
    const repo = await makeRepo();
    expect((await tracker(repo, ["list", "--app", "factory", "--agent", "nobody"])).error).toContain('Unknown agent "nobody"');
    expect((await tracker(repo, ["list", "--app", "Bad_App", "--agent", "tpm"])).error).toContain("lowercase letters");
    await createFactoryIssue(repo);
    expect((await tracker(repo, ["show", "todo#1", ...F])).error).toContain('belongs to app "todo"');
    expect((await tracker(repo, ["show", "factory#7", ...F])).error).toContain("factory#7 doesn't exist");
    expect((await tracker(repo, ["create", "--app", "factory", "--agent", "tpm", "--kind", "factory", "--title", "x", "--body-file", "-"], { input: "x" })).error).toContain("Only factory-maintainer");
  });

  test("bad usage exits with code 2", async () => {
    const repo = await makeRepo();
    const unknown = await tracker(repo, ["frobnicate", ...F]);
    expect(unknown.code).toBe(2);
    const extra = await tracker(repo, ["list", ...F, "--title", "x"]);
    expect(extra.code).toBe(2);
    expect(extra.error).toContain("list doesn't take --title");
    const missing = await tracker(repo, ["set", "factory#1", ...F]);
    expect(missing.error).toContain("set needs --status");
    const noRef = await tracker(repo, ["show", ...F]);
    expect(noRef.error).toContain("takes one issue reference");
    const help = await tracker(repo, ["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Usage:");
  });

  test("needs a git repository", async () => {
    const dir = tempDir();
    const result = await tracker(dir, ["list", ...F]);
    expect(result.error).toContain("inside a git repository");
    rmSync(dir, { recursive: true, force: true });
  });
});
