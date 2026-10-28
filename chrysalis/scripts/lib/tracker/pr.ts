// Opens and edits GitHub pull requests for the TPM, and posts the code review gate's verdict on them
// as a comment and a commit status. Agents can't run gh, so the tracker CLI calls it for them. Nothing
// here approves or merges a pull request. See factory ADRs 0026 and 0029.
import { run } from "../proc";
import { NOT_GITHUB_ORIGIN, parseRepoUrl } from "./github";
import { TrackerError, commentHeader, parseHeader, parsePrUrl } from "./rules";
import type { Verdict } from "./rules";

/** The commit status a GitHub rule can require before a merge. */
export const REVIEW_STATUS = "chrysalis/code-review";

/** Pull requests merge into the primary branch. */
export const BASE_BRANCH = "master";

type PrComment = { body: string; url?: string; viewerDidAuthor?: boolean };
type PrView = { state: string; headRefOid: string; url: string; comments?: PrComment[] };

async function gh(args: string[], input?: string): Promise<string> {
  const result = await run(["gh", ...args], { input });
  if (result.code !== 0) throw new TrackerError(`gh ${args.slice(0, 2).join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout;
}

/** The agent's newest verdict comment from the account gh is logged in as, with its body after the header. */
export function latestVerdictComment(comments: PrComment[], agent: string): { body: string; url: string | null } | null {
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]!;
    if (!comment.viewerDidAuthor) continue;
    const [first = "", ...rest] = comment.body.replace(/\r\n/g, "\n").split("\n");
    const header = parseHeader(first.trim());
    if (header?.type === "verdict" && header.agent === agent) return { body: rest.join("\n").trim(), url: comment.url ?? null };
  }
  return null;
}

export type PostedVerdict = { pr: string; commit: string; state: "success" | "failure"; comment_url: string; reused_comment: boolean };

/**
 * Checks that the pull request is open and that the verdict covers its head commit, then posts the
 * comment and sets the status. When the newest verdict comment from this agent already holds the
 * same verdict, as after a run that posted the comment but failed to set the status, it reuses that
 * comment instead of posting a second one.
 */
export async function postPrVerdict(prUrl: string, verdict: Verdict & { body: string }, agent: string, at: string): Promise<PostedVerdict> {
  const pr = parsePrUrl(prUrl);
  if (!pr) throw new TrackerError(`The pr field must be a GitHub pull request URL, such as https://github.com/owner/repo/pull/12. Got "${prUrl}".`);
  const view = JSON.parse(await gh(["pr", "view", String(pr.number), "--repo", pr.repo, "--json", "number,state,headRefOid,url,comments"])) as PrView;
  if (view.state !== "OPEN") throw new TrackerError(`${view.url} is ${view.state.toLowerCase()}, so it takes no verdict.`);
  if (!view.headRefOid.startsWith(verdict.commit)) {
    throw new TrackerError(`The verdict covers ${verdict.commit}, but the head of ${view.url} is ${view.headRefOid.slice(0, 7)}. Review the head commit, then post again.`);
  }

  const latest = latestVerdictComment(view.comments ?? [], agent);
  const reused = latest !== null && latest.body === verdict.body;
  let commentUrl: string;
  if (reused) {
    commentUrl = latest.url ?? view.url;
  } else {
    const text = `${commentHeader("verdict", agent, at)}\n\n${verdict.body}\n`;
    const out = (await gh(["pr", "comment", String(pr.number), "--repo", pr.repo, "--body-file", "-"], text)).trim();
    commentUrl = out.startsWith("https://") ? out : view.url;
  }

  const state = verdict.verdict === "pass" ? "success" : "failure";
  const description = verdict.verdict === "pass" ? "Code review passed" : "Code review blocked. See the verdict comment.";
  await gh([
    "api",
    `repos/${pr.repo}/statuses/${view.headRefOid}`,
    "--method",
    "POST",
    "-f",
    `state=${state}`,
    "-f",
    `context=${REVIEW_STATUS}`,
    "-f",
    `description=${description}`,
    "-f",
    `target_url=${commentUrl}`,
  ]);
  return { pr: view.url, commit: view.headRefOid, state, comment_url: commentUrl, reused_comment: reused };
}

async function revParse(root: string, ref: string): Promise<string | null> {
  const result = await run(["git", "rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: root });
  return result.code === 0 ? result.stdout.trim() : null;
}

/** The GitHub repository that origin points at, where the pull request opens. */
async function originRepo(root: string): Promise<string> {
  const origin = await run(["git", "remote", "get-url", "origin"], { cwd: root });
  if (origin.code !== 0) throw new TrackerError("This repository has no origin remote, so the CLI can't open a pull request.");
  const repo = parseRepoUrl(origin.stdout);
  if (!repo) throw new TrackerError(NOT_GITHUB_ORIGIN);
  return repo;
}

/**
 * The commit origin has for the branch, from this clone's remote-tracking ref. Refuses a branch this
 * clone doesn't have, one that was never pushed, and one whose local head differs from origin's, so
 * the pull request shows the work the agents committed.
 */
async function pushedHead(root: string, branch: string): Promise<string> {
  const local = await revParse(root, `refs/heads/${branch}`);
  if (!local) throw new TrackerError(`This clone has no branch ${branch}. Open the pull request from the clone where the work was committed.`);
  const remote = await revParse(root, `refs/remotes/origin/${branch}`);
  if (!remote) throw new TrackerError(`This clone has no origin/${branch}. Push the branch with git push -u origin ${branch}, then open the pull request.`);
  if (local !== remote) {
    throw new TrackerError(`${branch} is at ${local.slice(0, 7)}, but origin/${branch} is at ${remote.slice(0, 7)}. Push the branch, then open the pull request.`);
  }
  return remote;
}

export type OpenedPr = { pr: string; title: string; head: string; base: string; commit: string };

/** Opens a pull request from the pushed branch into master, and returns its URL. */
export async function openPr(root: string, branch: string, title: string, body: string): Promise<OpenedPr> {
  const repo = await originRepo(root);
  const commit = await pushedHead(root, branch);
  const out = await gh(["pr", "create", "--repo", repo, "--base", BASE_BRANCH, "--head", branch, "--title", title, "--body-file", "-"], `${body}\n`);
  const lines = out.split("\n").map((line) => line.trim()).reverse();
  const pr = lines.map(parsePrUrl).find((parsed) => parsed !== null);
  if (!pr) throw new TrackerError(`gh pr create printed no pull request URL: ${out.trim()}`);
  return { pr: pr.url, title, head: branch, base: BASE_BRANCH, commit };
}

/** Changes an open pull request's title, body, or both. */
export async function editPr(prUrl: string, change: { title?: string; body?: string }): Promise<{ pr: string; title: boolean; body: boolean }> {
  const pr = parsePrUrl(prUrl);
  if (!pr) throw new TrackerError(`The pr field must be a GitHub pull request URL, such as https://github.com/owner/repo/pull/12. Got "${prUrl}".`);
  const view = JSON.parse(await gh(["pr", "view", String(pr.number), "--repo", pr.repo, "--json", "state,url"])) as { state: string; url: string };
  if (view.state !== "OPEN") throw new TrackerError(`${view.url} is ${view.state.toLowerCase()}, so its title and body stay as they are.`);
  const args = ["pr", "edit", String(pr.number), "--repo", pr.repo];
  if (change.title !== undefined) args.push("--title", change.title);
  if (change.body !== undefined) args.push("--body-file", "-");
  await gh(args, change.body !== undefined ? `${change.body}\n` : undefined);
  return { pr: view.url, title: change.title !== undefined, body: change.body !== undefined };
}
