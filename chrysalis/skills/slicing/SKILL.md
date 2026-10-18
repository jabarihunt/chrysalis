---
name: slicing
description: How to cut a feature into slices that each go through the pipeline on their own. The spec writer reads it before drafting the cut in a feature brief.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/to-tickets/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Tracer-bullet vertical slices, blocking edges, prefactoring first, and expand, migrate, and contract for wide refactors.
    - repo: cursor/plugins
      path: pstack/skills/principle-sequence-verifiable-units/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Units that each end in a state someone can check, ordered so the sequence shows the work growing.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the Chrysalis cut. The cut lives in the feature brief, the human approves it through the TPM, and each slice has at most eight criteria.
---

# Slicing

A cut is the list of slices in a feature brief. The pipeline runs one slice at a time, and each slice gets its own spec, tests, gates, and pull request. A good cut gives the human working software early and keeps every slice small enough to review.

## Know what a slice is

A slice is a tracer bullet: a narrow path through every layer the behavior needs, from the database to the page, that a user can see working.

- It cuts across the layers. A slice that only adds tables, or only adds a route, is a horizontal layer, and no user can see it work.
- It delivers on its own. Once it merges, a user can do something new, even something small.
- It stays within the criteria cap in [the pipeline's limits](../../workflow/pipeline.md#limits).
- Each implementer can finish its part in one session.

## Cut the feature

1. List the user stories the feature covers, by number.
2. Find the thinnest path that delivers the most important story end to end. That's slice 01. It can be rough, with one case, plain UI, and no edge cases.
3. Add slices that widen it, one kind of growth at a time: another case of a rule, the error paths, another story, or another role.
4. Give each slice its blocking edges, which are only the slices it can't start without. A late slice that needs only slice 01 lists 01 alone.
5. Order the slices so each one builds on merged, working code, and the sequence shows the feature growing.
6. List what's out of scope, starting with what a reader would assume the feature includes.

The cut is done when every story from step 1 is in a slice and every slice passes the checks at the end of this skill.

## Split a slice that's too big

Split a slice when it needs more criteria than the cap allows, or when one implementer couldn't finish its part in a session. Split along the behavior, and keep each part vertical:

- by user story,
- by case of a rule, with the common case first,
- by the main path first and its errors after,
- by role, when different users see different things.

## Put prefactoring first

When the existing code makes the feature hard to add, change the code first and then add the feature. Put the prefactoring in slice 01, ahead of the feature work in that slice, so slice 01 still delivers something a user can see. When the prefactoring is too big to share a slice, post a question for the TPM that describes it, and leave it out of the cut until the answer comes.

A wide mechanical change, such as renaming a type used across the app, can't land as a vertical slice, because it breaks every caller at once. Post a question for the TPM that proposes it in three steps: add the new form beside the old one, move the callers over in batches, then delete the old form.

## Check the cut

Confirm each of these before you report. The TPM checks the same things before the human sees the cut.

- Together, the slices cover every story the request names and add nothing it didn't ask for.
- Each slice delivers something a user can see working.
- Each slice stays within the criteria cap.
- Each slice's blocking edges list only the slices it needs.
- The out-of-scope list names what a reader would most likely assume.
