// The tracker CLI. Run it as `bun chrysalis/scripts/tracker.ts <command> --app <app> --agent <agent> ...`.
// chrysalis/workflow/tracker.md describes the commands, the fields, and the rules for agents.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { run } from "./lib/proc";
import type { Adapter } from "./lib/tracker/adapter";
import { GitHubAdapter } from "./lib/tracker/github";
import { LocalAdapter } from "./lib/tracker/local";
import {
  COMMENT_TYPE_NAMES,
  GATE_NAMES,
  KINDS,
  LINK_FIELDS,
  RESERVED_APP,
  STATUS_NAMES,
  TrackerError,
  applyChange,
  checkAppName,
  now,
  parseRef,
  planClose,
  planComment,
  planCreate,
  planLink,
  planSet,
} from "./lib/tracker/rules";
import type { Issue, Kind, Status } from "./lib/tracker/rules";
import { checkTools } from "./lib/versions";
import type { Tool } from "./lib/versions";

const FACTORY_DIR = resolve(import.meta.dir, "..");

const USAGE = `Usage: bun chrysalis/scripts/tracker.ts <command> --app <app> --agent <agent> [options]

Commands:
  create --kind <kind> --title <title> --body-file <path or -> [--parent <ref>]
  show <ref>
  list [--status <status>] [--kind <kind>]
  comment <ref> --type <type> --body-file <path or ->
  set <ref> --status <status> [--gate <gate>]
  link <ref> --field <field> --value <value>
  close <ref> --status <done or cancelled>

Kinds: ${KINDS.join(", ")}
Comment types: ${COMMENT_TYPE_NAMES.join(", ")}
Gates: ${GATE_NAMES.join(", ")}
Link fields: ${LINK_FIELDS.join(", ")}

Output is JSON. Errors print {"error": "..."} on standard error and exit with code 1, or 2 for bad usage.
See chrysalis/workflow/tracker.md.`;

class UsageError extends Error {}

type Spec = { ref: boolean; required: string[]; optional: string[] };
const COMMANDS: Record<string, Spec> = {
  create: { ref: false, required: ["kind", "title", "body-file"], optional: ["parent"] },
  show: { ref: true, required: [], optional: [] },
  list: { ref: false, required: [], optional: ["status", "kind"] },
  comment: { ref: true, required: ["type", "body-file"], optional: [] },
  set: { ref: true, required: ["status"], optional: ["gate"] },
  link: { ref: true, required: ["field", "value"], optional: [] },
  close: { ref: true, required: ["status"], optional: [] },
};
const OPTIONS = ["app", "agent", "kind", "title", "body-file", "parent", "status", "gate", "type", "field", "value"] as const;

