---
status: accepted
date: 2026-10-11
---

# 0011. Local tracker issues live on a backlog branch

The local tracker keeps its issue files on a branch named `backlog`, checked out as a git worktree at `backlog/` in the repository root. Every other branch ignores `backlog/`.

If issue files lived on code branches, a slice's status would exist only on that slice's branch until merge, and the copy on `master` would always lag. A separate branch keeps one current, committed record that doesn't change when a different code branch is checked out. It can be pushed with the rest of the repository once there's a remote.

## Considered options

- Issue files in `docs/backlog/` on every branch. Status would split across branches as described above.
- Issue files outside git. They'd be lost with the machine and invisible to anyone who clones the repository.
