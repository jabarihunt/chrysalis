// Unit tests for the tracker's rules and file formats.
import { describe, expect, test } from "bun:test";
import { composeBody, parseRepoUrl, splitBody } from "../lib/tracker/github";
import { formatIssueFile, parseIssueFile, slugify } from "../lib/tracker/local";
import { TrackerError, applyChange, checkBody, emptyFields, parsePrUrl, parseVerdict, planClose, planComment, planCreate, planLink, planPrVerdict, planSet } from "../lib/tracker/rules";
import type { Issue, Kind, Status } from "../lib/tracker/rules";
import { yamlScalar } from "../lib/tracker/yaml-fields";

function issue(over: Partial<Issue> = {}): Issue {
  return { ...emptyFields(), ref: "todo#3", app: "todo", number: 3, kind: "slice" as Kind, title: "T", status: "approved" as Status, body: "", comments: [], location: "x", ...over };
}

const err = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(TrackerError);
    return (error as Error).message;
  }
  throw new Error("expected a TrackerError");
};

describe("planCreate", () => {
  const request = issue({ ref: "todo#1", number: 1, kind: "request", status: "intake" });

  test("sets the initial status for each kind", () => {
    expect(planCreate("todo", "tpm", { kind: "request", title: "R", body: "", parent: null, parentRef: null }).status).toBe("intake");
    expect(planCreate("todo", "tpm", { kind: "small-change", title: "S", body: "", parent: null, parentRef: null }).status).toBe("criteria-review");
    expect(planCreate("todo", "tpm", { kind: "bug", title: "B", body: "", parent: null, parentRef: null }).status).toBe("approved");
    expect(planCreate("factory", "factory-maintainer", { kind: "factory", title: "F", body: "", parent: null, parentRef: null }).status).toBe("approved");
  });

  test("only the TPM creates app issues, and only the factory-maintainer creates factory issues", () => {
    expect(err(() => planCreate("todo", "backend", { kind: "bug", title: "B", body: "", parent: null, parentRef: null }))).toContain("Only tpm");
    expect(err(() => planCreate("factory", "tpm", { kind: "factory", title: "F", body: "", parent: null, parentRef: null }))).toContain("Only factory-maintainer");
  });

  test("keeps the factory kind and the factory app together", () => {
    expect(err(() => planCreate("factory", "factory-maintainer", { kind: "bug", title: "F", body: "", parent: null, parentRef: null }))).toContain('use kind "factory"');
    expect(err(() => planCreate("todo", "tpm", { kind: "factory", title: "F", body: "", parent: null, parentRef: null }))).toContain("only for --app factory");
  });

  test("a slice needs a request as its parent, and other kinds take no parent", () => {
    expect(err(() => planCreate("todo", "tpm", { kind: "slice", title: "S", body: "", parent: null, parentRef: null }))).toContain("needs --parent");
    expect(err(() => planCreate("todo", "tpm", { kind: "slice", title: "S", body: "", parent: null, parentRef: "todo#9" }))).toContain("doesn't exist");
    const bug = issue({ kind: "bug" });
    expect(err(() => planCreate("todo", "tpm", { kind: "slice", title: "S", body: "", parent: bug, parentRef: "todo#3" }))).toContain("must be a request");
    expect(planCreate("todo", "tpm", { kind: "slice", title: "S", body: "", parent: request, parentRef: "todo#1" }).fields.parent).toBe("todo#1");
    expect(err(() => planCreate("todo", "tpm", { kind: "bug", title: "B", body: "", parent: request, parentRef: "todo#1" }))).toContain("Only slice issues");
  });

  test("rejects empty and multi-line titles", () => {
    expect(err(() => planCreate("todo", "tpm", { kind: "bug", title: "  ", body: "", parent: null, parentRef: null }))).toContain("empty");
    expect(err(() => planCreate("todo", "tpm", { kind: "bug", title: "a\nb", body: "", parent: null, parentRef: null }))).toContain("one line");
  });
});

