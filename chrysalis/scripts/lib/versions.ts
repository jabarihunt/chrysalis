// Minimum tool versions for the factory scripts. The README's requirements list shows the same
// versions, and a test keeps the two in step.
import { run } from "./proc";

export const MINIMUM = {
  bun: "1.2.21", // The first release with Bun.YAML.parse.
  git: "2.42.0", // The first release with git worktree add --orphan.
  gh: "2.94.0", // The first release with gh issue create --parent, for sub-issues.
} as const;

export type Tool = keyof typeof MINIMUM;

/** Reads the first version number in a tool's --version output, such as "git version 2.39.3 (Apple Git-146)". */
export function parseVersion(text: string): number[] | null {
  const match = text.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : null;
}

export function atLeast(found: number[], minimum: string): boolean {
  const min = parseVersion(minimum);
  if (!min) throw new Error(`Bad minimum version: ${minimum}`);
  for (let i = 0; i < 3; i++) {
    if (found[i] !== min[i]) return found[i] > min[i];
  }
  return true;
}

async function versionText(tool: Tool): Promise<string | null> {
  if (tool === "bun") return Bun.version;
  const result = await run([tool, "--version"]);
  return result.code === 0 ? result.stdout : null;
}

/** Returns one message for each tool that is missing or older than its minimum. */
export async function checkTools(tools: Tool[]): Promise<string[]> {
  const problems: string[] = [];
  for (const tool of tools) {
    const text = await versionText(tool);
    const found = text ? parseVersion(text) : null;
    if (!found) {
      problems.push(`${tool} ${MINIMUM[tool]} or later is required, and ${tool} wasn't found.`);
    } else if (!atLeast(found, MINIMUM[tool])) {
      problems.push(`${tool} ${MINIMUM[tool]} or later is required. Found ${found.join(".")}.`);
    }
  }
  return problems;
}
