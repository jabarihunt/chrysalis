// Tells the public template apart from a copy, by its origin remote. Factory ADR 0024 makes the
// template a repository where no app is built, and ADR 0033 keeps confirmed model IDs out of it.
import { run } from "./proc";
import { parseRepoUrl } from "./tracker/github";

export const TEMPLATE_REPO = "jabarihunt/chrysalis";

/** The owner/repo that origin points at on GitHub, or null with no GitHub origin. */
export async function originRepo(root: string): Promise<string | null> {
  const result = await run(["git", "remote", "get-url", "origin"], { cwd: root });
  return result.code === 0 ? parseRepoUrl(result.stdout) : null;
}

/** Whether a repository is the template. GitHub matches owner and repository names in any case. */
export async function isTemplate(root: string): Promise<boolean> {
  return (await originRepo(root))?.toLowerCase() === TEMPLATE_REPO;
}