describe("planSet", () => {
  test("a gate agent blocks while its gate runs, and the count goes up each time", () => {
    const first = applyChange(issue({ status: "security-review" }), planSet(issue({ status: "security-review" }), "security", "blocked", "security"));
    expect(first.status).toBe("blocked");
    expect(first.blocked_by).toBe("security");
    expect(first.blocks).toEqual({ security: 1 });
    const cleared = applyChange(first, planSet(first, "security", "security-review", null));
    expect(cleared.status).toBe("security-review");
    expect(cleared.blocked_by).toBeNull();
    const second = applyChange(cleared, planSet(cleared, "security", "blocked", "security"));
    expect(second.blocks).toEqual({ security: 2 });
  });

  test("a gate that blocks again while its own block stands records the block, and the count goes up", () => {
    const blocked = issue({ status: "blocked", blocked_by: "security", blocks: { security: 1, test: 1 } });
    const again = applyChange(blocked, planSet(blocked, "security", "blocked", "security"));
    expect(again).toMatchObject({ status: "blocked", blocked_by: "security", blocks: { security: 2, test: 1 } });
    const third = applyChange(again, planSet(again, "security", "blocked", "security"));
    expect(third.blocks).toEqual({ security: 3, test: 1 });
    const redBlocked = issue({ status: "blocked", blocked_by: "red-review", blocks: { "red-review": 1 } });
    expect(planSet(redBlocked, "code-review", "blocked", "red-review").fields?.blocks).toEqual({ "red-review": 2 });
  });

  test("only the gate that holds the block can block again", () => {
    const blocked = issue({ status: "blocked", blocked_by: "security", blocks: { security: 1 } });
    expect(err(() => planSet(blocked, "test", "blocked", "test"))).toContain("already has status blocked");
    expect(err(() => planSet(blocked, "test", "blocked", "security"))).toContain("run by security, not test");
    expect(err(() => planSet(blocked, "security", "blocked", null))).toContain("already has status blocked");
    expect(err(() => planSet(blocked, "tpm", "blocked", "security"))).toContain("--gate is for gate agents");
    const redBlocked = issue({ status: "blocked", blocked_by: "red-review", blocks: { "red-review": 1 } });
    expect(err(() => planSet(redBlocked, "code-review", "blocked", "code-review"))).toContain("already has status blocked");
  });

  test("the code review agent runs both the RED review and the code review gate", () => {
    const red = applyChange(issue(), planSet(issue(), "code-review", "blocked", "red-review"));
    expect(red.blocked_by).toBe("red-review");
    expect(applyChange(red, planSet(red, "code-review", "approved", null)).status).toBe("approved");
    expect(err(() => planSet(issue({ status: "code-review" }), "code-review", "blocked", "red-review"))).toContain("only while the status is approved");
  });

  test("a gate agent can't block another gate, block without --gate, or clear someone else's block", () => {
    expect(err(() => planSet(issue({ status: "security-review" }), "test", "blocked", "security"))).toContain("run by security");
    expect(err(() => planSet(issue({ status: "security-review" }), "security", "blocked", null))).toContain("needs --gate");
    const blocked = issue({ status: "blocked", blocked_by: "security", blocks: { security: 1 } });
    expect(err(() => planSet(blocked, "test", "test-review", null))).toContain("only clear its own block");
    expect(err(() => planSet(blocked, "security", "test-review", null))).toContain("only clear its own block");
    expect(err(() => planSet(issue({ status: "test-review" }), "test", "docs", null))).toContain("may only set blocked");
  });

  test("the TPM never sets or lifts a block, but can escalate and restore", () => {
    expect(err(() => planSet(issue({ status: "security-review" }), "tpm", "blocked", null))).toContain("Only a gate agent");
    const blocked = issue({ status: "blocked", blocked_by: "security", blocks: { security: 3 } });
    expect(err(() => planSet(blocked, "tpm", "security-review", null))).toContain("Only the security gate");
    const escalated = applyChange(blocked, planSet(blocked, "tpm", "needs-human", null));
    expect(escalated.status).toBe("needs-human");
    expect(escalated.prior_status).toBe("blocked");
    expect(err(() => planSet(escalated, "tpm", "test-review", null))).toContain("prior status, blocked");
    const restored = applyChange(escalated, planSet(escalated, "tpm", "blocked", null));
    expect(restored.status).toBe("blocked");
    expect(restored.prior_status).toBeNull();
  });

  test("checks the status against the kind, and keeps final statuses for close", () => {
    expect(err(() => planSet(issue(), "tpm", "intake", null))).toContain("can't have status intake");
    expect(err(() => planSet(issue(), "tpm", "done", null))).toContain("Use close");
    expect(err(() => planSet(issue(), "tpm", "approved", null))).toContain("already has status");
    expect(err(() => planSet(issue(), "tpm", "nope", null))).toContain("Unknown status");
    expect(err(() => planSet(issue({ status: "done" }), "tpm", "red", null))).toContain("closed");
    expect(err(() => planSet(issue(), "backend", "red", null))).toContain("Only tpm changes statuses");
  });

  test("the TPM sets code-review only once a pull request is linked, unless the repository has no remote", () => {
    const ready = issue({ status: "ready-for-pr" });
    expect(err(() => planSet(ready, "tpm", "code-review", null, { hasRemote: true }))).toContain("links no pull request");
    expect(err(() => planSet(ready, "tpm", "code-review", null))).toContain("links no pull request");
    expect(planSet(issue({ status: "ready-for-pr", pr: "https://github.com/acme/todo/pull/7" }), "tpm", "code-review", null, { hasRemote: true }).status).toBe("code-review");
    expect(planSet(ready, "tpm", "code-review", null, { hasRemote: false }).status).toBe("code-review");
    const escalated = issue({ status: "needs-human", prior_status: "code-review" });
    expect(err(() => planSet(escalated, "tpm", "code-review", null, { hasRemote: true }))).toContain("links no pull request");
  });

  test("factory issues follow the factory-maintainer", () => {
    const f = issue({ app: "factory", ref: "factory#1", kind: "factory" });
    expect(applyChange(f, planSet(f, "factory-maintainer", "implementing", null)).status).toBe("implementing");
    expect(err(() => planSet(f, "tpm", "implementing", null))).toContain("Only factory-maintainer");
    expect(err(() => planSet(f, "factory-maintainer", "red", null))).toContain("can't have status red");
  });
});

