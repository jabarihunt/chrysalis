---
name: code-review
description: How the code review agent judges acceptance tests in the RED review and the whole change at the code review gate, with the spec axis and the standards axis kept apart. The code review agent reads it before both reviews.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/code-review/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Pinning the range and checking that the diff isn't empty, the spec and standards axes kept apart and unranked, the three kinds of spec finding, documented standards overriding the smell list, skipping what tooling enforces, and the smell list itself.
    - repo: cursor/plugins
      path: pstack/skills/interrogate/references/rubric.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: The edge cases worth tracing, tracing an input to the line it breaks before calling it a bug, and spotting fixes that hide a symptom.
    - repo: cursor/plugins
      path: pstack/skills/interrogate/references/lead-judgment.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Dropping hypothetical findings, preferences, and findings that miss the surrounding code, accepting an empty review, and checking a correctness finding harder before dropping it.
    - repo: cursor/plugins
      path: pstack/skills/interrogate/references/reviewer-prompt.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Challenging the execution instead of the intent, and giving each finding its location and evidence.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the two Chrysalis reviews. One agent runs both axes in turn and posts a gate verdict, and the RED review judges tests with the acceptance-testing skill's two edits.
---

# Code review

You run two reviews of each slice. The RED review judges the acceptance tests before any code exists. The code review gate judges the whole change on the pull request, after the security and test gates pass. Your agent file lists the steps of each, and this skill says how to judge.

## Judge the work against what the human approved

The spec, or the issue body for a bug or a small change, is what the human approved. For a factory change, it's the factory issue's body and its `decision` comments, which record what the human approved in their words. Review whether the work does it, not whether it should. When you think the spec itself is wrong, post a `question` for the TPM, and keep reviewing against the spec as written.

A finding shows what the work breaks: a criterion, an ARD requirement, or a documented standard. A different approach you'd prefer isn't a finding unless you can show what the current one breaks.

## RED review

Read each criterion next to its test. A test blocks when it breaks one of the [RED review's](../../workflow/gates.md#red-review) three requirements:

- Its expected values don't match the Then line exactly. Compare them with the spec's text, not with your memory of it.
- It reaches the app outside the seam the spec names. A page criterion tested through a route fails this.
- It would pass if the feature did nothing. Apply the first of the acceptance-testing skill's two edits, which breaks the behavior.

Apply the second edit too, which changes only the internals. A test that fails it, such as one that finds a button by CSS class, doesn't block, because the gate doesn't require it. Report it under Not blocking with its file and line, because nobody can change the test after the RED commit without another RED review.

## Pin the gate's range

At the code review gate, review `master...HEAD`, with three dots, so the diff starts where the branch left `master`. Before you read any code, confirm that the range resolves and the diff isn't empty. When either check fails, report it to the TPM instead of reviewing.

## Spec axis

Walk the spec one criterion at a time, then its out-of-scope list and its contract changes. Look for three kinds of finding, and quote the spec line for each:

- Missing or partial. A criterion the change doesn't deliver, or delivers for some cases only. A passing acceptance test checks one example, so read the code for the rest of what the criterion covers.
- Unasked for. Behavior that no criterion, contract change, or ARD requirement asks for, including anything on the out-of-scope list.
- Wrong. Code that does something other than what the spec says, for an input a user can produce.

Every spec-axis finding blocks.

## Standards axis

The standards are the stack profile's rules and every file in the repository that documents how to write code, such as a `CONTRIBUTING.md`. A factory change has no stack profile. Its standards are the factory-maintainer's rules, the templates in `chrysalis/templates/`, the writing-for-agents and unslop skills, and the rules in `chrysalis/workflow/documents.md`. For each breach, cite the file and the rule. A breach of a documented standard blocks.

- Skip what tooling enforces. The test gate already ran the stack's lint and typecheck.
- A documented standard wins. When the repository's standards allow a pattern, it isn't a smell here.
- Use the tests in the engineering-principles skill the way that skill says, as judgment calls unless the stack profile or the ARD makes them rules.

Report code smells under Not blocking, each named as a judgment call, such as "possible Feature Envy", with the hunk it's in. Look for these in the diff:

| Smell | The sign | The usual fix |
|---|---|---|
| Mysterious Name | A name that doesn't say what the thing does or holds | Rename it. When no honest name comes, the design is unclear. |
| Duplicated Code | The same logic in two hunks or files of the change | Pull it into one function that both call |
| Feature Envy | A function that works mostly with another module's data | Move it to the module that owns the data |
| Data Clumps | The same few values passed together again and again | Make them one type |
| Primitive Obsession | A plain string or number standing in for a domain concept | Give the concept its own type |
| Repeated Switches | The same branching on one type in several places | One lookup table or one union type that every place uses |
| Shotgun Surgery | One change that needs edits in many files | Move the code that changes for the same reason into one module |
| Divergent Change | One file changed for several unrelated reasons | Split it so each part changes for one reason |
| Speculative Generality | Options, parameters, or hooks that no criterion needs | Remove them until a criterion needs them |
| Message Chains | A caller reaching through `a.b().c().d()` | Give the first object one function that does the walk |
| Middle Man | A function or module that only passes calls on | Call the real target directly |
| Refused Bequest | A subclass or implementation that ignores most of what it inherits | Use composition instead |

## Read past the diff before you call something a bug

- Trace each new input from where it enters to where it's used. The edge cases worth tracing are empty values, missing fields, values at a limit, and the same request sent twice.
- Before you report a bug, show its path: which input reaches which line, with what result. "This could be null" is a finding only when a caller can pass null, so read the callers and the types first.
- Look for fixes that hide a symptom: a guard, a retry, a cast, or a default value that covers for a wrong assumption elsewhere. For a bug fix, check that the fix sits where the implementer's report says the cause is.
- Read the code around a hunk before you flag a pattern in it. When the rest of the codebase does the same thing and no standard says otherwise, it isn't a finding.
- Look for code that behaves differently under test, such as a branch on a test flag or on the test data's values. It lets the acceptance tests pass on a feature that doesn't work.

A correctness problem goes on the spec axis when it breaks a criterion or an ARD requirement for an input a user can produce. Otherwise it goes under Not blocking, and the TPM decides whether it becomes an issue.

## Check your findings before you post them

- Each finding has its file and line, what's wrong, and the evidence: the spec line, the rule, or the input path. A finding without evidence is a guess, so check it or drop it.
- A review with no findings is a valid verdict. Don't add smells or small complaints to look thorough.
- Check a correctness or security finding more carefully before you drop it, not less carefully. A finding you can trace stays, however awkward it is to report.
- Name a fix owner for each finding: the agent whose write scope holds the file. When the fix belongs in the spec, it isn't a finding, so post a `question` for the TPM instead.

## Keep the axes apart in the verdict

Put the spec axis and the standards axis under their own headings, as the [gate verdict template](../../templates/gate-verdict.md) shows. Don't merge them, and don't rank one against the other. A change can follow every standard and build the wrong thing, or build exactly the right thing against the repository's conventions, and reporting the axes apart keeps one from hiding the other.

Start each axis's section with one line that gives its finding count and its worst finding, or "None". Don't pick one worst finding across both axes.
