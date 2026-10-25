<!-- Pull request body template. For app work, the documentation agent fills it in and posts it on the issue. For a factory change, the factory-maintainer does. The human copies it from the issue to open the pull request. Each section says how each request class fills it. Delete these comments. -->

## Summary

<What a user can do after this merges, in one or two sentences. For a factory change, what changes for the agents or for the human who runs the factory.>

Issue: <app>#<n>
Spec: <path, or "None" for bugs, small changes, docs-only work, and factory changes>

## Acceptance criteria

<For a slice, or a small change with criteria, one row for each criterion. For a bug, one row for the criterion its regression test protects. For a small change without criteria, docs-only work, or a factory change, write "None" instead of the table. For a factory change, add that the code review checks the issue body and its decision comments.>

| Criterion | Test |
|---|---|
| AC-01 | <test name> |

## Changes

<For app work, grouped by layer: database, backend, frontend, tests, and docs. For a factory change, grouped by area: agents, skills, workflow, templates, scripts and tests, ADRs, tool config, and docs.>

## Gate verdicts

<One row for each gate that ran before the pull request opened, by the "Applies to" column in chrysalis/workflow/gates.md. Leave out the code review gate, because its verdict goes on the pull request. Write "None" instead of the table when no gate ran, as for docs-only work and factory changes.>

| Gate | Verdict | Commit |
|---|---|---|
| RED review | <pass> | <SHA> |
| Security | <pass> | <SHA> |
| Test | <pass> | <SHA> |

## How to check it

<Commands or steps a reviewer can run locally.>

## Risks and follow-ups

<Known risks, and any non-blocking findings turned into issues. "None" if there are none.>