describe("planLink, planClose, and planComment", () => {
  test("link checks the field and its value, and none clears it", () => {
    expect(planLink(issue(), "tpm", "spec_sha", "3f2a9c1").fields).toEqual({ spec_sha: "3f2a9c1" });
    expect(planLink(issue(), "tpm", "branch", "none").fields).toEqual({ branch: null });
    expect(err(() => planLink(issue(), "tpm", "spec_sha", "XYZ"))).toContain("commit SHA");
    expect(planLink(issue(), "tpm", "pr", "https://github.com/acme/todo/pull/7/").fields).toEqual({ pr: "https://github.com/acme/todo/pull/7" });
    expect(planLink(issue(), "tpm", "pr", "none").fields).toEqual({ pr: null });
    for (const url of ["http://x", "https://github.com/acme/todo/issues/7", "https://gitlab.com/acme/todo/-/merge_requests/7", "https://github.com/acme/todo/pull/7#issuecomment-1"]) {
      expect(err(() => planLink(issue(), "tpm", "pr", url))).toContain("GitHub pull request URL");
    }
    expect(err(() => planLink(issue(), "tpm", "spec", "../etc"))).toContain("relative to the repository root");
    expect(err(() => planLink(issue(), "tpm", "status", "red"))).toContain("link sets one of");
    expect(err(() => planLink(issue(), "spec-writer", "spec", "a.md"))).toContain("Only tpm");
  });

  test("close takes done or cancelled, and done waits for blocks and escalations", () => {
    expect(planClose(issue({ status: "ready-to-merge" }), "tpm", "done").status).toBe("done");
    expect(planClose(issue({ status: "blocked", blocked_by: "test" }), "tpm", "cancelled").status).toBe("cancelled");
    expect(err(() => planClose(issue({ status: "blocked", blocked_by: "test" }), "tpm", "done"))).toContain("can't close as done");
    expect(err(() => planClose(issue(), "tpm", "red"))).toContain("done or --status cancelled");
    expect(err(() => planClose(issue({ status: "done" }), "tpm", "cancelled"))).toContain("already closed");
  });

  test("comment types follow the Posted by column", () => {
    expect(planComment(issue(), "backend", "question", "Why?").type).toBe("question");
    expect(planComment(issue(), "test", "verdict", "Gate: test\nVerdict: pass\nCommit: 1234567").type).toBe("verdict");
    expect(err(() => planComment(issue(), "backend", "verdict", "x"))).toContain("Only gate agents");
    expect(err(() => planComment(issue(), "backend", "report", "x"))).toContain("Only tpm");
    expect(planComment(issue({ status: "done" }), "tpm", "retro", "What blocked").type).toBe("retro");
    expect(err(() => planComment(issue(), "tpm", "note", "x"))).toContain("Unknown comment type");
    expect(err(() => planComment(issue(), "tpm", "report", "  "))).toContain("empty");
  });
});

