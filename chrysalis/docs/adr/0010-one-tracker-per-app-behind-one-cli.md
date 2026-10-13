---
status: accepted
date: 2026-10-11
---

# 0010. One tracker per app, behind one CLI

Each app names one tracker in `app.yaml`. The TPM asks the human for it at app setup, and the default is local markdown. The factory itself uses local markdown. Agents reach trackers only through the tracker CLI, which offers the same commands for every tracker.

The GitHub adapter uses the `gh` CLI. The same script runs in every tool, in CI, and in a terminal, and it uses no context until an agent calls it.

## Considered options

- A tracker per feature. One app's history would split across trackers, and no single list would show what's blocked.
- The GitHub MCP server. Each tool needs its own MCP config. Kilo reads environment secrets only from global config, so a project-level entry wouldn't get its token. The server's tool definitions also sit in every agent's context.
