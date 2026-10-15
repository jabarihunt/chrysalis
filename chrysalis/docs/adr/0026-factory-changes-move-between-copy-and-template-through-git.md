---
status: proposed
date: 2026-10-14
---

# 0026. Factory changes move between a copy and the template through git

A copy starts as a clone of the template, pushed to a new repository, with the template kept as a second remote named `template`. The clone shares the template's history. Every factory change in a copy lands in its own pull request under ADR 0001, and ADR 0025 keeps that pull request's commits on `master`. Factory commits therefore stay apart from app commits and can move between the two repositories with plain git. The human runs the commands, because they fetch from and push to a second repository, and the maintainer's `git-write` shell group covers neither.

To bring template changes into a copy, the human merges `template/master` into a `factory/template-sync` branch, then opens and merges a pull request in the copy. Conflicts appear only in factory files the copy has changed.

To send a factory change back, the human branches from `template/master` and runs `git cherry-pick -x <merge>^1..<merge>^2`, where `<merge>` is the merge commit of the copy's factory pull request. That picks each commit the pull request added. Each commit keeps its trailers, and `-x` adds a line with the copy's commit SHA. The human pushes the branch to the template, or to a fork if they can't write to the template, and opens a pull request there. After it merges, the next sync brings the change back, and git usually merges it without a conflict because both sides hold the same change.

Nothing under `apps/` goes to the template, and neither does the copy's `backlog` branch.

## Considered options

- Copies made with GitHub's "Use this template" button. Their history is unrelated to the template's, so the first merge between them would conflict on every file either side had changed. The button still suits a copy that will never sync.
- Patches with `git format-patch` and `git am`. They work across unrelated histories, but git keeps no record of which template commits a copy already has.

## Consequences

- A ported commit's `Issue:` trailer names an issue in the copy's tracker. The pull request body in the template names the copy it came from.
- A clone of the template may hold a `template/backlog` branch. `git worktree add backlog backlog` would check it out with `template` as its upstream, which gives the copy the template's issues and a remote to push its own issues to. The tracker CLI therefore creates `backlog` as an orphan branch, as [the tracker guide](../../workflow/tracker.md#local-adapter) says.
