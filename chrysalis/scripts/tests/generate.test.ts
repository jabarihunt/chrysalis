// Tests for the tool generator: which files it writes for each tool, what each one allows and denies,
// and how --check finds stale files. The fixtures copy the real agent files, skills, stack profiles,
// and models.yaml into a temp folder, and confirm models there. See factory ADRs 0021, 0032, and 0033.
import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { checkPlan, writePlan } from "../generate";
import { DENIED_PATTERNS } from "../lib/commands";
import { FactoryError, MODEL_CLASSES, loadFactory, splitFrontmatter } from "../lib/factory";
import type { ToolName } from "../lib/factory";
import { AGENT_DIRS, CLAUDE_SETTINGS, KIRO_HOOK, planFiles, rewriteLinks } from "../lib/generate";
import { cleanup, tempDir } from "./helpers";

const REPO = resolve(import.meta.dir, "..", "..", "..");

afterEach(cleanup);

type Models = { classes: Record<string, unknown>; tools: Record<string, Record<string, any>> };

/** A copy of the factory's sources in a temp folder, with models.yaml changed by edit. */
function fixture(edit: (models: Models) => void = () => {}): string {
  const root = tempDir();
  for (const part of ["agents", "skills", "stacks"]) cpSync(join(REPO, "chrysalis", part), join(root, "chrysalis", part), { recursive: true });
  const models = Bun.YAML.parse(readFileSync(join(REPO, "chrysalis", "models.yaml"), "utf8")) as Models;
  edit(models);
  // JSON is valid YAML, so the edited models can be written back as JSON.
  writeFileSync(join(root, "chrysalis", "models.yaml"), JSON.stringify(models, null, 2));
  return root;
}

function confirm(...tools: ToolName[]) {
  return (models: Models) => {
    for (const tool of tools) for (const cls of MODEL_CLASSES) models.tools[tool]![cls].confirmed = true;
  };
}

function plan(root: string) {
  return planFiles(loadFactory(root));
}

function frontmatter(text: string): Record<string, any> {
  return splitFrontmatter(text)!.data as Record<string, any>;
}

function kiroRules(text: string, capability: string, effect: string) {
  return (JSON.parse(text).permissions.rules as any[]).filter((r) => r.capability === capability && r.effect === effect);
}

