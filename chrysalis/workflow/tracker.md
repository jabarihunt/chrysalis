# Tracker

Each app has one tracker, named in its `app.yaml`. Agents reach every tracker through the same tracker CLI, so agent files and templates don't change when an app's tracker does.

## Choosing a tracker

- At app setup, the TPM asks the human which tracker the app uses. The default is `local`.
- The factory itself uses `local`.
- The supported trackers are `local` and `github`. The factory-maintainer adds others, such as Linear, as new adapters behind the same CLI.

## The tracker CLI

`bun chrysalis/scripts/tracker.ts` is the tracker CLI. Every command takes `--app <app>` and `--agent <agent name>`. The CLI reads the app's `app.yaml` to pick the adapter and prints JSON on standard output. On an error, it prints `{"error": "..."}` on standard error and exits with code 1, or with code 2 for bad usage. `--body-file -` reads the body from standard input, so agents with no write scope, such as the TPM and the gate agents, can create issues and post comments without writing a file.

When it starts, the CLI checks the tool versions that [the README](../../README.md#requirements) lists. It checks `gh` for the GitHub tracker, and for `pr-verdict` whatever the tracker.

| Command | Does | Who may run it |
|---|---|---|
| `create --kind <kind> --title <title> --body-file <path or -> [--parent <ref>]` | Creates an issue and prints it | TPM |
| `show <ref>` | Prints the issue's fields, body, and comments | Any agent |
| `list [--status <status>] [--kind <kind>]` | Lists issues | Any agent |
| `comment <ref> --type <type> --body-file <path or ->` | Adds a comment | Any agent, for the types in [Comment types](#comment-types) |
| `set <ref> --status <status> [--gate <gate>]` | Changes the status | TPM. A gate agent sets `blocked` with `--gate`, and clears its own block. See [Status rules](#status-rules). |
| `link <ref> --field <field> --value <value>` | Sets `spec`, `spec_sha`, `red_sha`, `branch`, or `pr`. `--value none` clears the field. | TPM |
| `close <ref> --status <done or cancelled>` | Sets the final status and closes the issue | TPM |
| `pr-verdict <ref> --body-file <path or ->` | Posts the code review verdict on the issue's pull request and sets its commit status. See [Code review verdicts](#code-review-verdicts). | Code review agent |

The CLI checks the last column against `--agent`. Its one pull request command, `pr-verdict`, only comments and sets a commit status. It has no command that opens, approves, or merges a pull request, and no command deletes an issue or a comment.

## The factory app

- `factory` is a reserved app name for the factory's own issues. The CLI always uses the local tracker for it and reads no `app.yaml`.
- App setup refuses an app named `factory`, and the CLI stops if `apps/factory/` exists.
- Factory issues have kind `factory`, which no other app uses. They start at `approved`, and the factory-maintainer moves them through `implementing`, `ready-for-pr`, `code-review`, and `ready-to-merge` to `done`. A block from the code review gate holds them at `blocked` until the gate passes, and a waiver from the human skips `code-review`, as [the code review gate](gates.md#code-review) says. [The pipeline's statuses](pipeline.md#statuses) list every status they can hold.
- For factory issues, the factory-maintainer runs every command and posts every comment type that this file gives the TPM.
- Open questions are factory issues too. The 20 questions from before the tracker keep their IDs, Q-01 to Q-20, at the start of their titles. New questions get no ID. When a question is settled, record the answer in an ADR, post an `answer` comment that names the ADR, and close the issue as `done`.

## Status rules

The CLI enforces these rules, and it allows each status only for the kinds [the pipeline](pipeline.md#statuses) lists.

- `create` sets the first status from the kind: `intake` for a request, `criteria-review` for a small change, and `approved` for every other kind.
- A slice needs `--parent`, the request issue it belongs to. No other kind takes a parent.
- A gate agent sets `blocked` only while its gate runs, and names the gate with `--gate`. The CLI fills `blocked_by` and adds one to that gate's count in `blocks`. A gate that blocks again on a rerun, while its own block stands, sets `blocked` the same way, and its count goes up again. No other gate can set `blocked` while that block stands.
- Only the gate that blocked can clear the block. It clears it by setting the status in the last column below.

| Gate | Run by | Status while it runs, and after its block clears |
|---|---|---|
| `red-review` | Code review agent | `approved` |
| `security` | Security agent | `security-review` |
| `test` | Test agent | `test-review` |
| `code-review` | Code review agent | `code-review` |

- The TPM never sets `blocked` and never lifts a block. From `blocked`, it can only escalate.
- The TPM sets `code-review` only once the issue links a pull request. A repository with no remote is the exception, because no pull request can exist there.
- Setting `needs-human` saves the current status in `prior_status`. Leaving `needs-human` returns the issue to that status.
- `done` and `cancelled` come only from `close`. An issue that's `blocked` or `needs-human` can close as `cancelled` but not as `done`.
- A closed issue takes comments, such as the retro, but no other change.

## References

An issue reference is `<app>#<number>`, as in `todo#12` or `factory#3`. With the local tracker, the number counts up from 1 within each app. With the GitHub tracker, the number is the GitHub issue number, so it counts up across every app that shares the repository.

## Fields

| Field | Holds |
|---|---|
| `kind` | `request`, `setup`, `slice`, `small-change`, `bug`, or `docs`. Factory issues use `factory`. |
| `title` | A short name for the work, on one line |
| `status` | One of the statuses in [the pipeline](pipeline.md#statuses) |
| `parent` | The request issue, for slice issues |
| `spec` | The slice spec's path, relative to the repository root |
| `spec_sha` | The commit SHA of the approved spec |
| `red_sha` | The commit SHA of the RED commit that passed the RED review |
| `branch` | The work branch |
| `pr` | The pull request's GitHub URL, such as `https://github.com/owner/repo/pull/12`, once the human opens it. `link` refuses any other URL. |
| `blocked_by` | The gate that blocked, while the status is `blocked` |
| `blocks` | The number of blocks per gate, such as `security: 1` |
| `prior_status` | The status to return to, while the status is `needs-human` |

## Comment types

Every comment starts with a header line in the form `<type> from <agent> at <ISO 8601 time>`. The CLI writes the header, so the body you pass leaves it out. A body or comment can't contain a `## Comments` line or a line that looks like a comment header, because the local tracker's file format uses both.

| Type | Posted by | Holds |
|---|---|---|
| `report` | TPM, after each agent run | A summary of the agent's report. After a code review run, only a link to the verdict on the pull request. |
| `question` | Any agent | One question and who should answer it |
| `answer` | The agent that answered, or the TPM relaying the human | The answer, quoting the question |
| `verdict` | Gate agents | A [gate verdict](../templates/gate-verdict.md). The CLI refuses one without the template's `Gate:`, `Verdict:`, and `Commit:` lines, or from an agent that doesn't run that gate. Code review verdicts go on the pull request instead, as [Code review verdicts](#code-review-verdicts) describes. |
| `escalation` | TPM | An [escalation](../templates/escalation.md) |
| `decision` | TPM | A human decision or approval in the human's words, with any commit SHA it covers |
| `retro` | TPM, after merge | A [retro](../templates/retro.md): what blocked, what the human corrected, and what an agent got wrong. A code review block gets its cause in one sentence, the rule it missed, and a link to its verdict on the pull request, but none of its findings. |

## Code review verdicts

The code review gate posts its verdict on the pull request, and the issue keeps no copy. [Factory ADR 0026](../docs/adr/0026-code-review-verdicts-go-on-the-pull-request.md) explains why. `pr-verdict` posts it for the code review agent:

- It runs only while the code review gate runs, which means status `code-review` or the gate's own block, and only for a verdict with `Gate: code-review`.
- It reads the pull request from the issue's `pr` field. It refuses a pull request that isn't open, and a verdict whose `Commit:` line isn't the pull request's head commit.
- It posts the verdict as a pull request comment that starts with the same header line as an issue comment. Then it sets the `chrysalis/code-review` commit status on the head commit, `success` for a pass and `failure` for a block, linked to the comment.
- When the code review agent's newest verdict comment, posted from the account `gh` is logged in as, already holds the same verdict, it reuses that comment instead of posting another. A retry after a failed status call then adds no second comment.
- It prints the pull request, the commit, the status, `comment_url`, and `reused_comment`, and it changes nothing on the issue.

In a repository with a remote, `comment --type verdict` refuses a code review verdict. In a repository with no remote, an issue with no `pr` link takes the code review verdict as a `verdict` comment, the same way the other gates post theirs.

## Local adapter

- Issues live on a branch named `backlog`, checked out as a git worktree at `backlog/` in the repository root. Every other branch ignores `backlog/`.
- The separate branch keeps issue status independent of the code branch that's checked out. If issue files lived on code branches, a slice's status would exist only on its own branch until merge.
- Each issue is one file at `backlog/<app>/NNNN-<slug>.md`, numbered from `0001` within each app.
- The file has YAML frontmatter with the fields above, then the body from its template, then a `## Comments` section. Each comment is a `###` heading with the comment's header line, followed by the comment.
- Each CLI write commits only the issue's file to `backlog`, with `Agent:` and `Issue:` trailers. If the commit fails, the CLI puts the file back as it was.
- The CLI never pushes. The human pushes `backlog` when they want it on the remote.
- The CLI creates the `backlog` branch and its worktree the first time it runs. If `origin` has a `backlog` branch, the CLI checks it out. Otherwise it creates `backlog` as an orphan branch, which holds only issue files.
- Each repository has its own backlog. The template's backlog holds the template's own factory issues, and a copy's backlog starts empty. See [factory ADR 0024](../docs/adr/0024-public-template-and-snapshot-copies.md).

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

## Slice

Spec: apps/todo/docs/features/due-dates/slices/01-set-due-date.md
Request: todo#4

A user can set a due date on a task.

## Comments

### report from tpm at 2026-10-12T15:04:00Z

The test agent committed five failing acceptance tests, one per criterion, in 8d41e07. The RED review passed.
```

## GitHub adapter

- The adapter uses the `gh` CLI, logged in as the human.
- Issues live in the repository named in `app.yaml` under `tracker.repo`. The default is the `origin` remote of this repository.
- Labels carry the app, kind, and status, as in `app:todo`, `kind:slice`, and `status:red`. `set` swaps the status label, and the CLI creates any label the repository lacks.
- The other fields live in a fenced YAML block at the top of the issue body, which starts with `# Tracker fields`. The CLI rewrites that block on `set` and `link`, and leaves the rest of the body alone. It refuses issues without the block, because the CLI didn't create them.
- Slice issues are native sub-issues of their request issue.
- `close` closes the issue as completed for `done` and as not planned for `cancelled`.
- `show` leaves out comments from accounts that can't write to the repository, and counts them in `dropped_comments`. Anyone can comment on a public repository's issues, and without this rule those comments would reach agents.
- A comment written in the browser has no header line, so `show` gives it a `type` and an `agent` of null.
- The adapter's tests run against a fake `gh` that records each call and keeps its issues in a scratch file. No test calls GitHub.
