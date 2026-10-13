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
| Q-11 | Which model IDs does each model class map to in Cursor and Kilo? | Phase 2 | None yet. |
| Q-12 | Can Cursor offer the factory-maintainer as a selectable primary agent, the way Kilo switches agents with Tab? | Check in phase 4 | Start maintainer sessions with the `factory:` prefix in every tool. |
| Q-13 | Can Cursor hide subagents from the user's menu, the way Kilo's `hidden: true` does? | Check in phase 4 | Unknown. |
| Q-15 | Which license does Chrysalis use? | Before the repository goes public | None. The repository is private, so all rights are reserved. |

## Closed

| ID | Question | Answer | ADR |
|---|---|---|---|
| Q-01 | Should JabStack's backend move to Go? | No. SvelteKit serves frontend and backend, in TypeScript. | 0015 |
| Q-02 | Should apps run Better Auth inside the app, or use Neon's Managed Better Auth? | Inside the app. | 0019 |
| Q-06 | Which tracker does the factory itself use? | Local markdown. Local is also the default for new apps until the human picks another at app setup. | 0010 |
| Q-07 | Which language do factory scripts use? | Bun and TypeScript. | 0016 |
| Q-14 | Should local tracker issues live on a `backlog` branch checked out as a worktree? | Yes. | 0011 |
