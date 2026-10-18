// Posts the code review gate's verdict on a GitHub pull request, as a comment and a commit status.
// Agents can't run gh, so the tracker CLI calls it for them. See factory ADR 0026.
import { run } from "../proc";
import { TrackerError, commentHeader, parseHeader, parsePrUrl } from "./rules";
import type { Verdict } from "./rules";

/** The commit status a GitHub rule can require before a merge. */
export const REVIEW_STATUS = "chrysalis/code-review";

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
