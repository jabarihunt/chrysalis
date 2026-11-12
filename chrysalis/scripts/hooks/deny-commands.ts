// A PreToolUse hook that blocks the commands every agent is denied, which chrysalis/templates/agent.md
// lists. Kiro runs it from .kiro/hooks/, and Claude Code from .claude/settings.json. Both send the
// tool call as JSON on standard input, and both block the call when the hook exits with code 2.
// Its stderr tells the agent why. See factory ADR 0032.
import { deniedCommand } from "../lib/commands";

function branchOf(dir: string): string | null {
  const result = Bun.spawnSync(["git", "-C", dir, "branch", "--show-current"], { stdout: "pipe", stderr: "ignore" });
  const name = result.exitCode === 0 ? result.stdout.toString().trim() : "";
  return name || null;
}

/** The decision for one hook input: null to let the call run, or the reason to block it. */
export function decide(input: string, branch: (dir: string) => string | null = branchOf): string | null {
  let data: { cwd?: unknown; command?: unknown; tool_input?: { command?: unknown; cwd?: unknown } };
  try {
    data = JSON.parse(input);
  } catch {
    return "The Chrysalis command hook couldn't read its input as JSON, so it blocked the command to be safe.";
  }
  // Kiro and Claude Code put the command in tool_input. Cursor's own shell hook puts it at the top level.
  const command = data?.tool_input?.command ?? data?.command;
  // A tool call without a command, such as stopping a background process, runs nothing new.
  if (typeof command !== "string") return null;
  // Kiro sends the folder the command runs in as tool_input.cwd, which can differ from the session's.
  const folders = [data?.tool_input?.cwd, data?.cwd].filter((dir): dir is string => typeof dir === "string" && dir !== "");
  const cwd = folders[0] ?? process.cwd();
  return deniedCommand(command, { cwd, branchOf: branch });
}

if (import.meta.main) {
  let reason: string | null;
  try {
    reason = decide(await Bun.stdin.text());
  } catch (error) {
    reason = `The Chrysalis command hook failed, so it blocked the command to be safe: ${(error as Error).message}`;
  }
  if (reason) {
    console.error(reason);
    process.exit(2);
  }
}
