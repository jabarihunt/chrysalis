// The GitHub tracker. Issues are GitHub issues reached through the gh CLI. Labels hold the app,
// kind, and status, and a YAML block at the top of the body holds the other fields. See "GitHub
// adapter" in chrysalis/workflow/tracker.md.
import { run } from "../proc";
import type { Adapter } from "./adapter";
import { KINDS, STATUS_NAMES, TrackerError, commentHeader, makeRef, parseHeader, parseRef } from "./rules";
import type { Comment, CommentType, Fields, Issue, Kind, NewIssue, Status } from "./rules";
import { fieldLines, readFields } from "./yaml-fields";

const FIELDS_OPEN = "```yaml\n";
const FIELDS_NOTE = "# Tracker fields. The tracker CLI rewrites this block.\n";
const FIELDS_CLOSE = "\n```";
/** Comment authors whose comments reach agents. Everyone else is left out of show. */
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const LABEL_STYLE = {
  app: { color: "1d76db", description: "Chrysalis tracker: the app" },
  kind: { color: "5319e7", description: "Chrysalis tracker: the issue kind" },
  status: { color: "fbca04", description: "Chrysalis tracker: the status" },
} as const;

type GhComment = { author?: { login?: string }; authorAssociation?: string; viewerDidAuthor?: boolean; body: string; createdAt: string };
type GhIssue = { number: number; title: string; body: string; state: string; labels: { name: string }[]; url: string; comments?: GhComment[] };

export function composeBody(fields: Fields, body: string): string {
  return `${FIELDS_OPEN}${FIELDS_NOTE}${fieldLines(fields).join("\n")}${FIELDS_CLOSE}\n${body ? `\n${body}\n` : ""}`;
}

export function splitBody(text: string, where: string): { fields: Fields; body: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith(FIELDS_OPEN + FIELDS_NOTE)) {
    throw new TrackerError(`${where} has no tracker fields block at the top of its body, so the tracker CLI didn't create it.`);
  }
  const end = normalized.indexOf(FIELDS_CLOSE, FIELDS_OPEN.length);
  if (end < 0) throw new TrackerError(`${where}: the tracker fields block isn't closed.`);
  let data: Record<string, unknown>;
  try {
    data = (Bun.YAML.parse(normalized.slice(FIELDS_OPEN.length, end)) ?? {}) as Record<string, unknown>;
  } catch (error) {
    throw new TrackerError(`${where}: the tracker fields block isn't valid YAML. ${(error as Error).message}`);
  }
  return { fields: readFields(data, where), body: normalized.slice(end + FIELDS_CLOSE.length).trim() };
}

