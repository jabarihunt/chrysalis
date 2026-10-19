# Third-party notices

Parts of this repository are copied or adapted from the projects below. Each skill or template that uses upstream material names its source in its frontmatter or opening comment, and [chrysalis/UPSTREAM.md](chrysalis/UPSTREAM.md) pins the upstream commits.

| Factory file | Source | Use |
|---|---|---|
| `chrysalis/skills/unslop/SKILL.md` | pstack, `pstack/skills/unslop/SKILL.md` | Copied. Frontmatter changed. |
| `chrysalis/skills/spec-writing/SKILL.md` | Matt Pocock's skills, `skills/engineering/to-spec/SKILL.md` and `skills/engineering/triage/AGENT-BRIEF.md` | Seam choice, writing from settled material, and durable, testable specs adapted. |
| `chrysalis/skills/slicing/SKILL.md` | Matt Pocock's skills, `skills/engineering/to-tickets/SKILL.md`, and pstack, `pstack/skills/principle-sequence-verifiable-units/SKILL.md` | Vertical slices, blocking edges, prefactoring, and ordering slices so each can be checked adapted. |
| `chrysalis/skills/domain-modeling/SKILL.md` | Matt Pocock's skills, `skills/engineering/domain-modeling/SKILL.md`, `ADR-FORMAT.md`, and `GLOSSARY-FORMAT.md` in that folder | Term checks, glossary upkeep, and the kinds of decision that deserve an ADR adapted. |
| `chrysalis/skills/interviewing/SKILL.md` | Matt Pocock's skills, `skills/productivity/grilling/SKILL.md` and `skills/engineering/grill-with-docs/SKILL.md` | The decision tree, rounds with recommended answers, and recording answers as they come adapted. |
| `chrysalis/skills/briefing/SKILL.md` | pstack, `pstack/skills/poteto-mode/playbooks/orchestrate.md`, and Matt Pocock's skills, `skills/engineering/triage/AGENT-BRIEF.md` and `skills/productivity/handoff/SKILL.md` | Brief fields, relaying reports in full, and behavioral, scoped briefs adapted. |
| `chrysalis/skills/writing-for-agents/SKILL.md` | Matt Pocock's skills, `skills/productivity/writing-for-agents/SKILL.md` and `SKILL-MECHANICS.md` in that folder | Pointers, the depth of each piece, completion checks, positive wording, and pruning adapted. |
| `chrysalis/skills/implement-slice/SKILL.md` | Matt Pocock's skills, `skills/engineering/implement/SKILL.md`, and pstack, `pstack/skills/principle-prove-it-works/SKILL.md` | Building test-first with frequent checks, and checking the real result before reporting, adapted. |
| `chrysalis/skills/tdd/SKILL.md` | Matt Pocock's skills, `skills/engineering/tdd/SKILL.md`, `tests.md`, and `mocking.md` in that folder | The red-green loop, test anti-patterns, and mocking only at system boundaries adapted. |
| `chrysalis/skills/engineering-principles/SKILL.md` | pstack, `principle-boundary-discipline`, `principle-type-system-discipline`, `principle-model-the-domain`, `principle-minimize-reader-load`, `principle-subtract-before-you-add`, `principle-make-operations-idempotent`, and `principle-prove-it-works`, each at `pstack/skills/<name>/SKILL.md`, and Matt Pocock's skills, `skills/engineering/codebase-design/SKILL.md` | Eight design principles adapted, most with a test a reviewer can apply. |
| `chrysalis/skills/diagnosing-bugs/SKILL.md` | Matt Pocock's skills, `skills/engineering/diagnosing-bugs/SKILL.md`, and pstack, `pstack/skills/principle-fix-root-causes/SKILL.md` | The failing loop before any theory, ranked hypotheses, one change at a time, and fixing the first wrong decision adapted. |
| `chrysalis/skills/blast-radius/SKILL.md` | pstack, `pstack/skills/blast-radius/SKILL.md` | Finding the one fact a change is safe because of, the ladder of evidence, and looking where search stops adapted. |
| `chrysalis/skills/retro/SKILL.md` | Matt Pocock's skills, `skills/engineering/retro/SKILL.md`, and pstack, `pstack/skills/correct/SKILL.md`, `pstack/skills/principle-encode-lessons-in-structure/SKILL.md`, `pstack/skills/reflect/SKILL.md`, and `synthesizer.md` and `judgment-reviewer.md` in `pstack/skills/reflect/references/` | Mistake classes that count after two events, fixing each one at the highest level with written rules last, proving a new check on a past mistake, giving standards to the reviewer, and dropping one-offs adapted. |
| `chrysalis/skills/upstream-sync/SKILL.md` | pstack, `pstack/skills/maintain-verification-skill/SKILL.md` | Ending a maintenance pass in one named outcome, and shipping at most one pull request of checked changes, adapted. |
| `chrysalis/skills/technical-writing/SKILL.md` | pstack, `pstack/skills/technical-writing/SKILL.md`, and Matt Pocock's skills, `skills/engineering/pr/SKILL.md` | Document modes, sentence rules, and the pull request body as a briefing adapted. |
| `chrysalis/templates/agent-brief.md` | pstack, `pstack/skills/poteto-mode/playbooks/orchestrate.md` | Brief fields adapted. |
| `chrysalis/templates/adr.md` | Matt Pocock's skills, `skills/engineering/domain-modeling/ADR-FORMAT.md` | Format adapted. |
| `chrysalis/templates/glossary.md` | Matt Pocock's skills, `skills/engineering/domain-modeling/GLOSSARY-FORMAT.md` | Format adapted. |
| `chrysalis/skills/acceptance-testing/SKILL.md` | pstack, `pstack/skills/principle-test-behavior-not-implementation/SKILL.md` and `pstack/skills/create-verification-skill/SKILL.md`, and Matt Pocock's skills, `skills/engineering/tdd/SKILL.md` and `tests.md` in that folder | Judging a test by an edit that breaks the behavior and one that changes only the internals, asserting what the contract promises, testing at agreed seams, and driving the real user path adapted. |
| `chrysalis/skills/regression-testing/SKILL.md` | Matt Pocock's skills, `skills/engineering/diagnosing-bugs/SKILL.md`, and pstack, `pstack/skills/tdd/SKILL.md` and `pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md` | A test that goes red on the exact symptom at a seam on the bug's real path, shrinking the case, deterministic failures, and reproducing twice without forcing the symptom adapted. |
| `chrysalis/skills/code-review/SKILL.md` | Matt Pocock's skills, `skills/engineering/code-review/SKILL.md`, and pstack, `rubric.md`, `lead-judgment.md`, and `reviewer-prompt.md` in `pstack/skills/interrogate/references/` | The spec and standards axes kept apart, the code smell list, tracing a bug's input path, and dropping findings without evidence adapted. |
| `chrysalis/agents/code-review.md` and `chrysalis/workflow/gates.md` | Matt Pocock's skills, `skills/engineering/code-review/SKILL.md` | The spec and standards review axes adapted. |
| `chrysalis/agents/spec-writer.md` | Matt Pocock's skills, `skills/engineering/to-spec/SKILL.md`, `skills/engineering/to-tickets/SKILL.md`, and `skills/engineering/domain-modeling/ADR-FORMAT.md` | Seam choice, vertical slices, and when to write an ADR adapted. |
| `chrysalis/agents/test.md` and `chrysalis/workflow/gates.md` | pstack, `pstack/skills/principle-test-behavior-not-implementation/SKILL.md` | A test that fails when the behavior breaks, in its simplest form a test that fails when every import returns `undefined`, adapted. |

## pstack

Source: https://github.com/cursor/plugins/tree/main/pstack

```
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Matt Pocock's skills

Source: https://github.com/mattpocock/skills

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
