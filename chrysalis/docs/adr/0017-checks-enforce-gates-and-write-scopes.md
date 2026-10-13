---
status: accepted
date: 2026-10-11
---

# 0017. Checks enforce gates and write scopes

Prompts state the rules, and `chrysalis/scripts/check.ts` enforces the ones that matter most. It checks issue and spec links, frozen specs and acceptance tests, commit trailers, write scopes, and gate verdicts. A model can ignore a rule in a prompt. A failing check stops the work.

The checks run on demand and before every review. Once the repository is on GitHub, CI runs them on every pull request. Kilo has no shell-command hooks, so the checks run as scripts rather than as tool hooks.
