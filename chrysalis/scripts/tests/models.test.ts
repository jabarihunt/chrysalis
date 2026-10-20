// Checks chrysalis/models.yaml against factory ADR 0027: within one tool, each gate's class uses a
// different family, or a different model in a single-family tool, from every class whose work it reviews.
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

type ClassEntry = { family: string; model: string; fallback?: string; confirmed: boolean };
type Tool = { single_family?: boolean } & Record<string, unknown>;
type Models = { classes: Record<string, unknown>; tools: Record<string, Tool> };

const CLASSES = ["plan", "build", "test", "review"] as const;

/** Each pair is a gate's class and a class whose work that gate reviews. */
const MUST_DIFFER: [string, string][] = [
  ["review", "plan"],
  ["review", "build"],
  ["review", "test"],
  ["test", "build"],
];

/** Returns one message per pair of classes that share a family, or a model in a single-family tool. */
function sharedPairs(tool: Tool): string[] {
  const problems: string[] = [];
  const entry = (name: string) => tool[name] as ClassEntry;
  for (const [a, b] of MUST_DIFFER) {
    const x = entry(a);
    const y = entry(b);
    if (tool.single_family) {
      const xs = [x.model, x.fallback].filter(Boolean);
      const ys = [y.model, y.fallback].filter(Boolean);
      for (const m of xs) if (ys.includes(m)) problems.push(`${a} and ${b} both use ${m}`);
    } else if (x.family === y.family) {
      problems.push(`${a} and ${b} are both ${x.family}`);
    }
  }
  return problems;
}

async function loadModels(): Promise<Models> {
  const path = resolve(import.meta.dir, "..", "..", "models.yaml");
  return Bun.YAML.parse(await Bun.file(path).text()) as Models;
}

describe("models.yaml", () => {
  test("every tool maps every class to a model", async () => {
    const models = await loadModels();
    expect(Object.keys(models.classes).sort()).toEqual([...CLASSES].sort());
    for (const [name, tool] of Object.entries(models.tools)) {
      for (const cls of CLASSES) {
        const entry = tool[cls] as ClassEntry | undefined;
        expect(entry?.family, `${name} ${cls} family`).toBeString();
        expect(entry?.model, `${name} ${cls} model`).toBeString();
      }
    }
  });

  test("each gate's class differs from every class whose work it reviews", async () => {
    const models = await loadModels();
    for (const [name, tool] of Object.entries(models.tools)) {
      expect(sharedPairs(tool), name).toEqual([]);
    }
  });

  test("only a single-family tool may keep every class in one family", async () => {
    const models = await loadModels();
    for (const [name, tool] of Object.entries(models.tools)) {
      const families = new Set(CLASSES.map((cls) => (tool[cls] as ClassEntry).family));
      if (families.size === 1) expect(tool.single_family, name).toBe(true);
    }
  });

  test("the check catches the mappings ADR 0027 rules out", () => {
    const entry = (family: string, model: string, fallback?: string): ClassEntry => ({ family, model, fallback, confirmed: false });
    // The mapping ADR 0022 allowed: plan and review on the same Claude model.
    const before = { plan: entry("claude", "opus"), build: entry("grok", "grok"), test: entry("gpt", "gpt"), review: entry("claude", "opus") };
    expect(sharedPairs(before)).toEqual(["review and plan are both claude"]);
    const singleFamily = { single_family: true, plan: entry("claude", "a"), build: entry("claude", "b"), test: entry("claude", "c"), review: entry("claude", "d", "a") };
    expect(sharedPairs(singleFamily)).toEqual(["review and plan both use a"]);
    expect(sharedPairs({ ...singleFamily, review: entry("claude", "d", "e") })).toEqual([]);
  });
});
