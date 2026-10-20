// The tracker's issue model and the rules the CLI enforces. chrysalis/workflow/tracker.md and the
// Statuses section of chrysalis/workflow/pipeline.md describe the same rules for agents.

export const RESERVED_APP = "factory";

export const KINDS = ["request", "setup", "slice", "small-change", "bug", "docs", "factory"] as const;
export type Kind = (typeof KINDS)[number];

const APP_KINDS: Kind[] = ["request", "setup", "slice", "small-change", "bug", "docs"];
const ALL: Kind[] = [...KINDS];
const ALL_BUT_REQUEST: Kind[] = KINDS.filter((k) => k !== "request");

/** Each status and the kinds that may hold it. */
export const STATUSES = {
  intake: ["request"],
  "cut-review": ["request"],
  "in-progress": ["request"],
  "criteria-review": ["small-change"],
  approved: ["setup", "slice", "small-change", "bug", "docs", "factory"],
  red: ["slice", "small-change", "bug"],
  implementing: ["slice", "small-change", "bug", "factory"],
  "security-review": ["setup", "slice", "small-change", "bug"],
  "test-review": ["setup", "slice", "small-change", "bug"],
  docs: ["setup", "slice", "small-change", "bug", "docs"],
  "ready-for-pr": ALL_BUT_REQUEST,
  "code-review": ALL_BUT_REQUEST,
  "ready-to-merge": ALL_BUT_REQUEST,
  blocked: ALL_BUT_REQUEST,
  "needs-human": ALL,
  done: ALL,
  cancelled: ALL,
} as const satisfies Record<string, readonly Kind[]>;
export type Status = keyof typeof STATUSES;
export const STATUS_NAMES = Object.keys(STATUSES) as Status[];
export const FINAL_STATUSES: Status[] = ["done", "cancelled"];

export const INITIAL_STATUS: Record<Kind, Status> = {
  request: "intake",
  "small-change": "criteria-review",
  setup: "approved",
  slice: "approved",
  bug: "approved",
  docs: "approved",
  factory: "approved",
};

/** Each gate that can block, the agent that runs it, and the status the issue holds while it runs. */
export const GATES = {
  "red-review": { agent: "code-review", status: "approved" },
  security: { agent: "security", status: "security-review" },
  test: { agent: "test", status: "test-review" },
  "code-review": { agent: "code-review", status: "code-review" },
} as const satisfies Record<string, { agent: string; status: Status }>;
export type Gate = keyof typeof GATES;
export const GATE_NAMES = Object.keys(GATES) as Gate[];
const GATE_AGENTS = new Set<string>(Object.values(GATES).map((g) => g.agent));

/** Comment types and who may post them. "manager" is the TPM, or the factory-maintainer for factory issues. */
export const COMMENT_TYPES = {
  report: "manager",
  question: "any",
  answer: "any",
  verdict: "gate",
  escalation: "manager",
  decision: "manager",
  retro: "manager",
} as const;
export type CommentType = keyof typeof COMMENT_TYPES;
export const COMMENT_TYPE_NAMES = Object.keys(COMMENT_TYPES) as CommentType[];

export const LINK_FIELDS = ["spec", "spec_sha", "red_sha", "branch", "pr"] as const;
export type LinkField = (typeof LINK_FIELDS)[number];

export type Fields = {
  parent: string | null;
  spec: string | null;
  spec_sha: string | null;
  red_sha: string | null;
  branch: string | null;
  pr: string | null;
  blocked_by: Gate | null;
  blocks: Partial<Record<Gate, number>>;
  prior_status: Status | null;
};
export const FIELD_NAMES = ["parent", "spec", "spec_sha", "red_sha", "branch", "pr", "blocked_by", "blocks", "prior_status"] as const;

export type Comment = { type: CommentType | null; agent: string | null; at: string; body: string };

export type Issue = Fields & {
  ref: string;
  app: string;
  number: number;
  kind: Kind;
  title: string;
  status: Status;
  body: string;
  comments: Comment[];
  /** The file path for the local tracker, or the issue URL for GitHub. */
  location: string;
  /** GitHub only. Comments left out because their authors can't write to the repository. */
  dropped_comments?: number;
};

export function emptyFields(): Fields {
  return { parent: null, spec: null, spec_sha: null, red_sha: null, branch: null, pr: null, blocked_by: null, blocks: {}, prior_status: null };
}

export class TrackerError extends Error {}
const fail = (message: string): never => {
  throw new TrackerError(message);
};

/** Facts about the repository that the rules depend on. The CLI reads them from git. */
export type RepoFacts = {
  /** Whether git lists a remote. With one, a pull request can exist, so code review verdicts go on it. */
  hasRemote: boolean;
};
/** The strict default, for callers that don't pass the facts. */
const WITH_REMOTE: RepoFacts = { hasRemote: true };

