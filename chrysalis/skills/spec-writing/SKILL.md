---
name: spec-writing
description: How to write slice specs, the PRD, and the ARD so that test agents, implementers, and reviewers all read them the same way. The spec writer reads it before drafting any of them.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/to-spec/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Writing from what is already settled instead of interviewing, choosing test seams, extensive user stories, and leaving out file paths.
    - repo: mattpocock/skills
      path: skills/engineering/triage/AGENT-BRIEF.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Behavior over procedure, wording that survives code changes, testable criteria, and explicit scope.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis slice specs. Questions go on the issue as comments, criteria use Given, When, and Then lines, and the spec check replaces publishing to a tracker.
---

# Spec writing

A spec is the contract for every agent after you. The test agent turns each criterion into a test, implementers build until those tests pass, and the gates check the code against the spec. Write it so they all read it the same way, and so it still reads that way a month from now.

You write from what's settled: the issue and its comments, the PRD, the ARD, the glossary, the ADRs, and the code. You never interview anyone. Whenever you'd have to guess, post a question instead.

## Find the seams first

A seam is a place where a test observes the app from outside, such as a page, a route, or a form action. Pick the seams before you write criteria, because each criterion names one.

- Prefer a seam the app already has over a new one.
- Prefer the highest seam that shows the outcome. A test at a page catches wiring bugs that a test at one function misses, and it keeps passing when the code underneath is refactored.
- Use as few seams as the slice allows. One is ideal.
- When the slice needs a new seam, propose it at the highest point you can, and list it under contract changes.

The Test seams section gives each seam one line on what a test there catches and one on what it misses. That tells the test agent and the reviewers where the gaps are.

## Write criteria a test can check

Each criterion becomes exactly one acceptance test, so each one needs a single observable outcome at its seam.

- Given: a concrete starting state, with the data a test must set up.
- When: one action by one actor.
- Then: what the actor observes at the seam, with exact values. Take each value from the request, the PRD, or the ARD. When none of them states the value, post a question.
- One outcome per criterion. When a Then line needs "and", split the criterion.
- Give each edge case and each error its own criterion.
- Describe what the user observes, and leave how the code produces it to the implementers.

Before:

> - Given a task
> - When the user sets a due date
> - Then the due date is saved correctly and shown

After:

> - Given a task "Pay rent" with no due date
> - When the user sets its due date to 2026-11-01 on the task page
> - Then the task page shows "Due Nov 1, 2026" under the title
> - Seam: the task page

The first version has no starting data, two outcomes, and the word "correctly", which no test can check.

## Keep the spec durable

The spec is frozen once the human approves it, and the code under it keeps changing.

- Name modules with glossary terms. File paths and line numbers go stale.
- Write code only for contract shapes: a table's columns, a route's input and output, or a shared type.
- Describe each contract change as its shape before and after.
- State what's out of scope, starting with what a reader would assume the slice includes. That list is what stops an implementer from building past the slice.

## Write the PRD and the ARD

Both come from the TPM's interview notes on the setup issue, and the human approves both.

- Write user stories from the user's side, in the template's form. List every story the notes support. Feature briefs and slice specs cite stories by number, so a missing story turns into a criterion nobody can trace later.
- Write goals the human can check, with the numbers the notes give.
- Write each ARD requirement so a gate can pass or fail it. "Pages load fast" can't be checked. "Dashboard pages respond in under 300 ms at the 95th percentile with 50 concurrent users" can.
- Give non-goals and constraints their own sections, so no agent has to infer them.

## Read it as the test agent will

After the [spec check](../../workflow/gates.md#spec-check) passes, read each criterion as the test agent will. When you can't say what its test sets up, what it does, and what it asserts, rewrite the criterion.
