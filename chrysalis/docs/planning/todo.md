# To do

This is agreed work that hasn't started. Phase numbers refer to the factory implementation plan from the 2026-10-11 planning session. Once the factory's tracker CLI exists, these items move to the tracker as issues and this file is deleted.

| Item | Owner | When |
|---|---|---|
| Accept or change ADR 0026, the plan for moving factory changes between a copy and the template, and set its status. | Human, then the factory-maintainer | Before making the first copy |
| If an agent session uses JabStack's Stripe MCP entry, switch it to OAuth or a sandbox Agent API key. Stripe MCP stops accepting full-access secret keys on 2026-10-31. Apps that call Stripe through the SDK aren't affected. | Human | Before 2026-10-31 |
| Confirm the drafted model IDs in `chrysalis/models.yaml`: the Cursor model picker, `kilo models`, and `/model` in Kiro and in Claude Code. Set `confirmed: true` for each one that matches, and check whether your Claude plan includes Fable. | Human, or an agent in each tool | Before phase 4 |
| Phase 3. Write the skills the agent files list: acceptance-testing, blast-radius, briefing, code-review, diagnosing-bugs, domain-modeling, engineering-principles, implement-slice, interviewing, regression-testing, retro, security-review as a stub marked TODO, slicing, spec-writing, tdd, technical-writing, upstream-sync, and writing-for-agents. Pin upstream commits in `chrysalis/UPSTREAM.md`, and update `THIRD_PARTY_NOTICES.md`. | Agent | After phase 2 |
| Phase 3. Build the tracker CLI with the local and GitHub adapters, including `--body-file -`, and create the `backlog` branch as an orphan. Test the GitHub adapter against a fake `gh`. `chrysalis/workflow/tracker.md` has both rules. | Agent | After phase 2 |
| Phase 4. Write the JabStack stack profile in `chrysalis/stacks/jabstack/`. It defines the `stack:database`, `stack:backend`, and `stack:frontend` write-scope patterns and the `stack` command group. | Agent | After phase 3 |
| Phase 4. Write the generator for `.cursor/agents/`, `.kilo/agents/`, `.kiro/agents/`, `.kiro/hooks/`, `.claude/agents/`, and `.claude/settings.json`, the app setup script, and `check.ts`. The generated deny rules cover the whole always-denied list in `chrysalis/templates/agent.md`, which includes `gh api`, not only `gh pr merge`. | Agent | After phase 3 |
| Phase 5. Run a pilot app in `evals/` through one feature end to end, and fix what breaks. | Agent and human | After phase 4 |
| Write the security-review skill content. | Human and an agent | Security session, Q-05 |
| Work through `jabstack-changes.md`. | Human and an agent | Stack session |
| File the JabStack changes as issues in `jabarihunt/jabstack`. | Agent, after the human approves | After the stack session |
| Write a Linear tracker adapter. | Agent | When an app needs Linear |
| Move these todos and `open-questions.md` into the factory's tracker, then delete both files. | Factory-maintainer | When the tracker CLI exists |