describe("generator", () => {
  test("the repository's generated files are current", () => {
    expect(checkPlan(REPO, plan(REPO))).toEqual([]);
  });

  test("a tool with no confirmed model gets no agent files, but the deny rules are always written", () => {
    const files = [...plan(fixture()).files.keys()];
    expect(files.sort()).toEqual([CLAUDE_SETTINGS, KIRO_HOOK].sort());
  });

  test("a tool with every class confirmed gets one file per agent, with its class's model", () => {
    const root = fixture(confirm("kiro"));
    const { files } = plan(root);
    const agents = loadFactory(root).agents;
    const kiro = [...files.keys()].filter((path) => path.startsWith(`${AGENT_DIRS.kiro}/`));
    expect(kiro.sort()).toEqual(agents.map((a) => `${AGENT_DIRS.kiro}/${a.name}.json`).sort());
    expect([...files.keys()].some((path) => path.startsWith(".cursor/") || path.startsWith(".kilo/"))).toBe(false);
    const models = Bun.YAML.parse(readFileSync(join(root, "chrysalis", "models.yaml"), "utf8")) as Models;
    for (const agent of agents) {
      const config = JSON.parse(files.get(`${AGENT_DIRS.kiro}/${agent.name}.json`)!);
      expect(config.model).toBe(models.tools.kiro![agent.model_class].model);
      // The prompt points at the agent file, relative to the Kiro agent folder.
      expect(config.prompt).toBe(`file://../../chrysalis/agents/${agent.name}.md`);
      expect(existsSync(join(root, AGENT_DIRS.kiro, config.prompt.slice("file://".length)))).toBe(true);
    }
  });

  test("a tool with some classes confirmed is an error", () => {
    const root = fixture((models) => {
      models.tools.kiro!.plan.confirmed = true;
      models.tools.kiro!.build.confirmed = true;
    });
    expect(() => plan(root)).toThrow(FactoryError);
    expect(() => plan(root)).toThrow("not for test, review");
  });

  test("a confirmed fallback stands in for an unconfirmed model", () => {
    const root = fixture((models) => {
      confirm("claude")(models);
      models.tools.claude!.review.confirmed = false;
      models.tools.claude!.review.fallback_confirmed = true;
    });
    const review = frontmatter(plan(root).files.get(`${AGENT_DIRS.claude}/code-review.md`)!);
    expect(review.model).toBe("claude-opus-4-8");
  });

  test("Kiro denies every write outside the scope, and the always-denied commands", () => {
    const { files } = plan(fixture(confirm("kiro")));
    const backend = files.get(`${AGENT_DIRS.kiro}/backend.json`)!;
    const [deny] = kiroRules(backend, "fs_write", "deny");
    const [allow] = kiroRules(backend, "fs_write", "allow");
    expect(deny.match).toEqual(["**"]);
    expect(deny.exclude).toEqual(allow.match);
    expect(allow.match).toContain("apps/*/src/lib/server/*.ts");
    expect(allow.match).not.toContain("apps/*/src/lib/server/db/**");
    expect(kiroRules(backend, "shell", "deny")[0].match).toEqual(DENIED_PATTERNS);
    expect(kiroRules(backend, "shell", "allow")[0].match).toEqual(expect.arrayContaining(["bun run test:unit", "cd apps/*", "git push *"]));

    // A gate agent writes only through the tracker CLI, so it gets no write tool and no allowed path.
    const review = JSON.parse(files.get(`${AGENT_DIRS.kiro}/code-review.json`)!);
    expect(review.tools).toEqual(["read", "shell", "web"]);
    expect(kiroRules(files.get(`${AGENT_DIRS.kiro}/code-review.json`)!, "fs_write", "deny")[0]).toEqual({ capability: "fs_write", match: ["**"], effect: "deny" });

    // Primary agents start subagents, and root-files becomes the patterns for files in the root.
    const maintainer = JSON.parse(files.get(`${AGENT_DIRS.kiro}/factory-maintainer.json`)!);
    expect(maintainer.tools).toContain("subagent");
    expect(kiroRules(files.get(`${AGENT_DIRS.kiro}/factory-maintainer.json`)!, "fs_write", "allow")[0].match).toEqual(expect.arrayContaining(["chrysalis/**", "*", ".*"]));
  });

  test("Kilo hides subagents, and puts its catch-all rules before the exceptions", () => {
    const { files } = plan(fixture(confirm("kilo")));
    const review = frontmatter(files.get(`${AGENT_DIRS.kilo}/code-review.md`)!);
    expect(review).toMatchObject({ mode: "subagent", hidden: true, model: "openai/gpt-5.6-sol" });
    expect(review.permission.edit).toBe("deny");
    const bash = Object.entries(review.permission.bash as Record<string, string>);
    expect(bash[0]).toEqual(["*", "ask"]);
    expect(bash.slice(-DENIED_PATTERNS.length)).toEqual(DENIED_PATTERNS.map((p) => [p, "deny"]));

    const backend = frontmatter(files.get(`${AGENT_DIRS.kilo}/backend.md`)!);
    expect(Object.entries(backend.permission.edit)[0]).toEqual(["*", "deny"]);
    expect(backend.permission.edit["apps/*/src/routes/**/+server.ts"]).toBe("allow");

    const tpm = frontmatter(files.get(`${AGENT_DIRS.kilo}/tpm.md`)!);
    expect(tpm.mode).toBe("primary");
    expect(tpm.hidden).toBeUndefined();
    // Kilo's * also matches /, so it can't limit an agent to files in the root.
    expect(frontmatter(files.get(`${AGENT_DIRS.kilo}/factory-maintainer.md`)!).permission.edit).toBe("allow");
  });

  test("Cursor gate agents aren't read-only, so they can post verdicts", () => {
    const { files } = plan(fixture(confirm("cursor")));
    for (const [path, text] of files) {
      if (!path.startsWith(`${AGENT_DIRS.cursor}/`)) continue;
      expect(Object.keys(frontmatter(text)).sort()).toEqual(["description", "model", "name"]);
    }
  });

  test("Claude Code agents copy the body with links from the root, and gates lose the edit tools", () => {
    const { files } = plan(fixture(confirm("claude")));
    const review = files.get(`${AGENT_DIRS.claude}/code-review.md`)!;
    expect(frontmatter(review).disallowedTools).toBe("Edit, Write, NotebookEdit");
    expect(frontmatter(files.get(`${AGENT_DIRS.claude}/backend.md`)!).disallowedTools).toBeUndefined();
    const body = splitFrontmatter(review)!.body;
    expect(body).toContain("This prompt copies the body of `chrysalis/agents/code-review.md`.");
    expect(body).toContain("[gate verdict template](chrysalis/templates/gate-verdict.md)");
    // Every relative link in every copied body resolves from the repository root.
    for (const [path, text] of files) {
      if (!path.startsWith(`${AGENT_DIRS.claude}/`)) continue;
      for (const [, target] of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        if (/^[a-z]+:/.test(target!)) continue;
        expect(existsSync(join(REPO, target!)), `${path} links ${target}`).toBe(true);
      }
    }
  });

  test("Claude Code settings deny the commands and run both hooks", () => {
    const settings = JSON.parse(plan(fixture()).files.get(CLAUDE_SETTINGS)!);
    expect(settings.permissions.deny).toEqual(DENIED_PATTERNS.map((p) => `Bash(${p})`));
    const hooks = settings.hooks.PreToolUse.map((h: any) => [h.matcher, h.hooks[0].command]);
    expect(hooks).toEqual([
      ["Bash", 'bun "$CLAUDE_PROJECT_DIR/chrysalis/scripts/hooks/deny-commands.ts"'],
      ["Edit|Write|MultiEdit|NotebookEdit", 'bun "$CLAUDE_PROJECT_DIR/chrysalis/scripts/hooks/write-scope.ts"'],
    ]);
    for (const [, command] of hooks) expect(existsSync(join(REPO, command.match(/\/(chrysalis\/[^"]+)/)[1]))).toBe(true);
  });

  test("the Kiro hook runs the deny script before every shell command", () => {
    const hook = JSON.parse(plan(fixture()).files.get(KIRO_HOOK)!);
    expect(hook.version).toBe("v1");
    expect(hook.hooks[0]).toMatchObject({ trigger: "PreToolUse", matcher: "shell", action: { type: "command", command: "bun chrysalis/scripts/hooks/deny-commands.ts" } });
  });

  test("every generated frontmatter and JSON file parses", () => {
    const { files } = plan(fixture(confirm("cursor", "kilo", "kiro", "claude")));
    for (const [path, text] of files) {
      if (path.endsWith(".json")) expect(() => JSON.parse(text), path).not.toThrow();
      else expect(splitFrontmatter(text), path).not.toBeNull();
    }
  });

  test("--check finds missing, changed, and stray files, and writing fixes them", () => {
    const root = fixture(confirm("kiro"));
    const first = plan(root);
    expect(checkPlan(root, first)).toContain(`${KIRO_HOOK} is missing.`);
    writePlan(root, first);
    expect(checkPlan(root, first)).toEqual([]);

    writeFileSync(join(root, AGENT_DIRS.kiro, "tpm.json"), "{}\n");
    mkdirSync(join(root, AGENT_DIRS.cursor), { recursive: true });
    writeFileSync(join(root, AGENT_DIRS.cursor, "old.md"), "stale\n");
    expect(checkPlan(root, first).sort()).toEqual([`${AGENT_DIRS.cursor}/old.md isn't generated from any agent file and tool with confirmed models.`, `${AGENT_DIRS.kiro}/tpm.json differs from what the generator writes.`]);
    expect(writePlan(root, first).deleted).toEqual([`${AGENT_DIRS.cursor}/old.md`]);
    expect(existsSync(join(root, ".cursor"))).toBe(false);
    expect(checkPlan(root, first)).toEqual([]);

    // Taking back a tool's confirmations removes its agent files.
    const models = JSON.parse(readFileSync(join(root, "chrysalis", "models.yaml"), "utf8"));
    for (const cls of MODEL_CLASSES) models.tools.kiro[cls].confirmed = false;
    writeFileSync(join(root, "chrysalis", "models.yaml"), JSON.stringify(models));
    const second = plan(root);
    expect(checkPlan(root, second).length).toBe(loadFactory(root).agents.length);
    writePlan(root, second);
    expect(existsSync(join(root, AGENT_DIRS.kiro))).toBe(false);
    expect(existsSync(join(root, KIRO_HOOK))).toBe(true);
  });
});

describe("the factory's sources", () => {
  function withAgent(change: (text: string) => string, file = "backend.md"): string {
    const root = fixture();
    const path = join(root, "chrysalis", "agents", file);
    writeFileSync(path, change(readFileSync(path, "utf8")));
    return root;
  }

  function problems(root: string): string[] {
    try {
      loadFactory(root);
      return [];
    } catch (error) {
      return (error as FactoryError).problems;
    }
  }

  test("the generator refuses agent files that break the template's fields", () => {
    const cases: [string, (text: string) => string, string][] = [
      ["an unknown shell group", (t) => t.replace("  - stack\n", "  - deploy\n"), 'shell names "deploy"'],
      ["an unknown model class", (t) => t.replace("model_class: build", "model_class: fast"), "model_class must be one of"],
      ["a stack layer no profile has", (t) => t.replace("stack:backend", "stack:mobile"), "no stack profile defines the mobile layer"],
      ["a skill that doesn't exist", (t) => t.replace("diagnosing-bugs", "guessing-bugs"), "guessing-bugs/SKILL.md, which doesn't exist"],
      ["a name that isn't the file's", (t) => t.replace("name: backend", "name: server"), 'name must be "backend"'],
      ["an unknown field", (t) => t.replace("mode: subagent", "mode: subagent\nreadonly: true"), 'unknown field "readonly"'],
      ["a path outside the repository", (t) => t.replace("  - stack:backend", "  - ../elsewhere/**"), 'Write scope paths are relative'],
    ];
    for (const [what, change, message] of cases) {
      const found = problems(withAgent(change));
      expect(found.length, what).toBe(1);
      expect(found[0], what).toContain(message);
    }
  });

  test("the generator refuses a model entry without its fields", () => {
    const root = fixture((models) => {
      delete models.tools.kiro!.test.family;
      models.tools.kiro!.plan.fallback_confirmed = true;
    });
    expect(problems(root)).toEqual([
      "chrysalis/models.yaml: tools.kiro.plan sets fallback_confirmed but has no fallback.",
      "chrysalis/models.yaml: tools.kiro.test.family must be a string.",
    ]);
  });
});

describe("rewriteLinks", () => {
  test("rewrites relative links to paths from the root, and leaves the rest", () => {
    const body = "See [the gates](../workflow/gates.md#verdicts), [ADR 0027](../docs/adr/0027-x.md), [web](https://example.com), and [here](#steps).";
    expect(rewriteLinks(body, "chrysalis/agents/tpm.md")).toBe(
      "See [the gates](chrysalis/workflow/gates.md#verdicts), [ADR 0027](chrysalis/docs/adr/0027-x.md), [web](https://example.com), and [here](#steps).",
    );
    expect(posix.normalize("chrysalis/agents/../workflow")).toBe("chrysalis/workflow");
  });
});
