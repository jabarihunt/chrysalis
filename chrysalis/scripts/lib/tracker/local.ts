// The local tracker. Issues are Markdown files on the backlog branch, checked out as a worktree at
// backlog/ in the repository root. See "Local adapter" in chrysalis/workflow/tracker.md.
import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { run } from "../proc";
import type { Adapter } from "./adapter";
import { KINDS, STATUS_NAMES, TrackerError, commentHeader, makeRef, parseHeader } from "./rules";
import type { Comment, CommentType, Fields, Issue, Kind, NewIssue, Status } from "./rules";
import { fieldLines, readFields, yamlScalar } from "./yaml-fields";

async function git(args: string[], cwd: string, input?: string): Promise<string> {
  const result = await run(["git", ...args], { cwd, input });
  if (result.code !== 0) throw new TrackerError(`git ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout;
}

async function refExists(ref: string, cwd: string): Promise<boolean> {
  return (await run(["git", "show-ref", "--verify", "--quiet", ref], { cwd })).code === 0;
}

/**
 * Checks out the backlog branch at <root>/backlog. It reuses an existing worktree, then a local
 * backlog branch, then origin's backlog branch. Otherwise it creates backlog as an orphan branch,
 * so it shares no history with the code and holds only issue files.
 */
export async function ensureBacklog(root: string): Promise<string> {
  const dir = join(root, "backlog");
  const findWorktree = async () => {
    const listing = await git(["worktree", "list", "--porcelain"], root);
    for (const entry of listing.split("\n\n")) {
      const lines = entry.split("\n");
      if (lines.includes("branch refs/heads/backlog")) return lines.find((l) => l.startsWith("worktree "))!.slice("worktree ".length);
    }
    return null;
  };
  let existing = await findWorktree();
  if (existing && !existsSync(existing)) {
    await git(["worktree", "prune"], root);
    existing = await findWorktree();
  }
  if (existing) {
    if (!existsSync(dir) || realpathSync(existing) !== realpathSync(dir)) {
      throw new TrackerError(`The backlog branch is checked out at ${existing}. The tracker needs it at ${dir}.`);
    }
    return dir;
  }
  if (existsSync(dir)) throw new TrackerError(`${dir} exists but isn't the backlog worktree. Move it aside and run the command again.`);
  if (await refExists("refs/heads/backlog", root)) {
    await git(["worktree", "add", "--quiet", "backlog", "backlog"], root);
  } else if (await refExists("refs/remotes/origin/backlog", root)) {
    await git(["worktree", "add", "--quiet", "--track", "-b", "backlog", "backlog", "origin/backlog"], root);
  } else {
    await git(["worktree", "add", "--quiet", "--orphan", "-b", "backlog", "backlog"], root);
  }
  return dir;
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  return slug || "issue";
}

const pad = (n: number) => String(n).padStart(4, "0");

type FileIssue = Fields & { kind: Kind; title: string; status: Status; body: string; comments: Comment[] };

export function formatIssueFile(issue: FileIssue): string {
  const lines = ["---", `kind: ${issue.kind}`, `title: ${yamlScalar(issue.title)}`, `status: ${issue.status}`, ...fieldLines(issue), "---", ""];
  if (issue.body) lines.push(issue.body, "");
  lines.push("## Comments");
  for (const c of issue.comments) lines.push("", `### ${commentHeader(c.type!, c.agent!, c.at)}`, "", c.body);
  return lines.join("\n") + "\n";
}

export function parseIssueFile(text: string, where: string): FileIssue {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new TrackerError(`${where} has no YAML frontmatter.`);
  let data: Record<string, unknown>;
  try {
    data = Bun.YAML.parse(match[1]) as Record<string, unknown>;
  } catch (error) {
    throw new TrackerError(`${where}: the frontmatter isn't valid YAML. ${(error as Error).message}`);
  }
  const kind = data.kind as Kind;
  const status = data.status as Status;
  if (!KINDS.includes(kind)) throw new TrackerError(`${where}: unknown kind "${data.kind}".`);
  if (!STATUS_NAMES.includes(status)) throw new TrackerError(`${where}: unknown status "${data.status}".`);
  if (typeof data.title !== "string" || !data.title) throw new TrackerError(`${where}: the title is missing.`);

  const lines = text.slice(match[0].length).split("\n");
  const start = lines.indexOf("## Comments");
  const body = (start < 0 ? lines : lines.slice(0, start)).join("\n").trim();
  const comments: Comment[] = [];
  let current: { header: ReturnType<typeof parseHeader>; lines: string[] } | null = null;
  const finish = () => {
    if (current?.header) comments.push({ ...current.header, body: current.lines.join("\n").trim() });
  };
  for (const line of start < 0 ? [] : lines.slice(start + 1)) {
    const header = line.startsWith("### ") ? parseHeader(line.slice(4)) : null;
    if (header) {
      finish();
      current = { header, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      throw new TrackerError(`${where}: text under "## Comments" comes before the first comment heading.`);
    }
  }
  finish();
  return { ...readFields(data, where), kind, title: data.title, status, body, comments };
}

export class LocalAdapter implements Adapter {
  private constructor(
    private readonly backlog: string,
    private readonly app: string,
  ) {}

  static async open(root: string, app: string): Promise<LocalAdapter> {
    return new LocalAdapter(await ensureBacklog(root), app);
  }

  private get appDir(): string {
    return join(this.backlog, this.app);
  }

  private files(): string[] {
    if (!existsSync(this.appDir)) return [];
    return readdirSync(this.appDir).filter((name) => /^\d{4,}-.+\.md$/.test(name));
  }

  private toIssue(file: string, data: FileIssue): Issue {
    const number = Number(file.split("-")[0]);
    return { ...data, ref: makeRef(this.app, number), app: this.app, number, location: `backlog/${this.app}/${file}` };
  }

  private async read(file: string): Promise<Issue> {
    const text = await Bun.file(join(this.appDir, file)).text();
    return this.toIssue(file, parseIssueFile(text, `backlog/${this.app}/${file}`));
  }

  async get(number: number): Promise<Issue | null> {
    const matches = this.files().filter((name) => Number(name.split("-")[0]) === number);
    if (matches.length > 1) throw new TrackerError(`More than one file holds ${makeRef(this.app, number)}: ${matches.join(", ")}.`);
    return matches.length ? this.read(matches[0]) : null;
  }

  async list(): Promise<Issue[]> {
    const issues = await Promise.all(this.files().map((file) => this.read(file)));
    return issues.sort((a, b) => a.number - b.number);
  }

  /** Writes the file and commits only that file. On a failed commit, it puts the old file back. */
  private async write(file: string, issue: FileIssue, subject: string, agent: string, ref: string): Promise<Issue> {
    mkdirSync(this.appDir, { recursive: true });
    const path = join(this.appDir, file);
    const previous = existsSync(path) ? await Bun.file(path).text() : null;
    await Bun.write(path, formatIssueFile(issue));
    const rel = `${this.app}/${file}`;
    try {
      await git(["add", "--", rel], this.backlog);
      await git(["commit", "--quiet", "-F", "-", "--", rel], this.backlog, `${subject}\n\nAgent: ${agent}\nIssue: ${ref}\n`);
    } catch (error) {
      if (previous === null) {
        await run(["git", "rm", "--quiet", "--cached", "--ignore-unmatch", "--", rel], { cwd: this.backlog });
        rmSync(path, { force: true });
      } else {
        await Bun.write(path, previous);
        await run(["git", "add", "--", rel], { cwd: this.backlog });
      }
      throw error;
    }
    return this.read(file);
  }

  async create(issue: NewIssue, agent: string): Promise<Issue> {
    const numbers = this.files().map((name) => Number(name.split("-")[0]));
    const number = Math.max(0, ...numbers) + 1;
    const ref = makeRef(this.app, number);
    const file = `${pad(number)}-${slugify(issue.title)}.md`;
    const data: FileIssue = { ...issue.fields, kind: issue.kind, title: issue.title, status: issue.status, body: issue.body, comments: [] };
    return this.write(file, data, `Create ${ref}: ${issue.title}`, agent, ref);
  }

  private fileOf(issue: Issue): string {
    return issue.location.split("/").pop()!;
  }

  async comment(issue: Issue, comment: { type: CommentType; body: string; at: string }, agent: string): Promise<Issue> {
    const data: FileIssue = { ...issue, comments: [...issue.comments, { ...comment, agent }] };
    return this.write(this.fileOf(issue), data, `Add a ${comment.type} comment to ${issue.ref}`, agent, issue.ref);
  }

  async update(_before: Issue, after: Issue, agent: string, summary: string): Promise<Issue> {
    return this.write(this.fileOf(after), after, summary, agent, after.ref);
  }

  async close(before: Issue, after: Issue, agent: string): Promise<Issue> {
    return this.update(before, after, agent, `Close ${after.ref} as ${after.status}`);
  }
}
