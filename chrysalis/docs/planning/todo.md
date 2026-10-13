# To do

This is agreed work that hasn't started. Phase numbers refer to the factory implementation plan from the 2026-10-11 planning session. Once the factory's tracker CLI exists, these items move to the tracker as issues and this file is deleted.

| Item | Owner | When |
|---|---|---|
| Run `gh auth login`. `gh` 2.102.0 is installed but not logged in. | Human | Before agents use the GitHub tracker |
| If an agent session uses JabStack's Stripe MCP entry, switch it to OAuth or a sandbox Agent API key. Stripe MCP stops accepting full-access secret keys on 2026-10-31. Apps that call Stripe through the SDK aren't affected. | Human | Before 2026-10-31 |
| Phase 2. Write the agent files in `chrysalis/agents/` and `chrysalis/models.yaml`. | Agent | After phase 1 review |
| Phase 3. Write the first skills in `chrysalis/skills/`, including the security-review stub marked TODO. Pin upstream commits in `chrysalis/UPSTREAM.md`, and update `THIRD_PARTY_NOTICES.md`. | Agent | After phase 2 |
| Phase 3. Build the tracker CLI with the local and GitHub adapters, and create the `backlog` branch. | Agent | After phase 2 |
| Phase 4. Write the JabStack stack profile in `chrysalis/stacks/jabstack/`, the adapter generator, the app setup script, and `check.ts`. | Agent | After phase 3 |
| Phase 5. Run a pilot app in `evals/` through one feature end to end, and fix what breaks. | Agent and human | After phase 4 |
| Write the security-review skill content. | Human and an agent | Security session, Q-05 |
| Work through `jabstack-changes.md`. | Human and an agent | Stack session |
| File the JabStack changes as issues in `jabarihunt/jabstack`. | Agent, after the human approves | After `gh auth login` |
| Write a Linear tracker adapter. | Agent | When an app needs Linear |
| Move these todos and `open-questions.md` into the factory's tracker, then delete both files. | Factory-maintainer | When the tracker CLI exists |
