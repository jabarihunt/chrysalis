# To do

This is agreed work that hasn't started. Phase numbers refer to the factory implementation plan from the 2026-10-11 planning session. Once the factory's tracker CLI exists, these items move to the tracker as issues and this file is deleted.

| Item | Owner | When |
|---|---|---|
| If an agent session uses JabStack's Stripe MCP entry, switch it to OAuth or a sandbox Agent API key. Stripe MCP stops accepting full-access secret keys on 2026-10-31. Apps that call Stripe through the SDK aren't affected. | Human | Before 2026-10-31 |
| Confirm the drafted model IDs in `chrysalis/models.yaml`: the Cursor model picker, `kilo models`, and `/model` in Kiro and in Claude Code. Set `confirmed: true` for each one that matches, and check whether your Claude plan includes Fable. | Human, or an agent in each tool | Before phase 4 |
| Phase 3. Write the skills the agent files list: acceptance-testing, blast-radius, briefing, code-review, diagnosing-bugs, domain-modeling, engineering-principles, implement-slice, interviewing, regression-testing, retro, security-review as a stub marked TODO, slicing, spec-writing, tdd, technical-writing, upstream-sync, and writing-for-agents. Pin upstream commits in `chrysalis/UPSTREAM.md`, and update `THIRD_PARTY_NOTICES.md`. | Agent | After phase 2 |
| Phase 3. Build the tracker CLI with the local and GitHub adapters, including `--body-file -` and the `backlog` branch setup. Test the GitHub adapter against a fake `gh`. `chrysalis/workflow/tracker.md` has the rules for both. | Agent | After phase 2 |
| Phase 4. Write the JabStack stack profile in `chrysalis/stacks/jabstack/`. It defines the `stack:database`, `stack:backend`, and `stack:frontend` write-scope patterns and the `stack` command group. | Agent | After phase 3 |
| Phase 4. Write the generator for `.cursor/agents/`, `.kilo/agents/`, `.kiro/agents/`, `.kiro/hooks/`, `.claude/agents/`, and `.claude/settings.json`, the app setup script, and `check.ts`. The generated deny rules cover the whole always-denied list in `chrysalis/templates/agent.md`, which includes `gh api`, not only `gh pr merge`. | Agent | After phase 3 |
| Phase 5. Make a throwaway copy of the template, and run a pilot app in it through one feature end to end. Fix what breaks here in the template, then delete the copy. | Agent and human | After phase 4 |
| Phase 5. Build `evals/`, with a sample product and canned requests, and a runner that tests a factory change against them. The runner never calls app setup and never writes to `apps/`. | Agent | After phase 4 |
| Release. Before the template is ready for copies, the factory's `backlog` holds no issues, and `chrysalis/docs/planning/` is deleted. | Human and the factory-maintainer | After phase 5 |
| Write the security-review skill content. | Human and an agent | Security session, Q-05 |
| Work through `jabstack-changes.md`. | Human and an agent | Stack session |
| File the JabStack changes as issues in `jabarihunt/jabstack`. | Agent, after the human approves | After the stack session |
| Write a Linear tracker adapter. | Agent | When an app needs Linear |
| Move these todos and `open-questions.md` into the factory's tracker, then delete both files. | Factory-maintainer | When the tracker CLI exists |
