// A Claude Code PreToolUse hook that blocks file edits outside the editing agent's write scope.
// .claude/settings.json runs it before every Edit, Write, MultiEdit, and NotebookEdit call, in the main
// session and in every subagent. Claude Code names the subagent in agent_type. The hook reads the app
// from the checked-out branch, and the app's stack from its app.yaml, so it checks the exact scope.
// It exits with code 2 to block the edit, and its stderr tells the agent why. See factory ADR 0032.
import { isAbsolute, relative, resolve } from "node:path";
import { RESERVED_APP } from "../lib/tracker/rules";
import { appStack, loadFactory } from "../lib/factory";
import { describeScope, exactScope, inScope } from "../lib/scopes";

const ROOT = resolve(import.meta.dir, "..", "..", "..");
const APP_BRANCH = /^([a-z0-9]+(?:-[a-z0-9]+)*)\//;

function currentBranch(root: string): string | null {
  const result = Bun.spawnSync(["git", "-C", root, "branch", "--show-current"], { stdout: "pipe", stderr: "ignore" });
  const name = result.exitCode === 0 ? result.stdout.toString().trim() : "";
  return name || null;
}

/** The app a work branch belongs to, from its first segment, as in todo/due-dates-01. Null for factory branches. */
export function branchApp(branch: string | null): string | null {
  const app = branch?.match(APP_BRANCH)?.[1] ?? null;
  return app === RESERVED_APP ? null : app;
}

/**
 * The decision for one edit: null to allow it, or the reason to block it. path is absolute or
 * relative to root. agent is the agent_type Claude Code sent, or null in a main session without one.
 */
export function writeDecision(input: { root: string; path: string; agent: string | null; branch: string | null }): string | null {
  const rel = relative(input.root, resolve(input.root, input.path)).split("\\").join("/");
  // Claude Code's own rules govern files outside the repository.
  if (rel === "" || rel.startsWith("../") || rel === ".." || isAbsolute(rel)) return null;
  if (rel === "backlog" || rel.startsWith("backlog/")) {
    return "Only the tracker CLI writes backlog/. Change an issue with bun chrysalis/scripts/tracker.ts.";
  }
  // Without agent_type, the session is the TPM or the factory-maintainer, and check.ts holds their commits
  // to their scopes. Cursor also runs this hook, and may send no agent_type, so the hook stays out of its way.
  if (!input.agent) return null;
  const factory = loadFactory(input.root);
  const agent = factory.agents.find((a) => a.name === input.agent);
  if (!agent) {
    return `${input.agent} isn't a Chrysalis agent, so it may not edit files in this repository. Start the agent named on the brief's ROLE line.`;
  }
  const app = branchApp(input.branch);
  const scope = exactScope(agent.write_scope, app, app ? appStack(input.root, app, factory.stacks) : null);
  if (inScope(rel, scope)) return null;
  const where = app ? `app ${app}, from the branch ${input.branch}` : `the branch ${input.branch ?? "(none)"}, which names no app`;
  return `${rel} is outside the ${agent.name} agent's write scope for ${where}. It may edit: ${describeScope(scope)}. Ask on the issue if the work needs this file.`;
}

if (import.meta.main) {
  let reason: string | null;
  try {
    const data = JSON.parse(await Bun.stdin.text());
    const path = data?.tool_input?.file_path ?? data?.tool_input?.notebook_path;
    const agent = typeof data?.agent_type === "string" && data.agent_type ? data.agent_type : null;
    reason = typeof path === "string" && path ? writeDecision({ root: ROOT, path, agent, branch: currentBranch(ROOT) }) : null;
  } catch (error) {
    reason = `The Chrysalis write-scope hook failed, so it blocked the edit to be safe: ${(error as Error).message}`;
  }
  if (reason) {
    console.error(reason);
    process.exit(2);
  }
}
