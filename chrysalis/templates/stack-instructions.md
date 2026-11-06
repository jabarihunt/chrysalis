<!-- Stack instructions template. The factory-maintainer copies this file to
chrysalis/stacks/<stack>/instructions.md. Keep machine-readable values in
profile.yaml and link to them here. Delete this comment. -->

# <Stack name>

Read `profile.yaml` for the source pin, layer write scopes, command strings, and copy changes. This file holds the stack rules that app agents need.

## Stack

<Runtime, framework, language, and test tools. Name command traps that an agent cannot infer safely.>

## Database

<Schema and migration rules, local isolation, production host, and secret handling.>

## Backend

<Server file conventions, trust-boundary rules, authentication, and external services.>

## Frontend

<Framework conventions, component libraries, route rules, styling, and accessibility rules specific to the stack.>

## Acceptance tests

<Runner, fixtures, deterministic controls, database isolation, and the profile commands to use.>
