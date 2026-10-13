---
status: accepted
date: 2026-10-11
---

# 0006. Humans approve each slice's acceptance criteria

The human approves every slice's acceptance criteria before the test agent writes tests. Every later gate checks code against the spec, so if the spec writer misreads the human, the factory builds the wrong thing and every gate still passes. The criteria list is short, and it's where a misreading shows.

Apps start with `spec_approval: criteria` in `app.yaml`. Once the spec check has proven itself over enough slices, apps move to `risk-based`, where the human approves only slices that change a contract, the schema, the PRD, the ARD, or an area the ARD marks security-sensitive. See Q-08 in `chrysalis/docs/planning/open-questions.md`.

## Considered options

- Agent approval only. It's the fastest, but a misreading surfaces only at the pull request.
- Human approval of every full spec. It's the safest, but specs are written for agents and take longer to read than the criteria.
