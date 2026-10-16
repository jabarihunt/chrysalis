// The storage interface each tracker adapter implements. The rules in rules.ts decide what may
// change, and an adapter only reads and writes.
import type { CommentType, Issue, NewIssue } from "./rules";

export interface Adapter {
  create(issue: NewIssue, agent: string): Promise<Issue>;
  /** Returns null when the issue doesn't exist in this app. */
  get(number: number): Promise<Issue | null>;
  list(): Promise<Issue[]>;
  comment(issue: Issue, comment: { type: CommentType; body: string; at: string }, agent: string): Promise<Issue>;
  /** Writes a new status or new fields. `summary` describes the change, as in "Set todo#3 to red". */
  update(before: Issue, after: Issue, agent: string, summary: string): Promise<Issue>;
  /** Writes the final status and closes the issue. */
  close(before: Issue, after: Issue, agent: string): Promise<Issue>;
}
