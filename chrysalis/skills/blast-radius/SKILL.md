---
name: blast-radius
description: How to find what a change could break outside its own diff, and prove the fact that makes it safe by running real code. The database agent reads it before a schema change, and the security agent reads it during the security gate.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/blast-radius/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Looking past the callers a search finds, the one fact a change is safe because of, the ladder of evidence, looking where search stops, and the shape of the write-up.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the database and security agents. Proofs use only the files and commands each agent's scope allows, and the write-up goes in a report or a verdict.
---

# Blast radius

Find what a change breaks outside its own diff, before it merges. Listing the callers isn't the job, because a search finds those in a second. The job is the breakage a search doesn't show.

A write-up that sounds right reads the same whether or not it's true. So find the fact the change's safety depends on, and prove it by running code.

## Find the fact the change is safe because of

1. Read the change: the diff, and what the app now does differently, including what the diff doesn't spell out. A new non-null column changes every insert that leaves it out, even inserts the diff never touches.
2. Name the one fact that makes it safe. A risky-looking change usually rests on one fact, such as "no existing row has a null email" or "only the owner's session can reach this action". Prove that fact and most of the risks clear together. Put your effort into that fact instead of a long list of things that might go wrong.
3. Look where a search stops:
   - data in the database that the code doesn't show, such as old rows, nulls, and duplicates,
   - the shape of data other code reads, such as a JSON reply, a column, or a cookie,
   - code that reads the same data without importing your module, such as a scheduled job or another app,
   - the library's own source, at the version the lockfile pins,
   - when code runs: on the server or in the browser, on every request or once at startup.
4. For each risk, say how likely it is and what it costs if it happens. Keep the risks you confirmed apart from the ones you checked and cleared.

## Prove the fact

Get each fact as far down this ladder as you can, and say which step it reached:

1. Claimed. You stated it, and nothing backs it.
2. Cited. You named the real file and line, or the line in the library's source.
3. Reasoned. You traced the failing case step by step, and showed it can't happen.
4. Run. A test, a migration, or a query ran the real code and would have failed if the fact were false.
5. Reproduced. You showed it in the running app.

Run the proof with what your agent file allows. The database agent can run a migration against the slice's database twice, query existing rows, and write a test within its scope. The security agent writes no files, so it uses the stack's commands and the running app. When no allowed command can prove the fact, write "unproven" and name the check that would prove it.

## Write it up

The database agent puts this in its report. The security agent puts it in the verdict's findings.

- What the change does, including the part that isn't obvious.
- The fact it's safe because of, the step of the ladder it reached, and the proof, or "unproven".
- Each confirmed risk, with how it breaks, the file and line, how likely and how costly it is, and how to check it.
- What you checked and cleared, and why each one is fine.
- The cheapest test that would catch the real failure.
