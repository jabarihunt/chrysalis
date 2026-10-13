---
status: accepted
date: 2026-10-11
---

# 0004. Humans open and merge pull requests

Agents create work branches, commit with `Agent:` and `Issue:` trailers, and push work branches. Only humans open pull requests and merge into `master`, the primary branch.

For now, agents use the human's GitHub account through `gh`. GitHub can't tell agent actions from human actions under one account. Until agents move to their own account, only two things stop an agent from merging: the tracker CLI has no pull request commands, and tool permission rules deny them. Before any unattended run, agents move to a bot account so that branch protection can block agent merges. See Q-09 in `chrysalis/docs/planning/open-questions.md`.