// ---- Names and references ----

const APP_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function checkAppName(app: string): void {
  if (!APP_NAME.test(app)) fail(`App names use lowercase letters, numbers, and hyphens. Got "${app}".`);
}

export function makeRef(app: string, number: number): string {
  return `${app}#${number}`;
}

/** Reads a GitHub pull request URL, such as https://github.com/owner/repo/pull/12. */
export function parsePrUrl(url: string): { repo: string; number: number; url: string } | null {
  const match = url.trim().match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/([1-9][0-9]*)\/?$/);
  if (!match) return null;
  return { repo: match[1], number: Number(match[2]), url: `https://github.com/${match[1]}/pull/${match[2]}` };
}

export function parseRef(ref: string, app: string): number {
  const match = ref.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)#([1-9][0-9]*)$/);
  if (!match) return fail(`An issue reference looks like ${app}#12. Got "${ref}".`);
  if (match[1] !== app) return fail(`${ref} belongs to app "${match[1]}", but --app is "${app}".`);
  return Number(match[2]);
}

// ---- Who may do what ----

/** The agent that runs an app's pipeline: the TPM, or the factory-maintainer for the factory. */
export function managerOf(app: string): string {
  return app === RESERVED_APP ? "factory-maintainer" : "tpm";
}

function requireManager(app: string, agent: string, action: string): void {
  const manager = managerOf(app);
  if (agent !== manager) fail(`Only ${manager} may ${action} for app "${app}". This run is --agent ${agent}.`);
}

export function isGateAgent(agent: string): boolean {
  return GATE_AGENTS.has(agent);
}

// ---- Bodies ----

const HEADER = new RegExp(`^(${COMMENT_TYPE_NAMES.join("|")}) from ([a-z][a-z-]*) at (\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ)$`);

export function commentHeader(type: CommentType, agent: string, at: string): string {
  return `${type} from ${agent} at ${at}`;
}

export function parseHeader(line: string): { type: CommentType; agent: string; at: string } | null {
  const match = line.match(HEADER);
  return match ? { type: match[1] as CommentType, agent: match[2], at: match[3] } : null;
}

/** Rejects lines that the local tracker's file format reserves for its own structure. */
export function checkBody(body: string, what: string): void {
  for (const line of body.split("\n")) {
    const text = line.trim();
    if (text === "## Comments") fail(`The ${what} can't contain a "## Comments" line. The tracker uses it to start the comments.`);
    if (text.startsWith("### ") && parseHeader(text.slice(4))) {
      fail(`The ${what} can't contain a line that looks like a comment heading: "${text}".`);
    }
    if (parseHeader(text)) fail(`The ${what} can't contain a line that looks like a comment header: "${text}". The CLI writes the header.`);
  }
}

export function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ---- Plans for each command. Each returns the change to make, or throws a TrackerError. ----

export type NewIssue = { kind: Kind; title: string; status: Status; body: string; fields: Fields };

export function planCreate(
  app: string,
  agent: string,
  input: { kind: string; title: string; body: string; parent: Issue | null; parentRef: string | null },
): NewIssue {
  requireManager(app, agent, "create issues");
  const kind = input.kind as Kind;
  if (!KINDS.includes(kind)) fail(`Unknown kind "${input.kind}". Kinds: ${KINDS.join(", ")}.`);
  if (app === RESERVED_APP && kind !== "factory") fail(`Factory issues use kind "factory". Got "${kind}".`);
  if (app !== RESERVED_APP && !APP_KINDS.includes(kind)) fail(`Kind "factory" is only for --app ${RESERVED_APP}.`);
  const title = input.title.trim();
  if (!title) fail("The title can't be empty.");
  if (title.includes("\n")) fail("The title must be one line.");
  if (title.length > 200) fail("The title must be 200 characters or fewer.");
  checkBody(input.body, "body");
  const fields = emptyFields();
  if (kind === "slice") {
    if (!input.parentRef) fail("A slice issue needs --parent, the request issue it belongs to.");
    if (!input.parent) fail(`The parent ${input.parentRef} doesn't exist.`);
    if (input.parent!.kind !== "request") fail(`A slice's parent must be a request issue. ${input.parentRef} is a ${input.parent!.kind}.`);
    fields.parent = input.parentRef;
  } else if (input.parentRef) {
    fail(`Only slice issues have a parent. This one is a ${kind}.`);
  }
  return { kind, title, status: INITIAL_STATUS[kind], body: input.body.trim(), fields };
}

export type Change = { status?: Status; fields?: Partial<Fields> };

