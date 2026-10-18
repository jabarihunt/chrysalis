---
name: diagnosing-bugs
description: How to find and fix the root cause of a bug, from a test that fails on the bug to a fix that removes the fault. The backend and frontend agents read it for bug briefs, and whenever a test fails for a reason they don't understand.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/diagnosing-bugs/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: A fast, reliable loop that fails on the bug before any theory, shrinking the case, ranked hypotheses that each predict something, changing one thing at a time, tagged debug logs, and the cleanup list.
    - repo: cursor/plugins
      path: pstack/skills/principle-fix-root-causes/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Fixing the first wrong decision rather than the place the symptom showed, asking whether the failing state is legitimate, and fixing every instance of the pattern.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis bug briefs. The test agent's regression test is the starting loop, the implementer leaves it unchanged, and questions go on the issue.
---

# Diagnosing bugs

Find the fault before you change any code. A fix placed where the symptom shows, without the cause, hides the bug and leaves it free to come back somewhere else.

Redact secrets in everything you show, including commands, output, and logs. Write `<REDACTED>` in place of each one.

## Get a loop that fails on this bug

Everything else depends on a command that fails on this bug and passes once it's fixed. For a bug brief, that's the test agent's regression test. When a test failed during a slice, it's that test. Before you read any code to form a theory:

1. Run the test, and confirm it fails with the symptom the issue describes, not a different failure nearby. The wrong failure leads to the wrong fix.
2. Run it a few more times, and confirm it fails the same way each time. For a bug that comes and goes, raise the failure rate until it fails most runs, such as by looping the trigger.
3. Run only that test, so each run takes seconds.

When the test can't reach the bug, for example because its seam sits above or below where the bug happens, post a `question` for the test agent that says why. Leave the regression test unchanged. When you can't make anything fail on the bug, stop, post a `question` that lists what you tried, and report blocked.

## Shrink the case

Once it fails, cut away what the failure doesn't need, one piece at a time: inputs, records, steps, and settings. Rerun after each cut, and keep only what makes it fail. Do this in a temporary test or script inside your write scope, and delete it at the end.

A small case leaves fewer places for the cause to hide.

## List hypotheses before testing one

Write three to five possible causes, most likely first. Each one must predict something you can check, in the form "If X is the cause, then changing Y makes the bug disappear." A cause that predicts nothing can't be tested, so sharpen it or drop it.

Starting with a single idea anchors you on the first plausible one. Put the ranked list in your report.

## Test one change at a time

Check each prediction with one change. Use the debugger when the stack has one. Otherwise, add logs at the points that tell your hypotheses apart, and tag each one with the issue reference, such as `[DEBUG-todo#14]`, so you can find and remove them all at the end. For a slowdown, measure first and compare the timings, because logs mislead about speed.

## Fix the cause, not the symptom

The symptom is where a wrong state became visible. The cause is the first place the code made a wrong decision. Keep asking why until the answer is a decision in the code, not a result of an earlier one.

Then ask whether the state that broke the code is one the app may legitimately be in.
- If it is, the code that broke on it is the cause, and handling the state there is the fix.
- If it isn't, a check where the code broke only hides the bug. Find what produced the state, and fix that.

Guards, retries, caught-and-ignored errors, clamped values, and default values are the usual ways a symptom fix hides a bug. When a fix needs a long comment to justify it, the fix is in the wrong place.

Look for the same mistake elsewhere. Fix the instances the regression test covers, and list every other one in your report with its file and line, so the TPM can open an issue for each.

When the cause shows that the cited spec is wrong, post a `question` and stop, as your agent file says.

## Clean up

You're done when each of these holds:

- The regression test passes, and so does the rest of the suite.
- A search for your debug tag finds nothing.
- Your temporary tests and scripts are deleted.
- The commit message and the report state which hypothesis was right.
