<!-- Work issue template for kinds "setup", "slice", "small-change", "bug", and "docs". Keep the section for this issue's kind and delete the others. The tracker holds the fields such as status, spec, spec_sha, red_sha, and branch. Delete these comments. -->

## Slice

Spec: <path to the slice spec>
Request: <app>#<n>

<One sentence from the spec's Delivers section.>

## Small change

<The change in one or two sentences.>

Small-change checks:
- No contract, schema, or code that handles authentication, permissions, payments, or personal data changes: <how you know>
- Only the backend or only the frontend changes: <which one>
- Users see nothing new beyond text, styling, or configuration: <how you know>
- One implementer can finish it in one session: <why>

Acceptance criteria:

### AC-01. <Short name>

- Given <the starting state>
- When <the action>
- Then <the observable outcome>
- Seam: <where a test observes it>

## Bug

What happens: <the current behavior>

What should happen: <the expected behavior>

Breaks: <the criterion ID, ARD requirement ID, or documented behavior, with its path>

Steps to reproduce:
1. <Step>

Environment: <browser, device, data, or account the bug needs>

## Docs

<The change and its audience.>

## Setup

App: <app>
Stack: <stack profile>
Tracker: <local or github>
