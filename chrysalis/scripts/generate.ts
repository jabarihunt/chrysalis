// The tool generator. Run it as `bun chrysalis/scripts/generate.ts` after changing an agent file,
// chrysalis/models.yaml, or a stack profile, and commit what it writes. `--check` writes nothing and
// fails when a generated file is missing, stale, or no longer generated. `--root <dir>` generates in
// another copy of the factory, such as an eval's scratch folder.
// Factory ADRs 0021, 0032, and 0033 describe the files it writes.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { FactoryError, loadFactory } from "./lib/factory";
import { AGENT_DIRS, planFiles } from "./lib/generate";
import type { Plan } from "./lib/generate";

const USAGE = `Usage: bun chrysalis/scripts/generate.ts [--check] [--root <dir>]

Writes each tool's agent files, the Kiro hook, and the Claude Code settings from chrysalis/agents/,
chrysalis/models.yaml, and chrysalis/stacks/. A tool gets agent files only when chrysalis/models.yaml
confirms a model for all four of its classes.

  --check       Write nothing. Exit with code 1 when any generated file differs from what's on disk.
  --root <dir>  The repository root to read and write. Defaults to this script's repository.`;

/** Files in the agent folders that the plan doesn't include. The generator owns those folders. */
function strayFiles(root: string, plan: Plan): string[] {
  const out: string[] = [];
  for (const dir of Object.values(AGENT_DIRS)) {
    if (!existsSync(join(root, dir))) continue;
    for (const name of readdirSync(join(root, dir)).sort()) {
      const path = `${dir}/${name}`;
      if (!plan.files.has(path)) out.push(path);
    }
  }
  return out;
}

/** One message per generated file that's missing, differs, or shouldn't exist. */
export function checkPlan(root: string, plan: Plan): string[] {
  const problems: string[] = [];
  for (const [path, content] of plan.files) {
    const full = join(root, path);
    if (!existsSync(full)) problems.push(`${path} is missing.`);
    else if (readFileSync(full, "utf8") !== content) problems.push(`${path} differs from what the generator writes.`);
  }
  for (const path of strayFiles(root, plan)) problems.push(`${path} isn't generated from any agent file and tool with confirmed models.`);
  return problems;
}

/** Writes every planned file, and deletes the files in the agent folders that the plan doesn't include. */
export function writePlan(root: string, plan: Plan): { written: string[]; deleted: string[] } {
  const written: string[] = [];
  for (const [path, content] of plan.files) {
    const full = join(root, path);
    if (existsSync(full) && readFileSync(full, "utf8") === content) continue;
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    written.push(path);
  }
  const deleted = strayFiles(root, plan);
  for (const path of deleted) rmSync(join(root, path), { recursive: true, force: true });
  // Remove agent folders, and their tool folders, that are left empty.
  for (const dir of Object.values(AGENT_DIRS)) {
    for (const folder of [dir, dirname(dir)]) {
      const full = join(root, folder);
      if (existsSync(full) && readdirSync(full).length === 0) rmdirSync(full);
    }
  }
  return { written, deleted };
}

function main(argv: string[]): number {
  let values;
  try {
    values = parseArgs({ args: argv, options: { check: { type: "boolean" }, root: { type: "string" }, help: { type: "boolean" } }, strict: true }).values;
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const root = resolve(values.root ?? resolve(import.meta.dir, "..", ".."));
  let plan: Plan;
  try {
    plan = planFiles(loadFactory(root));
  } catch (error) {
    if (!(error instanceof FactoryError)) throw error;
    console.error(`The generator found problems in the factory's sources:\n${error.problems.map((p) => `- ${p}`).join("\n")}`);
    return 1;
  }
  if (values.check) {
    const problems = checkPlan(root, plan);
    if (problems.length) {
      console.error(`The generated tool files are out of date. Run bun chrysalis/scripts/generate.ts and commit what it writes.\n${problems.map((p) => `- ${p}`).join("\n")}`);
      return 1;
    }
    console.log(`The generated tool files are current.\n${plan.notes.map((n) => `- ${n}`).join("\n")}`);
    return 0;
  }
  const { written, deleted } = writePlan(root, plan);
  const lines = [...plan.notes.map((n) => `- ${n}`)];
  lines.push(written.length ? `Wrote ${written.length} files: ${written.join(", ")}.` : "Every generated file was already current.");
  if (deleted.length) lines.push(`Deleted ${deleted.length} files that are no longer generated: ${deleted.join(", ")}.`);
  console.log(lines.join("\n"));
  return 0;
}

if (import.meta.main) process.exit(main(Bun.argv.slice(2)));
