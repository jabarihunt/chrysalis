---
name: <agent>
description: <One or two sentences on what the agent does and when the TPM starts it. Tools use this to pick a subagent.>
mode: subagent
model_class: <plan, build, test, or review>
can_block: false
write_scope:
  - <path glob>
shell:
  - git-read
skills:
  - chrysalis/skills/unslop/SKILL.md
---

<!-- Agent file template. The factory-maintainer writes one file per agent at chrysalis/agents/<agent>.md. Phase 4's generator reads the frontmatter and writes each tool's agent files from it. Delete these comments.

Frontmatter fields:
- name. Lowercase letters and hyphens. It matches the file name.
- description. Starts with what the agent does.
- mode. primary for agents the human talks to (tpm, factory-maintainer). subagent for agents the TPM starts.
- model_class. A class in chrysalis/models.yaml.
- can_block. true for gate agents.
- write_scope. Paths the agent may create, change, or delete. An empty list means the agent writes only through the tracker CLI.
  - <app> stands for the app named in the brief.
  - stack:<layer> stands for the file patterns the app's stack profile lists for that layer, such as stack:backend.
  - root-files stands for any file directly in the repository root.
- shell. Command groups the agent may run. Every agent may also read files and search them.
  - git-read: git status, diff, log, show, rev-parse, branch --list, and remote get-url.
  - git-write: git switch, add, commit, and push of the agent's own work branch.
  - tracker: bun chrysalis/scripts/tracker.ts.
  - checks: bun chrysalis/scripts/check.ts.
  - stack: the stack profile's install, run, test, typecheck, lint, build, audit, and migration commands.
  - app-setup: bun chrysalis/scripts/app-setup.ts.
  - factory-scripts: any script in chrysalis/scripts/, bun test, bun install --cwd chrysalis/scripts, and bun run --cwd chrysalis/scripts typecheck.
- skills. Paths to the SKILL.md files the agent reads before it starts.

Every agent is denied these commands, whatever its shell groups: gh api, gh pr create, gh pr merge, gh pr review, git push to master, git push --force, git rebase, git reset --hard, and git branch -D. gh api is denied whole, reads included. The -f, -F, and --input flags switch it to POST without -X, and GraphQL mutations run through it too, so a rule can't reliably tell its reads from its writes. The tracker CLI calls gh inside its own process, so the deny doesn't affect it.

Body sections, in this order. Keep each agent-specific, and link to chrysalis/workflow/ instead of restating it.
-->

# <Agent name>

<Two or three sentences on the agent's job and what it never does.>

## Before you start

<What to read, in order.>

## Steps

<Numbered. Each step ends in a state the agent can check.>

## Rules

<Rules specific to this agent.>

## Report

<What the report to the TPM adds to the brief's report format.>
