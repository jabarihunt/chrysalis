# Chrysalis

Chrysalis is an agentic software factory. You bring a request to a TPM agent. The TPM breaks it into slices and runs each slice through spec, implementation, and gate agents. Every slice gets a spec and failing tests before any feature code is written. You approve the scope and the acceptance criteria, open the pull requests, and merge them.

Chrysalis is a draft. Phase 1, the workflow and templates, is written. The agent files, skills, scripts, and a pilot app come in later phases, listed in [the todo list](chrysalis/docs/planning/todo.md).

## How it works

[The pipeline](chrysalis/workflow/pipeline.md) has the full flow, with a diagram, the request classes, the statuses, and the escalation rules. [The gates](chrysalis/workflow/gates.md) say what each check requires before work moves on.

## Starting a session

Open the repository in Cursor or Kilo. Both load [AGENTS.md](AGENTS.md), which decides the agent's role.

- To build or change an app, describe what you want. The agent works as the TPM.
- To change the factory itself, start your first message with `factory:`. The agent works as the factory-maintainer.

Until phase 2 adds the agent files, the agent follows the pipeline directly.

## Layout

| Path | Holds |
|---|---|
| `AGENTS.md` | The entry point for every agent session |
| `apps/` | One folder per app, created by app setup |
| `chrysalis/workflow/` | The pipeline, gates, document map, and tracker rules |
| `chrysalis/templates/` | Templates for specs, issues, briefs, and verdicts |
| `chrysalis/skills/` | Skills the agents read |
| `chrysalis/docs/adr/` | Decisions about the factory, and why they were made |
| `chrysalis/docs/planning/` | Open questions, todos, and planning notes |

## Credits

Some skills and templates adapt material from [Matt Pocock's skills](https://github.com/mattpocock/skills) and [pstack](https://github.com/cursor/plugins/tree/main/pstack). Both are MIT licensed. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists each adapted file.
