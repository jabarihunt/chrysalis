---
status: accepted
date: 2026-10-24
---

# 0028. Factory pull requests go through the code review gate

Every factory pull request goes through the code review gate, the same gate that app pull requests pass, on a model from a different family than the factory-maintainer's, as 0027 requires. The human may waive the gate for one factory pull request, and the factory-maintainer records the waiver as a `decision` comment on the issue, in the human's words.

A factory change alters every app the factory builds, and no other gate reviews the factory-maintainer's work. Before this decision, the factory's documents disagreed. The gates table listed the code review gate for everything, and 0027 said the gate reads the factory-maintainer's changes. But the factory-maintainer's steps and the tracker's factory flow skipped it, and 0026 said factory pull requests get no code review. In practice, each factory pull request got a review only when the human asked for one.

## Considered options

- Review a factory pull request only when the human asks. That was the practice before this decision, and it left the documents disagreeing about whether the gate applies.
- Let the tracker CLI refuse `ready-to-merge` on a factory issue without a code review pass. The CLI can't read a waiver yet. Once `check.ts` checks each gate's latest verdict, it can enforce the gate on the pull request itself.

## Consequences

- 0026 says the `protect-master` ruleset doesn't require the `chrysalis/code-review` status because factory pull requests get no code review. That reason no longer holds. A required status would still block a waived pull request, so the ruleset change waits for the CI work that makes `check.ts` a required check.
- Until the generated agent files pin each agent's model, the human starts each code review run in a session on the review class's model, from the factory-maintainer's brief.
- The factory-maintainer is the fix owner for every finding on a factory pull request.