export function planSet(issue: Issue, agent: string, target: string, gate: string | null, repo: RepoFacts = WITH_REMOTE): Change {
  const to = target as Status;
  if (!STATUS_NAMES.includes(to)) fail(`Unknown status "${target}". Statuses: ${STATUS_NAMES.join(", ")}.`);
  if (FINAL_STATUSES.includes(issue.status)) fail(`${issue.ref} is closed as ${issue.status}.`);
  if (FINAL_STATUSES.includes(to)) fail(`Use close to set ${to}.`);
  if (!(STATUSES[to] as readonly Kind[]).includes(issue.kind)) fail(`A ${issue.kind} issue can't have status ${to}.`);
  // A gate that blocks again on a rerun, while its own block stands, sets blocked a second time.
  const reblock = to === "blocked" && issue.status === "blocked" && gate !== null && issue.blocked_by === gate;
  if (to === issue.status && !reblock) fail(`${issue.ref} already has status ${to}.`);
  const manager = managerOf(issue.app);

  if (agent !== manager && isGateAgent(agent)) {
    if (to === "blocked") {
      if (!gate) return fail("Setting blocked needs --gate, the gate that blocked.");
      const g = gate as Gate;
      if (!GATE_NAMES.includes(g)) fail(`Unknown gate "${gate}". Gates: ${GATE_NAMES.join(", ")}.`);
      if (GATES[g].agent !== agent) fail(`The ${g} gate is run by ${GATES[g].agent}, not ${agent}.`);
      const ownBlock = issue.status === "blocked" && issue.blocked_by === g;
      if (issue.status !== GATES[g].status && !ownBlock) {
        fail(`The ${g} gate blocks only while the status is ${GATES[g].status}, or while its own block stands. ${issue.ref} is ${issue.status}.`);
      }
      return { status: "blocked", fields: { blocked_by: g, blocks: { ...issue.blocks, [g]: (issue.blocks[g] ?? 0) + 1 } } };
    }
    if (gate) fail("--gate goes only with --status blocked.");
    const blockedBy = issue.blocked_by;
    if (issue.status === "blocked" && blockedBy && GATES[blockedBy].agent === agent && to === GATES[blockedBy].status) {
      return { status: to, fields: { blocked_by: null } };
    }
    return fail(
      issue.status === "blocked" && blockedBy
        ? `${agent} may only clear its own block. ${issue.ref} is blocked by the ${blockedBy} gate, which clears it by setting ${GATES[blockedBy].status}.`
        : `${agent} may only set blocked, or clear its own block.`,
    );
  }

  if (agent !== manager) return fail(`Only ${manager} changes statuses for app "${issue.app}", apart from gate agents' blocks.`);
  if (gate) fail("--gate is for gate agents.");
  if (to === "code-review" && !issue.pr && repo.hasRemote) {
    fail(`${issue.ref} links no pull request. Link it with link --field pr before you set code-review, so the code review verdict goes on the pull request.`);
  }
  if (issue.status === "needs-human") {
    if (to !== issue.prior_status) fail(`${issue.ref} returns from needs-human to its prior status, ${issue.prior_status}.`);
    return { status: to, fields: { prior_status: null } };
  }
  if (to === "needs-human") return { status: to, fields: { prior_status: issue.status } };
  if (to === "blocked") fail("Only a gate agent sets blocked.");
  if (issue.status === "blocked") {
    fail(`Only the ${issue.blocked_by} gate can clear its block on ${issue.ref}, by passing. To escalate, set needs-human.`);
  }
  return { status: to };
}

const SHA = /^[0-9a-f]{7,40}$/;
const BRANCH = /^[A-Za-z0-9._/-]+$/;

export function planLink(issue: Issue, agent: string, field: string, value: string): Change {
  requireManager(issue.app, agent, "link fields");
  if (FINAL_STATUSES.includes(issue.status)) fail(`${issue.ref} is closed as ${issue.status}.`);
  const name = field as LinkField;
  if (!LINK_FIELDS.includes(name)) fail(`link sets one of ${LINK_FIELDS.join(", ")}. Got "${field}".`);
  const v = value.trim();
  if (v === "none") return { fields: { [name]: null } };
  if (!v || v.includes("\n")) fail("The value must be one non-empty line, or none to clear the field.");
  if ((name === "spec_sha" || name === "red_sha") && !SHA.test(v)) fail(`${name} takes a commit SHA of 7 to 40 lowercase hex characters. Got "${v}".`);
  if (name === "branch" && !BRANCH.test(v)) fail(`"${v}" isn't a valid branch name.`);
  if (name === "spec" && (v.startsWith("/") || v.includes(".."))) fail(`spec takes a path relative to the repository root. Got "${v}".`);
  if (name === "pr") {
    const pr = parsePrUrl(v);
    if (!pr) return fail(`pr takes a GitHub pull request URL, such as https://github.com/owner/repo/pull/12. Got "${v}".`);
    return { fields: { pr: pr.url } };
  }
  return { fields: { [name]: v } };
}

