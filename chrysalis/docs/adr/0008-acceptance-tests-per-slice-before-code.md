---
status: accepted
date: 2026-10-11
---

# 0008. Acceptance tests per slice, before code

For each slice, the test agent writes one Playwright acceptance test per criterion before any feature code exists. Implementers can't edit those tests. Implementers also write their own unit tests test-first.

Matt Pocock's TDD skill treats writing every test before implementation as an anti-pattern, because a large up-front suite tests imagined behavior. Scoping RED to one slice of at most eight criteria keeps the up-front suite small. `check.ts --red` confirms the facts that a script can check. The code review agent then reviews the tests, on a different model family from the test agent, so a weak test is caught before anyone writes code to pass it.

Playwright tests both pages and routes, so one runner serves every slice.