describe("verdicts", () => {
  const body = (gate: string, verdict = "pass", commit = "3f2a9c1") => `Gate: ${gate}\nVerdict: ${verdict}\nCommit: ${commit}\nRange: master...HEAD\n\n## Findings\n\nNone`;

  test("reads the Gate, Verdict, and Commit lines of the template", () => {
    expect(parseVerdict(body("security", "block"))).toEqual({ gate: "security", verdict: "block", commit: "3f2a9c1" });
    expect(err(() => parseVerdict("Verdict: pass\nCommit: 3f2a9c1"))).toContain('"Gate:" line');
    expect(err(() => parseVerdict(body("security", "maybe")))).toContain('"Verdict:" line');
    expect(err(() => parseVerdict(body("security", "pass", "HEAD")))).toContain('"Commit:" line');
    expect(err(() => parseVerdict("Gate: <red-review, security, test, or code-review>\nVerdict: pass\nCommit: 3f2a9c1"))).toContain('"Gate:" line');
  });

  test("a verdict comment comes from the agent that runs its gate", () => {
    expect(planComment(issue(), "code-review", "verdict", body("red-review")).type).toBe("verdict");
    expect(err(() => planComment(issue(), "security", "verdict", body("test")))).toContain("run by test, not security");
  });

  test("a code review verdict goes on the issue only in a repository with no remote and no linked pull request", () => {
    const running = issue({ status: "code-review" });
    expect(planComment(running, "code-review", "verdict", body("code-review"), { hasRemote: false }).type).toBe("verdict");
    expect(err(() => planComment(running, "code-review", "verdict", body("code-review"), { hasRemote: true }))).toContain("has a remote");
    expect(err(() => planComment(running, "code-review", "verdict", body("code-review")))).toContain("has a remote");
    const withPr = issue({ status: "code-review", pr: "https://github.com/acme/todo/pull/7" });
    expect(err(() => planComment(withPr, "code-review", "verdict", body("code-review"), { hasRemote: false }))).toContain("with pr-verdict");
    expect(planComment(running, "code-review", "verdict", body("red-review"), { hasRemote: true }).type).toBe("verdict");
  });

  test("pr-verdict takes only code review verdicts, from the code review agent, while the gate runs", () => {
    const ready = issue({ status: "code-review", pr: "https://github.com/acme/todo/pull/7" });
    expect(planPrVerdict(ready, "code-review", body("code-review", "block"))).toMatchObject({ gate: "code-review", verdict: "block", commit: "3f2a9c1" });
    const ownBlock = issue({ status: "blocked", blocked_by: "code-review", pr: ready.pr });
    expect(planPrVerdict(ownBlock, "code-review", body("code-review")).verdict).toBe("pass");
    expect(err(() => planPrVerdict(ready, "test", body("code-review")))).toContain("Only code-review posts");
    expect(err(() => planPrVerdict(issue({ status: "test-review", pr: ready.pr }), "code-review", body("code-review")))).toContain("is test-review");
    expect(err(() => planPrVerdict(issue({ status: "blocked", blocked_by: "test", pr: ready.pr }), "code-review", body("code-review")))).toContain("is blocked");
    expect(err(() => planPrVerdict(issue({ status: "code-review" }), "code-review", body("code-review")))).toContain("no pull request link");
    expect(err(() => planPrVerdict(ready, "code-review", body("red-review")))).toContain("only code review verdicts");
  });
});

