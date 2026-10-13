# Tracker

Each app has one tracker, named in its `app.yaml`. Agents reach every tracker through the same tracker CLI, so agent files and templates don't change when an app's tracker does.

## Choosing a tracker

- At app setup, the TPM asks the human which tracker the app uses. The default is `local`.
- The factory itself uses `local`.
- The supported trackers are `local` and `github`. The factory-maintainer adds others, such as Linear, as new adapters behind the same CLI.

## The tracker CLI

Phase 3 of the factory plan builds `bun chrysalis/scripts/tracker.ts`. Every command takes `--app <app>` and `--agent <agent name>`. Factory issues use `--app factory`. The CLI reads the app's `app.yaml` to pick the adapter and prints JSON.

| Command | Does | Who may run it |
|---|---|---|
| `create --kind <kind> --title <title> --body-file <path> [--parent <ref>]` | Creates an issue and prints its reference | TPM |
| `show <ref>` | Prints the issue's fields, body, and comments | Any agent |
| `list [--status <status>] [--kind <kind>]` | Lists issues | Any agent |
| `comment <ref> --type <type> --body-file <path>` | Adds a comment | Any agent |
| `set <ref> --status <status>` | Changes the status | TPM. Gate agents may set `blocked` and clear their own block. |
| `link <ref> --field <field> --value <value>` | Sets a field such as `spec`, `spec_sha`, `red_sha`, `branch`, or `pr` | TPM |
| `close <ref> --status <done or cancelled>` | Sets the final status and closes the issue | TPM |

The CLI has no command that opens, approves, or merges a pull request. No command deletes an issue or a comment.

## References

An issue reference is `<app>#<number>`, as in `todo#12` or `factory#3`. The number counts up from 1 within each app.

## Fields

| Field | Holds |
|---|---|
| `kind` | `request`, `setup`, `slice`, `small-change`, `bug`, or `docs` |
| `title` | A short name for the work |
| `status` | One of the statuses in [the pipeline](pipeline.md#statuses) |
| `parent` | The request issue, for slice issues |
| `spec` | The slice spec's path |
| `spec_sha` | The commit SHA of the approved spec |
| `red_sha` | The commit SHA of the RED commit that passed the RED review |
| `branch` | The work branch |
| `pr` | The pull request link, once the human opens it |
| `blocked_by` | The gate that blocked, while the status is `blocked` |
| `blocks` | The number of blocks per gate, such as `security: 1` |
| `prior_status` | The status to return to, while the status is `needs-human` |

## Comment types

Every comment starts with a header line in the form `<type> from <agent> at <ISO 8601 time>`.

| Type | Posted by | Holds |
|---|---|---|
| `report` | TPM, after each agent run | A summary of the agent's report |
| `question` | Any agent | One question and who should answer it |
| `answer` | The agent that answered, or the TPM relaying the human | The answer, quoting the question |
| `verdict` | Gate agents | A [gate verdict](../templates/gate-verdict.md) |
| `escalation` | TPM | An [escalation](../templates/escalation.md) |
| `decision` | TPM | A human decision or approval in the human's words, with any commit SHA it covers |
| `retro` | TPM, after merge | What blocked, what the human corrected, and what an agent got wrong |

## Local adapter

- Issues live on a branch named `backlog`, checked out as a git worktree at `backlog/` in the repository root. Every other branch ignores `backlog/`.
- The separate branch keeps issue status independent of the code branch that's checked out. If issue files lived on code branches, a slice's status would exist only on its own branch until merge.
- Each issue is one file at `backlog/<app>/NNNN-<slug>.md`, numbered from `0001` within each app.
- The file has YAML frontmatter with the fields above, then the body from its template, then a `## Comments` section. Each comment is a `###` heading with the comment's header line, followed by the comment.
- Each CLI write commits to `backlog` with `Agent:` and `Issue:` trailers.
- The CLI creates the `backlog` branch and its worktree the first time it runs.

```markdown
---
kind: slice
title: Set a due date on a task
status: red
parent: todo#4
spec: apps/todo/docs/features/due-dates/slices/01-set-due-date.md
spec_sha: 3f2a9c1
red_sha: 8d41e07
branch: todo/due-dates-01
pr: none
blocked_by: none
blocks: {}
prior_status: none
---

## Comments

### report from tpm at 2026-10-12T15:04:00Z

The test agent committed five failing acceptance tests, one per criterion, in 8d41e07. The RED review passed.
```

## GitHub adapter

- The adapter uses the `gh` CLI, logged in as the human. Sub-issues need `gh` 2.94 or later.
- Issues live in the repository named in `app.yaml` under `tracker.repo`. The default is the `origin` remote of this repository.
- Labels carry the app, kind, and status, as in `app:todo`, `kind:slice`, and `status:red`. `set` swaps the status label.
- The other fields live in a YAML block at the top of the issue body, and the CLI rewrites that block on `link`.
- Slice issues are native sub-issues of their request issue.
- `close` closes the issue as completed for `done` and as not planned for `cancelled`.