export function planClose(issue: Issue, agent: string, target: string): Change {
  requireManager(issue.app, agent, "close issues");
  const to = target as Status;
  if (!FINAL_STATUSES.includes(to)) fail(`close takes --status done or --status cancelled. Got "${target}".`);
  if (FINAL_STATUSES.includes(issue.status)) fail(`${issue.ref} is already closed as ${issue.status}.`);
  if (to === "done" && (issue.status === "blocked" || issue.status === "needs-human")) {
    fail(`${issue.ref} is ${issue.status}, so it can't close as done. Close it as cancelled, or resolve it first.`);
  }
  return { status: to };
}

export function planComment(issue: Issue, agent: string, type: string, body: string, repo: RepoFacts = WITH_REMOTE): { type: CommentType; body: string } {
  const t = type as CommentType;
  if (!COMMENT_TYPE_NAMES.includes(t)) fail(`Unknown comment type "${type}". Types: ${COMMENT_TYPE_NAMES.join(", ")}.`);
  const who = COMMENT_TYPES[t];
  if (who === "manager") requireManager(issue.app, agent, `post ${t} comments`);
  if (who === "gate" && !isGateAgent(agent)) fail(`Only gate agents post verdict comments. This run is --agent ${agent}.`);
  if (!body.trim()) fail("The comment can't be empty.");
  checkBody(body, "comment");
  if (t === "verdict") {
    const verdict = parseVerdict(body);
    if (GATES[verdict.gate].agent !== agent) fail(`The ${verdict.gate} gate is run by ${GATES[verdict.gate].agent}, not ${agent}.`);
    // Code review results stay off the issue while a pull request can exist. See factory ADR 0026.
    if (verdict.gate === "code-review" && issue.pr) {
      fail(`${issue.ref} links the pull request ${issue.pr}, so post the code review verdict there with pr-verdict.`);
    }
    if (verdict.gate === "code-review" && repo.hasRemote) {
      fail(`This repository has a remote, so the code review verdict goes on the pull request with pr-verdict, not on ${issue.ref}. The TPM links the pull request with link --field pr.`);
    }
  }
  return { type: t, body: body.trim() };
}

// ---- Verdicts ----

export type Verdict = { gate: Gate; verdict: "pass" | "block"; commit: string };

/** Reads the Gate, Verdict, and Commit lines of a body written from the gate verdict template. */
export function parseVerdict(body: string): Verdict {
  const line = (name: string) => body.match(new RegExp(`^${name}:[ \\t]*(\\S.*?)[ \\t]*$`, "m"))?.[1] ?? null;
  const gate = line("Gate") as Gate | null;
  const verdict = line("Verdict");
  const commit = line("Commit");
  if (!gate || !GATE_NAMES.includes(gate)) fail(`A verdict needs a "Gate:" line naming one of ${GATE_NAMES.join(", ")}, as the gate verdict template shows.`);
  if (verdict !== "pass" && verdict !== "block") fail(`A verdict needs a "Verdict:" line that says pass or block.`);
  if (!commit || !SHA.test(commit)) fail(`A verdict needs a "Commit:" line with the SHA it checked, 7 to 40 lowercase hex characters.`);
  return { gate: gate!, verdict: verdict as "pass" | "block", commit: commit! };
}

/** The code review gate posts its verdict on the issue's pull request. See factory ADR 0026. */
export function planPrVerdict(issue: Issue, agent: string, body: string): Verdict & { body: string } {
  const gateAgent = GATES["code-review"].agent;
  if (agent !== gateAgent) fail(`Only ${gateAgent} posts code review verdicts. This run is --agent ${agent}.`);
  const running = issue.status === "code-review" || (issue.status === "blocked" && issue.blocked_by === "code-review");
  if (!running) fail(`${issue.ref} is ${issue.status}. The code review gate runs while the status is code-review, or while its own block stands.`);
  if (!issue.pr) {
    fail(`${issue.ref} has no pull request link. The TPM links it with link --field pr. Only a repository with no remote takes the code review verdict on the issue, with comment --type verdict.`);
  }
  if (!body.trim()) fail("The verdict can't be empty.");
  checkBody(body, "verdict");
  const verdict = parseVerdict(body);
  if (verdict.gate !== "code-review") fail(`pr-verdict posts only code review verdicts. The ${verdict.gate} gate posts on the issue with comment --type verdict.`);
  return { ...verdict, body: body.trim() };
}

export function applyChange(issue: Issue, change: Change): Issue {
  return { ...issue, ...(change.fields ?? {}), status: change.status ?? issue.status };
}
