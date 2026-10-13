# Open questions

These questions are waiting on a decision or a check. Each has an ID so other documents can cite it. When a question is settled, record the answer as an ADR in `chrysalis/docs/adr/` and move the question to the closed table with the ADR number. Once the factory's tracker CLI exists, these questions move to the tracker as issues and this file is deleted.

## Open

| ID | Question | Decide in | Current default |
|---|---|---|---|
| Q-03 | Which Postgres driver should JabStack use on Fly.io? | Stack session | A standard TCP driver with Neon's pooled connection string. |
| Q-04 | Should the JabStack repo keep its own agent files, such as `CLAUDE.md` and `.cursorrules`, for use outside the factory? | Stack session | Keep them in JabStack. App setup skips them. |
| Q-05 | What does the security-review skill check, and which scanners back it? | Security session | Stub only. The earlier proposal was OWASP ASVS, Semgrep, gitleaks, and a dependency audit. |
| Q-08 | When does spec approval move from `criteria` to `risk-based`? | After the pilot and the first few slices | `criteria`. |
| Q-09 | When do agents move from the human's GitHub account to a bot account? | Before any unattended run | The human's account. |
| Q-10 | What is the slice size cap? | After the pilot | Eight acceptance criteria per slice. |
| Q-11 | Are the model IDs in `chrysalis/models.yaml` right in each tool? | Before phase 4 | Drafted from each tool's docs. The Kilo IDs match Kilo Gateway's public catalog. None is confirmed in the tool itself. |
| Q-12 | Can each tool offer the factory-maintainer as a selectable primary agent? | Check in phase 4 | Start maintainer sessions with the `factory:` prefix in every tool. Kilo switches agents with Tab. The Kiro CLI has a `chat.defaultAgent` setting, and the Kiro IDE has none. Claude Code starts one with `claude --agent factory-maintainer`. Cursor is unknown. |
| Q-13 | Can each tool hide subagents from the user's menu? | Check in phase 4 | Kilo can, with `hidden: true`. Kiro's docs describe no way to. Cursor and Claude Code are unknown. |
| Q-15 | Which license does Chrysalis use? | Before the repository goes public | None. The repository is private, so all rights are reserved. |
| Q-16 | How does Kiro enforce a write allowlist? A write that no rule matches prompts the user instead of being denied. | Phase 4 | Generate a deny rule that matches every path and excludes the agent's write scope, then test it. |
| Q-17 | Should Kiro use Claude Opus 5.5 and GPT-5.6, which Kiro lists as experimental? | After the pilot | Yes. Fall back to Claude Opus 5 if Opus 5.5 changes or is withdrawn. |
| Q-18 | How do Cursor's gate agents post verdicts? Cursor's read-only mode blocks commands that change state, and the local tracker commits each comment. | Phase 4 | Generate Cursor's gate agents without the read-only flag, and rely on `check.ts`, which fails any commit by an agent whose write scope is empty. |
| Q-19 | Does Claude Code's `PreToolUse` hook receive `agent_type` on every subagent edit, so it can enforce write scopes? | Phase 4 | Claude Code's subagent docs say hooks receive the subagent's name as `agent_type`. Test it with each edit tool before relying on it. |
| Q-20 | Do Claude Code's same-family gates miss findings that the other tools' gates catch? See factory ADR 0022. | After the pilot | Run the pilot's gates in Claude Code and in one other tool, and compare the findings. If Claude Code misses findings, hand its gate reviews to another tool's command line. |

## Closed

| ID | Question | Answer | ADR |
|---|---|---|---|
| Q-01 | Should JabStack's backend move to Go? | No. SvelteKit serves frontend and backend, in TypeScript. | 0015 |
| Q-02 | Should apps run Better Auth inside the app, or use Neon's Managed Better Auth? | Inside the app. | 0019 |
| Q-06 | Which tracker does the factory itself use? | Local markdown. Local is also the default for new apps until the human picks another at app setup. | 0010 |
| Q-07 | Which language do factory scripts use? | Bun and TypeScript. | 0016 |
| Q-14 | Should local tracker issues live on a `backlog` branch checked out as a worktree? | Yes. | 0011 |
