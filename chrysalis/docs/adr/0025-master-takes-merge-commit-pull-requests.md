---
status: accepted
date: 2026-10-14
---

# 0025. master changes only through pull requests merged with a merge commit

A GitHub ruleset named `protect-master` guards the default branch. It blocks deletion and force pushes, requires a pull request for every change, and allows only merge commits. It requires no approvals, because GitHub doesn't let anyone approve their own pull request, and the human is the only reviewer. Its bypass list is empty, so the rules bind the human and any agent running as the human.

A merge commit keeps every branch commit on `master`. Squash and rebase merges replace the branch commits with new ones. The tracker's `spec_sha` and `red_sha` would then name commits that never reach `master`, and a squash folds each commit's `Agent:` and `Issue:` trailers into one message.

`.github/rulesets/protect-master.json` holds the ruleset, so each copy can import it.

## Consequences

- The ruleset can't stop anything acting as the human's account from merging a pull request or deleting the ruleset. Tool permission rules deny agents `gh pr merge` and `gh api`, and the move to a bot account in Q-09 closes the rest. The tracker CLI's `pr-verdict` still calls `gh api` inside its own process to set the code review status, as 0026 describes.
- Required status checks wait until CI runs `check.ts`. The code review gate's `chrysalis/code-review` status, from 0026, can become a required check too.
- Rulesets on private repositories need GitHub Pro or Team.
