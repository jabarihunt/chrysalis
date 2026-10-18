---
name: implement-slice
description: How an implementer builds its layer of a slice on top of the RED commit, from the first failing acceptance test to the report. The database, backend, and frontend agents read it before they write code.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/implement/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Building test-first at agreed seams, running the typecheck and single test files often and the full suite at the end, and committing to the current branch.
    - repo: cursor/plugins
      path: pstack/skills/principle-prove-it-works/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Checking the real result before reporting done, instead of a proxy such as "it compiles".
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for one layer of a Chrysalis slice. The gates review the work, so the implementer runs no code review of its own.
---

# Implement a slice

You build one layer of one slice. The test agent's RED commit is already on the branch, and its acceptance tests define done. The agent before you, if any, left its report in your brief. The agent after you builds on what you commit.

## Sort the acceptance tests first

Run the slice's acceptance tests and read each failure. Sort the tests into two groups:

- the tests your layer finishes, which must pass when you're done,
- the tests that also need a later layer, which may still fail.

A backend agent can finish a test whose seam is a route. A test whose seam is a page usually needs the frontend too. The database agent usually finishes none, because no acceptance test observes a table directly. Put the sort in your report, so the TPM and the next agent know what's left.

## Build in short, checked steps

Work through one behavior at a time with the tdd skill. Between steps, run the cheap checks often:

- the typecheck, after every few edits,
- the single test file you're working in, after every change,
- the slice's acceptance tests, after each behavior is done,
- the full suite once, at the end.

The stack profile gives the exact commands. A failure caught a minute after the edit that caused it takes a minute to fix. A failure found at the end could be anywhere.

## Commit when the code is green

Commit each time a behavior works and your unit tests pass. The acceptance tests that need a later layer may still fail.

## Stay inside the slice

You'll notice things outside the slice: a bug in nearby code, a function you'd rather restructure, a missing feature. Build only what the spec asks for. When something you noticed blocks the slice, post a `question`. When it doesn't, list it in your report under follow-ups, and the TPM decides what happens to it.

## Prove it before you report

Check the result itself, not a sign of it. "It compiles" and "the tests I wrote pass" are signs.

1. Run the typecheck, the unit tests, and the slice's acceptance tests, and keep each command's output for the report.
2. List the files each of your commits changed with `git show --name-only --format= <sha>`, and confirm every one is inside your write scope. The branch also holds the RED commit and other agents' commits, so check only your own.
3. Read the diff of your own commits once. Remove debug output, commented-out code, and anything the slice didn't need.
4. When your layer is something a person sees, start the app with the stack's run command, and load each page the slice changes.

You're done when each check passes and you can paste its output into the report.
