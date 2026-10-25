# Chrysalis

Chrysalis is an agentic software factory. You make a request to a TPM agent. The TPM breaks it into slices and runs each slice through spec, implementation, and gate agents. Every slice gets a spec and failing tests before any feature code is written. You approve the scope and the acceptance criteria, and you merge the pull requests that the TPM opens.

Chrysalis is a draft. Phase 1 wrote the workflow and templates, phase 2 wrote the agent files and model classes, and phase 3 has built the tracker CLI and every skill, with security-review as a stub. The other scripts and evals come next, tracked as factory issues in the local tracker.

## Requirements

- Bun 1.2.21 or later, for the factory's scripts.
- git 2.42 or later.
- gh 2.94 or later, logged in, for apps that use the GitHub tracker, and for GitHub pull requests whatever the tracker. The tracker CLI opens pull requests and posts code review verdicts on them through `gh`.

The tracker CLI checks these versions when it starts.

## How it works

[The pipeline](chrysalis/workflow/pipeline.md) has the full flow, with a diagram, the request classes, the statuses, and the escalation rules. [The gates](chrysalis/workflow/gates.md) say what each check requires before work moves on.

## Making your own copy

This repository is a template, never a working project. It holds the factory and no apps, and app setup refuses to run in it. To build apps, make your own copy, which can be private.

Your copy is a snapshot. It has no link back to this repository. You change its factory through your own `factory:` sessions, and changes made here later don't reach it.

1. On this repository's GitHub page, choose Use this template, then Create a new repository. Leave Include all branches unticked, so your copy gets only `master` and none of this repository's factory issues. Or run:

   ```sh
   gh repo create <your-repo> --private --template jabarihunt/chrysalis --clone
   ```

2. Protect `master`. In your copy's settings, open Rulesets, choose New ruleset, then Import a ruleset, and pick `.github/rulesets/protect-master.json`. Or run this from your copy's folder:

   ```sh
   gh api -X POST repos/<you>/<your-repo>/rulesets --input .github/rulesets/protect-master.json
   ```

   A private repository needs GitHub Pro or Team for rulesets.

Build apps in a copy, not a fork. A fork of a public repository stays public, so apps built in one are public too.

## Starting a session

Open the repository in Cursor, Kilo, Kiro, or Claude Code. Each one loads [AGENTS.md](AGENTS.md), which decides the agent's role. Claude Code loads it through [CLAUDE.md](CLAUDE.md).

- To build or change an app, describe what you want. The agent works as the TPM.
- To change the factory itself, start your first message with `factory:`. The agent works as the factory-maintainer.

The tools list the agents in their menus once phase 4 generates each tool's agent files. Until then, the TPM starts each agent with a brief that names its file.

## Layout

| Path | Holds |
|---|---|
| `AGENTS.md` | The entry point for every agent session |
| `CLAUDE.md` | An import of `AGENTS.md`, so Claude Code loads it reliably |
| `LICENSE` | The MIT license |
| `.github/rulesets/` | The `master` ruleset for each copy to import |
| `apps/` | One folder per app, created by app setup. The template has none. |
| `chrysalis/agents/` | One file per agent, with its role, write scope, skills, and model class |
| `chrysalis/models.yaml` | The model each model class uses in each tool |
| `chrysalis/scripts/` | The tracker CLI and the factory's tests, including a check that `chrysalis/models.yaml` follows factory ADR 0027 and a check that accepted factory ADRs stay as they were accepted. Run the tests with `bun test chrysalis/scripts`. For the typecheck, run `bun install --cwd chrysalis/scripts` once, then `bun run --cwd chrysalis/scripts typecheck`. |
| `chrysalis/workflow/` | The pipeline, gates, document map, and tracker rules |
| `chrysalis/templates/` | Templates for specs, issues, briefs, verdicts, and retros |
| `chrysalis/skills/` | Skills the agents read |
| `chrysalis/UPSTREAM.md` | The upstream commits the skills and templates were checked against |
| `chrysalis/docs/adr/` | Decisions about the factory, and why they were made |
| `chrysalis/docs/planning/` | The initial outline and the JabStack change notes, deleted at release |

## License and credits

Chrysalis uses the MIT license. See [LICENSE](LICENSE).

Some skills and templates adapt material from [Matt Pocock's skills](https://github.com/mattpocock/skills) and [pstack](https://github.com/cursor/plugins/tree/main/pstack). Both are MIT licensed. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists each adapted file.
