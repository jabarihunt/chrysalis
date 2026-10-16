// A fake gh for the GitHub adapter's tests. It keeps one repository's labels and issues in the JSON
// file named by FAKE_GH_STATE, appends each call's arguments to FAKE_GH_LOG, and supports only the gh
// commands the adapter runs. No call reaches GitHub.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

export type FakeComment = { author: { login: string }; authorAssociation: string; viewerDidAuthor: boolean; body: string; createdAt: string };
export type FakeIssue = {
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
  stateReason: string;
  labels: string[];
  comments: FakeComment[];
  parent: number | null;
};
export type FakeState = { viewer: string; labels: string[]; next: number; issues: FakeIssue[] };

export function emptyState(): FakeState {
  return { viewer: "owner", labels: [], next: 1, issues: [] };
}

function parse(args: string[]) {
  const words: string[] = [];
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      (flags[args[i].slice(2)] ??= []).push(args[i + 1]);
      i++;
    } else {
      words.push(args[i]);
    }
  }
  return { words, flags, one: (name: string) => flags[name]?.[0] };
}

function main(): number {
  const args = process.argv.slice(2);
  if (process.env.FAKE_GH_LOG) appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + "\n");
  if (args[0] === "--version") {
    console.log(`gh version ${process.env.FAKE_GH_VERSION ?? "2.102.0"} (2026-09-30)`);
    return 0;
  }
  const statePath = process.env.FAKE_GH_STATE!;
  const state: FakeState = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : emptyState();
  const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
  const { words, flags, one } = parse(args);
  const fail = (message: string) => {
    console.error(message);
    return 1;
  };
  const stdin = () => readFileSync(0, "utf8");
  const repo = one("repo");
  if (!repo) return fail("fake gh: every call needs --repo");
  const url = (n: number) => `https://github.com/${repo}/issues/${n}`;
  const find = (n: string) => state.issues.find((i) => i.number === Number(n));
  const missingLabel = (names: string[]) => names.find((l) => !state.labels.includes(l));
  const view = (issue: FakeIssue, fields: string[]) =>
    Object.fromEntries(
      fields.map((f) => {
        if (f === "labels") return [f, issue.labels.map((name) => ({ name }))];
        if (f === "url") return [f, url(issue.number)];
        return [f, issue[f as keyof FakeIssue]];
      }),
    );

  const [group, command, target] = words;
  if (group === "label" && command === "list") {
    console.log(JSON.stringify(state.labels.map((name) => ({ name }))));
    return 0;
  }
  if (group === "label" && command === "create") {
    if (state.labels.includes(target)) return fail(`label with name "${target}" already exists; use \`--force\` to update its color and description`);
    state.labels.push(target);
    save();
    return 0;
  }
  if (group !== "issue") return fail(`fake gh: unsupported command ${words.join(" ")}`);

  if (command === "create") {
    const labels = flags.label ?? [];
    const missing = missingLabel(labels);
    if (missing) return fail(`could not add label: '${missing}' not found`);
    const parent = one("parent") ? Number(one("parent")) : null;
    if (parent !== null && !find(String(parent))) return fail(`parent issue #${parent} not found`);
    const issue: FakeIssue = { number: state.next++, title: one("title")!, body: stdin(), state: "OPEN", stateReason: "", labels, comments: [], parent };
    state.issues.push(issue);
    save();
    console.log(url(issue.number));
    return 0;
  }
  if (command === "list") {
    const labels = flags.label ?? [];
    const fields = one("json")!.split(",");
    const matches = state.issues.filter((i) => labels.every((l) => i.labels.includes(l)));
    console.log(JSON.stringify(matches.map((i) => view(i, fields))));
    return 0;
  }
  const issue = find(target);
  if (!issue) return fail(`GraphQL: Could not resolve to an issue or pull request with the number of ${target}. (repository.issue)`);
  if (command === "view") {
    console.log(JSON.stringify(view(issue, one("json")!.split(","))));
    return 0;
  }
  if (command === "comment") {
    issue.comments.push({ author: { login: state.viewer }, authorAssociation: "OWNER", viewerDidAuthor: true, body: stdin(), createdAt: new Date().toISOString() });
    save();
    return 0;
  }
  if (command === "edit") {
    const added = flags["add-label"] ?? [];
    const missing = missingLabel(added);
    if (missing) return fail(`could not add label: '${missing}' not found`);
    issue.labels = issue.labels.filter((l) => !(flags["remove-label"] ?? []).includes(l)).concat(added);
    if (one("body-file") === "-") issue.body = stdin();
    save();
    return 0;
  }
  if (command === "close") {
    issue.state = "CLOSED";
    issue.stateReason = one("reason") === "not planned" ? "NOT_PLANNED" : "COMPLETED";
    save();
    return 0;
  }
  return fail(`fake gh: unsupported command ${words.join(" ")}`);
}

if (import.meta.main) process.exit(main());
