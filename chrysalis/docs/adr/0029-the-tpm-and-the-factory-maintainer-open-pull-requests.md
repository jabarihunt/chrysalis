---
status: accepted
date: 2026-10-25
---

# 0029. The TPM and the factory-maintainer open pull requests

The TPM opens each app pull request, and the factory-maintainer opens each factory pull request, with its title and body, through the tracker CLI's `pr-open` command. `pr-edit` changes the title or body, and withdraws any code review pass, so the gate runs again on the title and body that merge. The human still merges every pull request into `master`, and still starts each code review run. The factory-maintainer still pushes only when the human asks, and opens the pull request right after that push. This supersedes 0004, which left opening pull requests to the human.

Under 0004, the human copied each PR body from chat or from the issue into GitHub. That step added nothing the human decides, since the body is the agent's work. Once, a body copied from chat came through cut off, and the code review blocked on it. The code review gate checks the body, so each body finding also meant an edit by hand.

0004's guards against agent merges stay. The CLI has commands that open and edit a pull request, but none that approves or merges one. Tool permission rules still deny agents `gh pr create`, `gh pr merge`, and `gh api`, so agents reach GitHub only through the CLI, which checks the agent, the issue's status, and the branch first. Before any unattended run, agents move to a bot account so that branch protection can block agent merges. See Q-09 in the factory's tracker.

## Considered options

- Keep 0004, and give the human a link that fills in GitHub's new pull request form from URL parameters. It removes the copy, but long bodies may pass URL length limits, and every body fix stays a manual edit.
- Let agents run `gh pr create` directly. The denial on `gh` keeps agents to commands the CLI checks, and lifting it for one command would mean tool permission rules that tell `gh pr create` apart from the rest of `gh` in every tool.

## Consequences

- Agents use the human's GitHub account, so GitHub shows the human as the author of every pull request an agent opens.
- 0026 says the code review gate runs after the human opens the pull request. The gate still runs after the pull request opens, now opened by the TPM. 0026's decision, that the verdict goes on the pull request, still holds.
- The issue's `ready-for-pr` status now means the branch is pushed and the TPM opens the pull request next, not that the pull request waits on the human.
- A PR body no longer goes on the issue for the human to copy, because the pull request holds it.
