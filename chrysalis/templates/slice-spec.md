---
id: <feature>-<NN>
app: <app>
feature: <feature>
request: <app>#<n>
supersedes: none
superseded_by: none
---

<!-- Slice spec template. The spec writer drafts it at apps/<app>/docs/features/<feature>/slices/<NN>-<slice>.md. Written for agents. Name modules with glossary terms instead of file paths. Include code only for contract shapes. Write "None" in any section that doesn't apply. Delete these comments before the spec check. -->

# <NN>. <Slice title>

## Delivers

<One or two sentences on what a user can do after this slice that they couldn't do before.>

## User stories

<The numbers of the feature brief's user stories this slice covers.>

## Acceptance criteria

<At most eight. Each one has one observable outcome. The test agent writes one test per criterion, named with the slice ID and the criterion ID.>

### AC-01. <Short name>

- Given <the starting state>
- When <the action>
- Then <the observable outcome>
- Seam: <where a test observes the outcome, such as a page, a route, or a form action>

## Contract changes

<Each contract this slice changes, and what changes in it. Contracts include schema tables and columns, route inputs and outputs, and shared types.>

## Layers

<The layers this slice changes: database, backend, frontend. The TPM sets the implementer order from this list.>

## Test seams

<Each seam named in the criteria, with one line on what a test there catches and one on what it misses.>

## Out of scope

<What a reader might expect in this slice that it doesn't include.>

## Glossary terms added

<Terms this slice adds or changes. Add them to the glossary on the same branch.>

## Decisions

<ADRs this slice depends on or proposes.>
