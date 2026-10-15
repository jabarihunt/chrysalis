# Chrysalis

Chrysalis is an agentic software factory. You bring a request to a TPM agent. The TPM breaks it into slices and runs each slice through spec, implementation, and gate agents. Every slice gets a spec and failing tests before any feature code is written. You approve the scope and the acceptance criteria, open the pull requests, and merge them.

Chrysalis is a draft. Phase 1 wrote the workflow and templates, and phase 2 wrote the agent files and model classes. The skills, scripts, and a pilot app come in later phases, listed in [the todo list](chrysalis/docs/planning/todo.md).

## How it works

[The pipeline](chrysalis/workflow/pipeline.md) has the full flow, with a diagram, the request classes, the statuses, and the escalation rules. [The gates](chrysalis/workflow/gates.md) say what each check requires before work moves on.

## Making your own copy

This repository is a template. It holds the factory and no apps, and app setup refuses to run in it. To build apps, make your own copy, which can be private. Use a clone rather than GitHub's "Use this template" button, so your copy shares this repository's history and can take factory updates with `git merge`.

1. Create an empty repository on GitHub, with no README or license.
2. Clone this repository, keep it as a remote named `template`, and push to yours:

   ```sh
   git clone https://github.com/jabarihunt/chrysalis.git my-factory
   cd my-factory
   git remote rename origin template
   git remote add origin git@github.com:<you>/<your-repo>.git
   git push -u origin master
   ```

3. Protect `master`. In your repository's settings, open Rulesets, choose New ruleset, then Import a ruleset, and pick `.github/rulesets/protect-master.json`. Or run `gh api -X POST repos/<you>/<your-repo>/rulesets --input .github/rulesets/protect-master.json`. A private repository needs GitHub Pro or Team for rulesets.

Fork this repository only to send changes back. A fork of a public repository stays public, so apps built in one are public too.

### Taking factory updates

```sh
git fetch template
git switch -c factory/template-sync master
git merge template/master
git push -u origin factory/template-sync
```

Then open a pull request in your copy and merge it with a merge commit. Conflicts show up only in factory files you've changed.

### Sending a factory change back

Factory changes in your copy land in their own pull requests, apart from app changes. To send one back, find its merge commit in your copy, then:

```sh
git fetch template
git switch -c factory/<slug> template/master
git cherry-pick -x <merge>^1..<merge>^2
git push -u template factory/<slug>
```

Push to your fork instead if you can't write to this repository. Then open a pull request against `jabarihunt/chrysalis` and say which copy the change came from. Never send anything under `apps/`, or your `backlog` branch.

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
| `chrysalis/workflow/` | The pipeline, gates, document map, and tracker rules |
| `chrysalis/templates/` | Templates for specs, issues, briefs, and verdicts |
| `chrysalis/skills/` | Skills the agents read |
| `chrysalis/docs/adr/` | Decisions about the factory, and why they were made |
| `chrysalis/docs/planning/` | Open questions, todos, and planning notes |

## License and credits

Chrysalis uses the MIT license. See [LICENSE](LICENSE).

Some skills and templates adapt material from [Matt Pocock's skills](https://github.com/mattpocock/skills) and [pstack](https://github.com/cursor/plugins/tree/main/pstack). Both are MIT licensed. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists each adapted file.