describe("bodies and formats", () => {
  test("rejects lines the local file format reserves", () => {
    expect(err(() => checkBody("a\n## Comments\nb", "body"))).toContain("## Comments");
    expect(err(() => checkBody("### report from tpm at 2026-10-12T15:04:00Z", "comment"))).toContain("comment heading");
    expect(err(() => checkBody("verdict from test at 2026-10-12T15:04:00Z", "comment"))).toContain("The CLI writes the header");
    expect(() => checkBody("## Findings\n### Notes\nreport from tpm earlier", "comment")).not.toThrow();
  });

  test("YAML scalars round-trip, with quotes only where YAML needs them", () => {
    for (const value of ["todo#4", "3f2a9c1", "1234567", "1e10000", "Set a date: today", "null", "true", "#tag", "- dash", 'say "hi"']) {
      expect((Bun.YAML.parse(`k: ${yamlScalar(value)}`) as { k: unknown }).k).toBe(value);
    }
    expect(yamlScalar("todo/due-dates-01")).toBe("todo/due-dates-01");
    expect(yamlScalar("1234567")).toBe('"1234567"');
  });

  test("an issue file round-trips with its body and comments", () => {
    const data = {
      ...emptyFields(),
      parent: "todo#4",
      spec_sha: "1234567",
      blocks: { security: 1, "code-review": 2 } as Issue["blocks"],
      kind: "slice" as Kind,
      title: "Set a due date: on a task",
      status: "red" as Status,
      body: "## Slice\n\nSpec: apps/todo/docs/x.md",
      comments: [
        { type: "report" as const, agent: "tpm", at: "2026-10-12T15:04:00Z", body: "RED passed.\n\n## Findings\n\nNone" },
        { type: "question" as const, agent: "backend", at: "2026-10-12T16:00:00Z", body: "For the spec writer: which zone?" },
      ],
    };
    const text = formatIssueFile(data);
    expect(text).toContain("title: \"Set a due date: on a task\"\n");
    expect(text).toContain("blocks: {security: 1, code-review: 2}\n");
    expect(parseIssueFile(text, "f.md")).toEqual(data);
  });

  test("the GitHub fields block round-trips and keeps the human body", () => {
    const fields = { ...emptyFields(), spec: "apps/todo/docs/x.md", blocked_by: "test" as const, blocks: { test: 1 } };
    const body = composeBody(fields, "## Slice\n\nThe body.");
    expect(body.startsWith("```yaml\n# Tracker fields.")).toBe(true);
    expect(splitBody(body, "x")).toEqual({ fields, body: "## Slice\n\nThe body." });
    expect(splitBody(body.replace(/\n/g, "\r\n"), "x").fields).toEqual(fields);
    expect(err(() => splitBody("Written by hand.", "acme/w#9"))).toContain("didn't create it");
  });

  test("reads GitHub pull request URLs", () => {
    expect(parsePrUrl("https://github.com/acme/my.site/pull/12")).toEqual({ repo: "acme/my.site", number: 12, url: "https://github.com/acme/my.site/pull/12" });
    expect(parsePrUrl(" https://github.com/acme/todo/pull/7/\n")?.url).toBe("https://github.com/acme/todo/pull/7");
    expect(parsePrUrl("https://github.com/acme/todo/pull/0")).toBeNull();
    expect(parsePrUrl("https://github.com/acme/todo/pull/7/files")).toBeNull();
    expect(parsePrUrl("https://github.com.evil.example/acme/todo/pull/7")).toBeNull();
  });

  test("reads GitHub repositories from origin URLs", () => {
    expect(parseRepoUrl("git@github.com:acme/widgets.git")).toBe("acme/widgets");
    expect(parseRepoUrl("https://github.com/acme/widgets")).toBe("acme/widgets");
    expect(parseRepoUrl("ssh://git@github.com/acme/my.site.git\n")).toBe("acme/my.site");
    expect(parseRepoUrl("git@gitlab.com:acme/widgets.git")).toBeNull();
    // An HTTPS origin may carry a username or token before github.com.
    expect(parseRepoUrl("https://x-access-token:SECRET@github.com/acme/widgets.git")).toBe("acme/widgets");
    expect(parseRepoUrl("https://octocat@github.com/acme/widgets")).toBe("acme/widgets");
    // A URL on another host that only contains github.com isn't GitHub.
    expect(parseRepoUrl("https://evil.example/github.com/acme/widgets.git")).toBeNull();
    expect(parseRepoUrl("https://github.com.evil.example/acme/widgets")).toBeNull();
    expect(parseRepoUrl("https://github.com@evil.example/acme/widgets")).toBeNull();
    expect(parseRepoUrl("https://a@b@github.com/acme/widgets")).toBeNull();
    expect(parseRepoUrl("git@evil.example:github.com/acme/widgets.git")).toBeNull();
  });

  test("slugs are short, lowercase, and never empty", () => {
    expect(slugify("Set a due date: on a task!")).toBe("set-a-due-date-on-a-task");
    expect(slugify("!!!")).toBe("issue");
    expect(slugify("a".repeat(80)).length).toBe(50);
  });
});
