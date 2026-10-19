---
name: regression-testing
description: How to turn a bug report into one regression test that fails because of the bug and passes once it's fixed. The test agent reads it for bug issues.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/diagnosing-bugs/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: A test that goes red on this exact bug and asserts the user's symptom, a seam that runs the bug's real path, shrinking the case to what the failure needs, and treating a missing seam as a finding.
    - repo: cursor/plugins
      path: pstack/skills/tdd/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Encoding the intended behavior instead of the current one, confirming the test fails for the intended reason, making a flaky failure deterministic, and keeping the test focused on the bug.
    - repo: cursor/plugins
      path: pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Naming the correct and the broken end state, not mistaking a loading state or dialog on the way for the bug, reproducing twice from a fresh start, and never forcing the symptom into being.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis bug issues. The test agent writes the regression test before any fix, at a seam inside its own write scope, and the implementer leaves the test unchanged.
---

# Regression testing

A bug issue names a criterion that the app now breaks. You write one test that protects that criterion and fails because of the bug. The implementer uses the test to tell when the fault is gone, and it stays in the suite so the bug can't come back unseen. Follow the acceptance-testing skill for seams, setup, and assertions. This skill covers what's different about a bug.

## See the bug before you write the test

1. Read the issue: what happens, what should happen, the criterion it breaks, the steps, and the environment.
2. Name two end states. The correct one comes from the criterion's Then line, and the broken one from what the issue says happens. The test asserts the correct one.
3. Start the app with the stack's run command, follow the steps, and reach the point where the two states differ. A loading spinner or a confirmation dialog on the way isn't the bug. The bug is the end state that differs.
4. Do it again from a fresh start, with new data. A symptom you saw once may come from leftover data or timing.

When the bug doesn't appear after two careful tries, post a `question` for the human that lists the steps you ran and what you saw, and stop. A test for a bug you haven't seen can pass on a broken app and gives the implementer nothing to work from.

## Reach the bug without forcing it

Set up the Given the way a user or the stack's fixtures would. Don't write the broken state into the database, and don't call an internal function to produce it. A test that plants the bad state proves only that the code fails on planted data, not that a user can reach it.

The exception is data that really exists in that state, such as rows from before a migration. When the issue shows that, plant the same data with the stack's fixtures, and say so in your report.

## Pick a seam that runs the bug's real path

Start from the seam the criterion names. The test has to run the same path the bug takes when a user hits it.

- A seam above the fault is fine when the path passes through it. A page test can catch a server bug.
- A seam that skips part of the path isn't. When the bug is in how a page builds its request, a test that calls the route directly passes on a broken app.

When no test inside your write scope can reach the bug through its real path, that's a finding about the app, not a reason to test somewhere else. Post a `question` for the TPM that names the part of the path your tests can't reach, and stop.

## Shrink it to what the failure needs

Once the test fails, remove steps, data, and settings one at a time, and rerun after each cut. Keep only what makes it fail, and stop when removing anything else makes it pass. A small test points the implementer at the cause.

Shrink the setup around the path, never the path itself. Cutting the step that takes the real path turns the test into a test of something else.

## Assert the fix, not the symptom

- Assert the correct end state, with literals from the criterion. Don't assert that the broken value is absent, because `not.toHaveText("$0.00")` passes for every other wrong total.
- Assert on what the issue describes. When the issue says the total reads $0.00, read the total, not whether the page loaded.

## Make it fail on every run

The test must fail on every run while the bug is present. A test that fails only some of the time can pass after a fix that didn't work.

- Pin what varies. Use Playwright's clock for dates and fixed data for everything else, and wait for visible states instead of fixed delays.
- For a bug that comes and goes, run the test with Playwright's `--repeat-each` option, and raise its failure rate until it fails every run, such as by repeating the trigger inside the test. When you can't, post a `question` for the TPM with the failure rate, and stop.

## Keep the RED commit to the one test

- Commit only the regression test, plus any fixture it needs inside `tests/acceptance/`. Leave the other tests as they are.
- When the bug shows the same mistake could happen elsewhere, list the other places in your report instead of testing them in this commit. The TPM decides whether they get their own issues.

You're done when the test fails on its assertion on every run, the failure message shows the issue's symptom, and your report names the two end states, how many times you saw the bug, and any data you planted and why.
