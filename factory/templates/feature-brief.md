---
id: <feature>
app: <app>
request: <app>#<n>
---

<!-- Feature brief template. The spec writer drafts it at apps/<app>/docs/features/<feature>/brief.md on the first slice's branch. Written for agents. Questions go on the request issue, not in this file. Delete these comments before the cut goes to the human. -->

# <Feature title>

## Problem

<The problem this feature solves, from the user's point of view.>

## Users

<Who uses this feature.>

## User stories

<The PRD user stories this feature covers, by number, plus any new stories numbered after them.>

## Cut

<The slices in build order. Each slice is a thin path through every layer it needs, a user can see it work, and it has at most eight acceptance criteria.>

| Slice | Delivers | Blocked by |
|---|---|---|
| 01. <title> | <What a user can do once this slice ships> | None |
| 02. <title> | <What a user can do once this slice ships> | 01 |

## Out of scope

<What a reader might expect from this feature that it won't include.>
