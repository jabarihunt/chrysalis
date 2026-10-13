---
status: accepted
date: 2026-10-11
---

# 0005. PRD, ARD, feature briefs, and slice specs

Each app has a PRD and an ARD, which the human approves. Each feature has a feature brief that holds the cut. Each slice has a slice spec with Given/When/Then acceptance criteria. ADRs, a glossary, and contracts sit beside them.

The pipeline runs per slice, so gates, tests, and reviews need a document that covers exactly one slice. The ARD holds requirements that change rarely and that gates can check, such as security rules and performance budgets. Decisions go in ADRs rather than in a description of the current architecture, which would go stale because nobody updates it on every change.

## Considered options

- A PRD and an ARD alone. They cover the whole app, so a gate couldn't tell which part a given pull request must satisfy.
