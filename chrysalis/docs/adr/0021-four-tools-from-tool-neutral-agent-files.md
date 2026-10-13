---
status: accepted
date: 2026-10-11
---

# 0021. Cursor, Kilo, Kiro, and Claude Code run agents generated from tool-neutral files

Chrysalis supports four tools: Cursor, Kilo, Kiro, and Claude Code. Cursor, Kilo, and Kiro load the root `AGENTS.md`. Claude Code loads it through a root `CLAUDE.md` that contains only `@AGENTS.md`. Claude Code can read `AGENTS.md` without that file, but only when no `CLAUDE.md` or `CLAUDE.local.md` exists, and not on Bedrock, Vertex, or Foundry, so the import makes loading reliable. Session routing works the same in all four.

Agent definitions live in `chrysalis/agents/`, one Markdown file per agent, written for no particular tool. Each file's frontmatter names the agent's mode, model class, write scope, shell command groups, skills, and whether it can block. The body is the agent's prompt. `chrysalis/templates/agent.md` defines the fields.

Phase 4's generator writes each tool's agent files from that frontmatter:
- `.cursor/agents/<name>.md`, with the model from `chrysalis/models.yaml`.
- `.kilo/agents/<name>.md`, with path-based edit permissions and shell allow and deny rules.
- `.kiro/agents/<name>.json`, whose `prompt` points to the agent file with a `file://` path, with `permissions` rules for writes and shell commands.
- `.kiro/hooks/`, with a `PreToolUse` hook that blocks pull request and merge commands.
- `.claude/agents/<name>.md`, with the model, the tools the agent may use, and a copy of the agent file's body. Claude Code can't point a subagent's prompt at another file.
- `.claude/settings.json`, with deny rules for pull request and merge commands, and a `PreToolUse` hook that blocks file edits outside the agent's write scope. Claude Code passes the subagent's name to hooks as `agent_type`.

A check confirms the generated files match their sources. Each agent file names its skills by path, and the agent reads them, because the four tools load skills from different folders. Generated agent files keep the source file's name. Cursor also reads `.claude/agents/`, and with matching names its own `.cursor/agents/` files take precedence.

Each agent names a model class instead of a model ID. `chrysalis/models.yaml` maps each class to a model in each tool, and the generator refuses IDs not yet checked against the tool's own model list.

This supersedes ADR 0013, which named only Cursor and Kilo.

## Consequences

- The tools enforce write scopes to different degrees. Claude Code's hook can block any edit outside an agent's scope. Kilo and Kiro restrict writes by path. Cursor has only a read-only flag, and its read-only mode also blocks commands that change state, which would stop gate agents from posting verdicts through the tracker CLI. Shell commands can write files in every tool, so `check.ts` checks write scopes the same way everywhere. See Q-16, Q-18, and Q-19.
- Kiro hooks and Claude Code's settings add a tool-level ban on opening and merging pull requests. The scripts in ADR 0017 remain the check that applies everywhere.
- Kiro has no Grok or Gemini models, so its build class uses an open-weight family. Claude Code has only Claude models, so it runs under the one-family exception in ADR 0022.