/** Reads owner/repo from a GitHub remote URL in one of git's three forms for GitHub, and nothing else. */
export function parseRepoUrl(url: string): string | null {
  const match = url.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

export class GitHubAdapter implements Adapter {
  private labels: Set<string> | null = null;

  private constructor(
    private readonly repo: string,
    private readonly app: string,
  ) {}

  /** Uses tracker.repo from app.yaml, or else this repository's origin remote. */
  static async open(root: string, app: string, repoSetting: string | undefined): Promise<GitHubAdapter> {
    let repo = repoSetting;
    if (!repo) {
      const origin = await run(["git", "remote", "get-url", "origin"], { cwd: root });
      if (origin.code !== 0) throw new TrackerError(`app.yaml sets no tracker.repo, and this repository has no origin remote.`);
      repo = parseRepoUrl(origin.stdout) ?? undefined;
      if (!repo) throw new TrackerError(`origin isn't a GitHub repository: ${origin.stdout.trim()}. Set tracker.repo in app.yaml.`);
    }
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new TrackerError(`tracker.repo must look like owner/repo. Got "${repo}".`);
    return new GitHubAdapter(repo, app);
  }

  private async gh(args: string[], input?: string): Promise<string> {
    const result = await run(["gh", ...args], { input });
    if (result.code !== 0) throw new TrackerError(`gh ${args.slice(0, 2).join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
    return result.stdout;
  }

  private async ensureLabels(names: string[]): Promise<void> {
    if (!this.labels) {
      const listed = JSON.parse(await this.gh(["label", "list", "--repo", this.repo, "--limit", "1000", "--json", "name"])) as { name: string }[];
      this.labels = new Set(listed.map((l) => l.name));
    }
    for (const name of names) {
      if (this.labels.has(name)) continue;
      const style = LABEL_STYLE[name.split(":")[0] as keyof typeof LABEL_STYLE];
      await this.gh(["label", "create", name, "--repo", this.repo, "--color", style.color, "--description", style.description]);
      this.labels.add(name);
    }
  }

  private toIssue(gh: GhIssue): Issue | null {
    const names = gh.labels.map((l) => l.name);
    if (!names.includes(`app:${this.app}`)) return null;
    const where = `${this.repo}#${gh.number}`;
    const pick = (prefix: string) => {
      const found = names.filter((n) => n.startsWith(`${prefix}:`)).map((n) => n.slice(prefix.length + 1));
      if (found.length !== 1) throw new TrackerError(`${where} needs exactly one ${prefix}: label. It has ${found.length}.`);
      return found[0];
    };
    const kind = pick("kind") as Kind;
    const status = pick("status") as Status;
    if (!KINDS.includes(kind)) throw new TrackerError(`${where}: unknown kind "${kind}".`);
    if (!STATUS_NAMES.includes(status)) throw new TrackerError(`${where}: unknown status "${status}".`);
    const { fields, body } = splitBody(gh.body ?? "", where);
    const comments: Comment[] = [];
    let dropped = 0;
    for (const c of gh.comments ?? []) {
      if (!c.viewerDidAuthor && !TRUSTED.has(c.authorAssociation ?? "")) {
        dropped++;
        continue;
      }
      const text = c.body.replace(/\r\n/g, "\n");
      const [first, ...rest] = text.split("\n");
      const header = parseHeader(first.trim());
      comments.push(
        header
          ? { ...header, body: rest.join("\n").trim() }
          : { type: null, agent: null, at: c.createdAt.replace(/\.\d{3}Z$/, "Z"), body: text.trim() },
      );
    }
    const issue: Issue = { ...fields, ref: makeRef(this.app, gh.number), app: this.app, number: gh.number, kind, title: gh.title, status, body, comments, location: gh.url };
    if (gh.comments) issue.dropped_comments = dropped;
    return issue;
  }

  async get(number: number): Promise<Issue | null> {
    const result = await run(["gh", "issue", "view", String(number), "--repo", this.repo, "--json", "number,title,body,state,labels,url,comments"]);
    if (result.code !== 0) {
      if (/could not resolve|not found/i.test(result.stderr)) return null;
      throw new TrackerError(`gh issue view failed: ${result.stderr.trim()}`);
    }
    return this.toIssue(JSON.parse(result.stdout) as GhIssue);
  }

  private async getOrFail(number: number): Promise<Issue> {
    const issue = await this.get(number);
    if (!issue) throw new TrackerError(`${makeRef(this.app, number)} can't be read back from ${this.repo}.`);
    return issue;
  }

  async list(): Promise<Issue[]> {
    const out = await this.gh(["issue", "list", "--repo", this.repo, "--label", `app:${this.app}`, "--state", "all", "--limit", "1000", "--json", "number,title,body,state,labels,url"]);
    const issues = (JSON.parse(out) as GhIssue[]).map((gh) => this.toIssue(gh)).filter((i): i is Issue => i !== null);
    return issues.sort((a, b) => a.number - b.number);
  }

  async create(issue: NewIssue, _agent: string): Promise<Issue> {
    const labels = [`app:${this.app}`, `kind:${issue.kind}`, `status:${issue.status}`];
    await this.ensureLabels(labels);
    const args = ["issue", "create", "--repo", this.repo, "--title", issue.title, "--body-file", "-"];
    for (const label of labels) args.push("--label", label);
    if (issue.fields.parent) args.push("--parent", String(parseRef(issue.fields.parent, this.app)));
    const out = await this.gh(args, composeBody(issue.fields, issue.body));
    const match = out.trim().match(/\/issues\/(\d+)$/);
    if (!match) throw new TrackerError(`gh issue create didn't print an issue URL: ${out.trim()}`);
    return this.getOrFail(Number(match[1]));
  }

  async comment(issue: Issue, comment: { type: CommentType; body: string; at: string }, agent: string): Promise<Issue> {
    const text = `${commentHeader(comment.type, agent, comment.at)}\n\n${comment.body}\n`;
    await this.gh(["issue", "comment", String(issue.number), "--repo", this.repo, "--body-file", "-"], text);
    return this.getOrFail(issue.number);
  }

  async update(before: Issue, after: Issue, _agent: string, _summary: string): Promise<Issue> {
    const args = ["issue", "edit", String(after.number), "--repo", this.repo];
    let input: string | undefined;
    if (after.status !== before.status) {
      await this.ensureLabels([`status:${after.status}`]);
      args.push("--remove-label", `status:${before.status}`, "--add-label", `status:${after.status}`);
    }
    if (fieldLines(after).join("\n") !== fieldLines(before).join("\n")) {
      args.push("--body-file", "-");
      input = composeBody(after, before.body);
    }
    if (args.length > 5) await this.gh(args, input);
    return this.getOrFail(after.number);
  }

  async close(before: Issue, after: Issue, agent: string): Promise<Issue> {
    await this.update(before, after, agent, "");
    const reason = after.status === "done" ? "completed" : "not planned";
    await this.gh(["issue", "close", String(after.number), "--repo", this.repo, "--reason", reason]);
    return this.getOrFail(after.number);
  }
}
