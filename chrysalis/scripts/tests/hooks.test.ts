// Tests for the tool hooks: the command hook that Kiro and Claude Code run before every shell
// command, and Claude Code's write-scope hook. See factory ADR 0032.
import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deniedCommand, effectiveCommands, parseShell } from "../lib/commands";
import { decide } from "../hooks/deny-commands";
import { branchApp, writeDecision } from "../hooks/write-scope";
import { cleanup, tempDir } from "./helpers";

const REPO = resolve(import.meta.dir, "..", "..", "..");

afterEach(cleanup);

function denied(command: string, branch: string | null = "factory/9-tool-generator"): string | null {
  return deniedCommand(command, { cwd: "/repo", branchOf: () => branch });
}

describe("parseShell", () => {
  test("splits compound commands and drops quotes, redirections, and heredoc bodies", () => {
    const text = [
      `cd apps/todo && FOO=1 bun run check 2>&1 | tail -5; echo "done $(git log -1)" > out.txt`,
      `bun chrysalis/scripts/tracker.ts comment factory#9 --body-file - <<'EOF' | grep -c x`,
      `gh api repos/x`,
      `git push origin master`,
      `EOF`,
      `git status`,
    ].join("\n");
    expect(parseShell(text)).toEqual([
      ["cd", "apps/todo"],
      ["FOO=1", "bun", "run", "check"],
      ["tail", "-5"],
      ["git", "log", "-1"],
      ["echo", "done "],
      ["bun", "chrysalis/scripts/tracker.ts", "comment", "factory#9", "--body-file", "-"],
      ["grep", "-c", "x"],
      ["git", "status"],
    ]);
  });

  test("finds the command behind wrappers and inside sh -c and eval", () => {
    expect(effectiveCommands(["env", "-u", "X", "A=1", "sudo", "-u", "me", "/usr/bin/gh", "api", "x"])).toEqual([["gh", "api", "x"]]);
    expect(effectiveCommands(["bash", "-lc", "git status && git rebase main"])).toEqual([["git", "status"], ["git", "rebase", "main"]]);
    expect(effectiveCommands(["eval", "git", "reset", "--hard"])).toEqual([["git", "reset", "--hard"]]);
    expect(effectiveCommands(["timeout", "-s", "KILL", "30", "xargs", "-n", "1", "git", "push"])).toEqual([["git", "push"]]);
  });
});

describe("deniedCommand", () => {
  const blocked = [
    "gh api repos/acme/todo",
    "gh api -X POST repos/acme/todo/rulesets --input x.json",
    "gh -R acme/todo api graphql",
    "gh pr create --fill",
    "gh pr new",
    "gh pr merge 12 --merge",
    "gh --repo acme/todo pr review 12 --approve",
    "git push origin master",
    "git push origin HEAD:master",
    "git push origin factory/9-x:refs/heads/master",
    "git push origin :master",
    "git push --force origin factory/9-x",
    "git push --force-with-lease",
    "git push -fu origin factory/9-x",
    "git push origin +factory/9-x",
    "git push --mirror origin",
    "git push --all",
    "git -C ../other push origin master",
    "git rebase master",
    "git -c core.editor=true rebase -i HEAD~3",
    "git reset --hard HEAD~1",
    "git branch -D factory/old",
    "git branch --delete --force factory/old",
    "git branch -df factory/old",
    "git status && gh pr merge 12",
    "echo $(gh api user)",
    'echo "$(git push origin master)"',
    "echo `git rebase main`",
    "bash -c 'gh api user'",
    "GH_TOKEN=x gh api user",
    "(cd apps/todo && git reset --hard)",
  ];
  for (const command of blocked) {
    test(`blocks ${command}`, () => {
      expect(denied(command)).toContain("denied");
    });
  }

  const allowed = [
    "git push -u origin factory/9-tool-generator",
    "git push origin factory/9-master-notes",
    "git push",
    "git status --short --branch",
    "git branch --list",
    "git branch -d merged-branch",
    "git reset --soft HEAD~1",
    "git log --grep rebase",
    'git commit -m "Deny gh api, git rebase, and git push origin master"',
    "gh pr view 12 --json body",
    "gh issue list --search api",
    "bun chrysalis/scripts/tracker.ts pr-open factory#9 --title x --body-file -",
    "bun chrysalis/scripts/tracker.ts comment factory#9 --type report --body-file - <<'EOF'\nThe hook blocks gh api and git push origin master.\ngit rebase is denied too.\nEOF",
    "grep -rn 'gh api' chrysalis/",
  ];
  for (const command of allowed) {
    test(`allows ${command.split("\n")[0]}`, () => {
      expect(denied(command)).toBeNull();
    });
  }

  test("blocks a push that names no branch, or HEAD, only when master is checked out", () => {
    expect(denied("git push", "master")).toContain("to master is denied");
    expect(denied("git push -u origin HEAD", "master")).toContain("to master is denied");
    expect(denied("git push origin HEAD", "factory/9-x")).toBeNull();
  });

  test("reads the branch from the folder that git -C or cd names", () => {
    const seen: string[] = [];
    const branchOf = (dir: string) => {
      seen.push(dir);
      return "master";
    };
    expect(deniedCommand("cd ../other && git push", { cwd: "/repo/app", branchOf })).toContain("to master");
    expect(deniedCommand("git -C sub push", { cwd: "/repo", branchOf })).toContain("to master");
    expect(seen).toEqual(["/repo/other", "/repo/sub"]);
  });

  test("falls back to a text search when the command can't be parsed", () => {
    expect(denied(`echo "unterminated && gh api user`)).toContain("couldn't be parsed");
    expect(denied(`echo "unterminated`)).toBeNull();
  });
});

