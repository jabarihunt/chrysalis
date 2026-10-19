---
status: accepted
date: 2026-10-18
---

# 0026. Code review verdicts go on the pull request

The code review gate runs after the human opens the pull request, so its verdict goes on the pull request, where the human reviews and merges. The tracker CLI's `pr-verdict` command posts the verdict as a comment on the issue's pull request, and that comment holds the whole review: both axes, the checks, and the findings that don't block. It also sets a commit status named `chrysalis/code-review` on the pull request's head commit, `success` for a pass and `failure` for a block. The issue holds no copy of the verdict and no summary of its findings. The RED review and the security and test gates run before a pull request exists, so their verdicts stay on the issue.

A code review verdict goes on the issue only in a repository with no remote, where no pull request can exist. With a remote, the CLI refuses a code review verdict on the issue, and it refuses the `code-review` status until the issue links a pull request. The `pr` field takes only GitHub pull request URLs.

Agents can't run `gh`, and every tool denies them `gh api` and `gh pr review`, so the CLI calls `gh` inside its own process. A pull request comment and a commit status need no approval rights. That matters because agents run as the human's account, as 0004 describes, and GitHub doesn't let a pull request's author approve it.

## Considered options

- A pull request review that approves or requests changes. GitHub refuses an approval from the pull request's author, and that's the human's account, which agents use.
- A copy on both the issue and the pull request. Two copies drift, and the human asked for code review results on the pull request only.
- A commit status alone. Its description holds 140 characters, too few for findings.

## Consequences

- `pr-verdict` needs `gh` whenever the issue links a GitHub pull request, whatever the app's tracker. An app on the local tracker needs `gh` for its code reviews too.
- After a code review run, the TPM's report comment links the verdict on the pull request and summarizes none of it. A retro links a code review block's verdict instead of restating its findings.
- Each run of `pr-verdict` sets the status again. When the code review agent's newest verdict comment already holds the same verdict, the CLI reuses that comment, so a retry after a failed status call posts no second comment.
- A new commit on the pull request has no `chrysalis/code-review` status until the gate reviews it.
- When `check.ts` checks each gate's latest verdict, it reads the code review gate's from the pull request.
- A GitHub rule can require `chrysalis/code-review` before a merge. The `protect-master` ruleset doesn't require it yet, because factory pull requests get no code review, and the rule would block them. Until agents move to a bot account under Q-09, the human's account sets the status, so the rule can't tell a status that an agent set from one the human set.
- 0004's account of the tracker CLI and 0025's consequences name `pr-verdict`, the CLI's one pull request command.