function knownAgents(): string[] {
  return readdirSync(join(FACTORY_DIR, "agents"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort();
}

/** The main worktree's root, found from git's common directory, so it works inside backlog/ too. */
async function repoRoot(): Promise<string> {
  const result = await run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (result.code !== 0) throw new TrackerError("Run the tracker inside a git repository.");
  const common = result.stdout.trim();
  if (!common.endsWith("/.git")) throw new TrackerError(`The tracker needs a repository with a working tree. git's directory is ${common}.`);
  return dirname(common);
}

type AppConfig = { type: "local" | "github"; repo?: string };

async function loadApp(root: string, app: string): Promise<AppConfig> {
  if (app === RESERVED_APP) {
    if (existsSync(join(root, "apps", RESERVED_APP))) {
      throw new TrackerError(`apps/${RESERVED_APP}/ exists, but "${RESERVED_APP}" is reserved for the factory's own tracker. Rename that app.`);
    }
    return { type: "local" };
  }
  const path = join(root, "apps", app, "app.yaml");
  if (!existsSync(path)) throw new TrackerError(`apps/${app}/app.yaml doesn't exist. Set up the app before using its tracker.`);
  let data: { tracker?: { type?: unknown; repo?: unknown } };
  try {
    data = (Bun.YAML.parse(await Bun.file(path).text()) ?? {}) as typeof data;
  } catch (error) {
    throw new TrackerError(`apps/${app}/app.yaml isn't valid YAML. ${(error as Error).message}`);
  }
  const type = data.tracker?.type ?? "local";
  if (type !== "local" && type !== "github") throw new TrackerError(`apps/${app}/app.yaml sets tracker.type to "${type}". Use local or github.`);
  const repo = data.tracker?.repo;
  if (repo !== undefined && typeof repo !== "string") throw new TrackerError(`apps/${app}/app.yaml: tracker.repo must be a string like owner/repo.`);
  return { type, repo };
}

async function readBody(path: string): Promise<string> {
  if (path === "-") return Bun.stdin.text();
  const file = Bun.file(resolve(process.cwd(), path));
  if (!(await file.exists())) throw new TrackerError(`The body file ${path} doesn't exist.`);
  return file.text();
}

async function getIssue(adapter: Adapter, ref: string, app: string): Promise<Issue> {
  const issue = await adapter.get(parseRef(ref, app));
  if (!issue) throw new TrackerError(`${ref} doesn't exist.`);
  return issue;
}

function issueJson(issue: Issue) {
  const out: Record<string, unknown> = {
    ref: issue.ref,
    app: issue.app,
    number: issue.number,
    kind: issue.kind,
    title: issue.title,
    status: issue.status,
    parent: issue.parent,
    spec: issue.spec,
    spec_sha: issue.spec_sha,
    red_sha: issue.red_sha,
    branch: issue.branch,
    pr: issue.pr,
    blocked_by: issue.blocked_by,
    blocks: issue.blocks,
    prior_status: issue.prior_status,
    location: issue.location,
    body: issue.body,
    comments: issue.comments,
  };
  if (issue.dropped_comments !== undefined) out.dropped_comments = issue.dropped_comments;
  return out;
}

async function main(argv: string[]): Promise<unknown> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "help") {
    console.log(USAGE);
    return undefined;
  }
  const spec = COMMANDS[command];
  if (!spec) throw new UsageError(`Unknown command "${command}".`);

  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: Object.fromEntries(OPTIONS.map((name) => [name, { type: "string" as const }])),
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  const values = parsed.values as Partial<Record<(typeof OPTIONS)[number], string>>;
  const positionals = parsed.positionals;
  for (const name of Object.keys(values)) {
    if (name !== "app" && name !== "agent" && !spec.required.includes(name) && !spec.optional.includes(name)) {
      throw new UsageError(`${command} doesn't take --${name}.`);
    }
  }
  for (const name of ["app", "agent", ...spec.required]) {
    if (values[name as keyof typeof values] === undefined) throw new UsageError(`${command} needs --${name}.`);
  }
  if (spec.ref ? positionals.length !== 1 : positionals.length !== 0) {
    throw new UsageError(spec.ref ? `${command} takes one issue reference, such as ${values.app}#12.` : `${command} takes no issue reference.`);
  }

  const app = values.app!;
  const agent = values.agent!;
  checkAppName(app);
  const agents = knownAgents();
  if (!agents.includes(agent)) throw new TrackerError(`Unknown agent "${agent}". Agents: ${agents.join(", ")}.`);

  const root = await repoRoot();
  const config = await loadApp(root, app);
  const tools: Tool[] = config.type === "github" ? ["bun", "git", "gh"] : ["bun", "git"];
  const problems = await checkTools(tools);
  if (problems.length) throw new TrackerError(problems.join(" "));
  const adapter: Adapter = config.type === "github" ? await GitHubAdapter.open(root, app, config.repo) : await LocalAdapter.open(root, app);
  const ref = positionals[0];

  switch (command) {
    case "create": {
      const parentRef = values.parent ?? null;
      const parent = parentRef ? await adapter.get(parseRef(parentRef, app)) : null;
      const body = await readBody(values["body-file"]!);
      const plan = planCreate(app, agent, { kind: values.kind!, title: values.title!, body, parent, parentRef });
      return issueJson(await adapter.create(plan, agent));
    }
    case "show":
      return issueJson(await getIssue(adapter, ref, app));
    case "list": {
      const status = values.status as Status | undefined;
      const kind = values.kind as Kind | undefined;
      if (status && !STATUS_NAMES.includes(status)) throw new TrackerError(`Unknown status "${status}". Statuses: ${STATUS_NAMES.join(", ")}.`);
      if (kind && !KINDS.includes(kind)) throw new TrackerError(`Unknown kind "${kind}". Kinds: ${KINDS.join(", ")}.`);
      const issues = (await adapter.list()).filter((i) => (!status || i.status === status) && (!kind || i.kind === kind));
      return issues.map((i) => ({ ref: i.ref, kind: i.kind, title: i.title, status: i.status, parent: i.parent, blocked_by: i.blocked_by, location: i.location }));
    }
    case "comment": {
      const issue = await getIssue(adapter, ref, app);
      const comment = planComment(issue, agent, values.type!, await readBody(values["body-file"]!));
      return issueJson(await adapter.comment(issue, { ...comment, at: now() }, agent));
    }
    case "set": {
      const issue = await getIssue(adapter, ref, app);
      const after = applyChange(issue, planSet(issue, agent, values.status!, values.gate ?? null));
      return issueJson(await adapter.update(issue, after, agent, `Set ${issue.ref} to ${after.status}`));
    }
    case "link": {
      const issue = await getIssue(adapter, ref, app);
      const after = applyChange(issue, planLink(issue, agent, values.field!, values.value!));
      return issueJson(await adapter.update(issue, after, agent, `Link ${values.field} on ${issue.ref}`));
    }
    case "close": {
      const issue = await getIssue(adapter, ref, app);
      const after = applyChange(issue, planClose(issue, agent, values.status!));
      return issueJson(await adapter.close(issue, after, agent));
    }
  }
  return undefined;
}

if (import.meta.main) {
  try {
    const result = await main(Bun.argv.slice(2));
    if (result !== undefined) console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const usage = error instanceof UsageError;
    const message = usage ? `${(error as Error).message} Run with --help for usage.` : error instanceof TrackerError ? error.message : `Unexpected error: ${(error as Error).stack ?? error}`;
    console.error(JSON.stringify({ error: message }));
    process.exit(usage ? 2 : 1);
  }
}