describe("the command hook", () => {
  test("reads the command from Kiro, Claude Code, and Cursor input", () => {
    const branch = () => "factory/9-x";
    expect(decide(JSON.stringify({ hook_event_name: "PreToolUse", cwd: "/repo", tool_name: "execute_bash", tool_input: { command: "gh pr merge 3" } }), branch)).toContain("denied");
    expect(decide(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git status" } }), branch)).toBeNull();
    expect(decide(JSON.stringify({ command: "git rebase main", cwd: "/repo" }), branch)).toContain("denied");
    // A call with no command, such as stopping a background process, passes.
    expect(decide(JSON.stringify({ tool_name: "control_bash_process", tool_input: { action: "stop" } }), branch)).toBeNull();
    expect(decide("not json", branch)).toContain("couldn't read its input");
  });

  test("reads the branch from the folder Kiro runs the command in", () => {
    // The shape Kiro sent for an execute_bash call in this repository on 2026-11-11.
    const input = {
      session_id: "sess_x",
      hook_event_name: "PreToolUse",
      cwd: "/repo",
      tool_name: "execute_bash",
      tool_input: { command: "git push", description: "Push the branch", cwd: "/repo/backlog", run_in_background: false, timeout: null },
    };
    const seen: string[] = [];
    expect(decide(JSON.stringify(input), (dir) => (seen.push(dir), "master"))).toContain("to master is denied");
    expect(seen).toEqual(["/repo/backlog"]);
  });

  async function runHook(script: string, input: unknown): Promise<{ code: number; stderr: string }> {
    const proc = Bun.spawn([process.execPath, join(REPO, "chrysalis", "scripts", "hooks", script)], {
      cwd: REPO,
      stdin: new TextEncoder().encode(JSON.stringify(input)),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stderr, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    return { code, stderr };
  }

  test("exits with code 2 and a reason to block, and 0 to allow", async () => {
    const blocked = await runHook("deny-commands.ts", { cwd: REPO, tool_input: { command: "gh api user" } });
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain("gh api is denied");
    const passed = await runHook("deny-commands.ts", { cwd: REPO, tool_input: { command: "git status" } });
    expect(passed).toEqual({ code: 0, stderr: "" });
  });

  test("the write-scope hook blocks edits under backlog/, and lets a main session edit the factory", async () => {
    const blocked = await runHook("write-scope.ts", { tool_name: "Write", tool_input: { file_path: join(REPO, "backlog", "factory", "0001-x.md") } });
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain("Only the tracker CLI writes backlog/");
    expect((await runHook("write-scope.ts", { tool_name: "Edit", tool_input: { file_path: join(REPO, "README.md") } })).code).toBe(0);
  });
});

describe("the write-scope hook", () => {
  /** A repository root with the real factory sources and one JabStack app named todo. */
  function repo(): string {
    const root = tempDir();
    for (const part of ["agents", "skills", "stacks"]) cpSync(join(REPO, "chrysalis", part), join(root, "chrysalis", part), { recursive: true });
    cpSync(join(REPO, "chrysalis", "models.yaml"), join(root, "chrysalis", "models.yaml"));
    mkdirSync(join(root, "apps", "todo"), { recursive: true });
    writeFileSync(join(root, "apps", "todo", "app.yaml"), "name: todo\nstack: jabstack\n");
    return root;
  }

  test("reads the app from a work branch's first segment", () => {
    expect(branchApp("todo/due-dates-01")).toBe("todo");
    expect(branchApp("todo/12-fix-typo")).toBe("todo");
    expect(branchApp("factory/9-tool-generator")).toBeNull();
    expect(branchApp("master")).toBeNull();
    expect(branchApp(null)).toBeNull();
  });

  test("holds a subagent to its layer in the branch's app", () => {
    const root = repo();
    const edit = (agent: string | null, path: string, branch: string | null = "todo/due-dates-01") => writeDecision({ root, path, agent, branch });
    expect(edit("backend", "apps/todo/src/lib/server/tasks.ts")).toBeNull();
    expect(edit("backend", join(root, "apps/todo/src/routes/tasks/+page.server.ts"))).toBeNull();
    expect(edit("backend", "apps/todo/src/routes/tasks/+page.svelte")).toContain("outside the backend agent's write scope for app todo");
    expect(edit("backend", "apps/blog/src/lib/server/posts.ts")).toContain("outside");
    expect(edit("database", "apps/todo/src/lib/server/db/schema.ts")).toBeNull();
    expect(edit("frontend", "apps/todo/src/routes/tasks/+page.svelte")).toBeNull();
    expect(edit("test", "apps/todo/tests/acceptance/due-dates/01.spec.ts")).toBeNull();
    expect(edit("test", "apps/todo/src/lib/server/tasks.ts")).toContain("outside");
    expect(edit("code-review", "apps/todo/README.md")).toContain("It may edit: nothing");
    expect(edit("spec-writer", "apps/todo/docs/features/due-dates/brief.md")).toBeNull();
    // On a factory branch, no app is checked out, so app agents may edit nothing.
    expect(edit("backend", "apps/todo/src/lib/server/tasks.ts", "factory/9-x")).toContain("names no app");
  });

  test("lets the factory-maintainer edit the factory and root files, and nothing in apps/", () => {
    const root = repo();
    const edit = (path: string) => writeDecision({ root, path, agent: "factory-maintainer", branch: "factory/9-x" });
    expect(edit("chrysalis/agents/tpm.md")).toBeNull();
    expect(edit("README.md")).toBeNull();
    expect(edit(".kiro/hooks/x.json")).toBeNull();
    expect(edit("apps/todo/app.yaml")).toContain("outside");
  });

  test("blocks agents the factory doesn't define, and edits under backlog/ by anyone", () => {
    const root = repo();
    expect(writeDecision({ root, path: "README.md", agent: "general-purpose", branch: "todo/x" })).toContain("isn't a Chrysalis agent");
    expect(writeDecision({ root, path: "backlog/todo/0001-x.md", agent: null, branch: "todo/x" })).toContain("Only the tracker CLI");
    // Without agent_type, the main session isn't checked here. check.ts holds its commits to its scope.
    expect(writeDecision({ root, path: "apps/todo/src/app.css", agent: null, branch: "todo/x" })).toBeNull();
    // Files outside the repository are left to Claude Code's own rules.
    expect(writeDecision({ root, path: "/tmp/notes.md", agent: "backend", branch: "todo/x" })).toBeNull();
  });
});
