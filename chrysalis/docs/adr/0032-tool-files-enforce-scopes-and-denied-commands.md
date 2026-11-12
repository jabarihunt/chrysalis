---
status: accepted
date: 2026-11-11
---

# 0032. Generated tool files enforce write scopes and denied commands as far as each tool allows

`bun chrysalis/scripts/generate.ts` writes each tool's agent files from the agent files, `chrysalis/models.yaml`, and the stack profiles, as 0021 describes. Each tool gets the strongest limits it supports, on the files an agent may write and on the commands every agent is denied. The tools differ, so `check.ts` checks write scopes and trailers the same way everywhere, as 0017 says.

A generated file can't know which app a run is for. In the tool rules, `<app>` becomes `*`, and `stack:<layer>` becomes that layer's patterns from every stack profile. A backend agent may then write backend files in any app, and `check.ts` holds each commit to the app its `Issue:` trailer names.

- Kiro. An agent's `permissions` hold an `fs_write` deny rule that matches `**` and excludes the agent's write scope, and an allow rule for the scope. Kiro asks about a write that no rule matches instead of refusing it, and a deny wins over every allow in any scope, so the deny rule is what refuses. The rules also allow the agent's shell groups and deny the always-denied commands. A hook in `.kiro/hooks/` runs a script before every shell command, which parses the command and blocks a denied one, including one inside a compound command, a subshell, or `sh -c`. Kiro sends hooks no agent name, and a subagent's own hooks don't fire, so nothing in Kiro can check a write against the agent's exact scope. This answers Q-16.
- Claude Code. `.claude/settings.json` denies the always-denied commands and runs the same command script. Its write hook reads the agent's name from `agent_type`, the app from the checked-out branch, and that app's stack from its `app.yaml`, and allows only the agent's exact scope. It blocks every edit by an agent the factory doesn't define, and every edit under `backlog/`. Without `agent_type`, the session is the TPM or the factory-maintainer, and the hook checks only `backlog/`, because Cursor also runs the hooks in `.claude/settings.json` and may send no agent name. Claude Code's hook docs say `agent_type` arrives inside every subagent, but nobody has tested it there yet, so Q-19 stays open.
- Kilo. An agent's `permission` denies every edit outside its scope and denies the always-denied commands. Kilo has no hooks. Its `*` also matches `/`, so its patterns are looser than Kiro's, and it can't limit an agent to files in the root, so the factory-maintainer may edit any file.
- Cursor. Agent files set no `readonly` flag. Cursor's read-only mode also blocks commands that change state, and the local tracker commits each comment, so a read-only gate agent couldn't post its verdict. `check.ts` fails any commit by an agent whose write scope is empty. Cursor's docs say it runs the hooks in `.claude/settings.json` by default, so Cursor gets the command script too. This answers Q-18.
- Kilo hides each subagent from its @ menu with `hidden: true`, because the human talks only to the TPM, as 0002 says. Cursor, Kiro, and Claude Code document no way to hide a subagent. This answers Q-13.

## Considered options

- One generated agent per agent and app, such as `backend-todo`. Kiro and Kilo could then hold each agent to one app. But setting up an app would change generated factory files, and a pull request changes either the factory or one app, as 0001 says. Each tool's menu would also grow with every app, and 0021 keeps generated files named after their source.
- In Claude Code, block edits under `apps/` when no `agent_type` arrives, since neither the TPM nor the factory-maintainer writes there. Cursor would run that hook for its own agents, which may send no name, and block every implementer.
- Read-only gate agents in Cursor. They couldn't post verdicts through the local tracker.

## Consequences

- In Kiro, where the factory runs today, an agent can write its layer's files in any app, and only `check.ts` catches it.
- A shell command can still write any file in every tool, as 0021 notes.
- Kiro runs the command script before every shell command, and blocks the command when the script fails. Without `bun` on the path, every shell command fails.
- The command script reads the folder each command runs in, so `git push` with no branch named is refused only when `master` is checked out there.
