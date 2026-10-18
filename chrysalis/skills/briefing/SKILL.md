---
name: briefing
description: How the TPM writes the brief that starts each agent run, so the agent can finish without asking anything. The TPM reads it before writing any brief.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/poteto-mode/playbooks/orchestrate.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: The brief as the coordinator's product, filling every field before a run starts, pasting upstream reports in full, sizing the brief to the work, and starting fresh instead of extending an old brief.
    - repo: mattpocock/skills
      path: skills/engineering/triage/AGENT-BRIEF.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Behavior over procedure, checkable acceptance criteria, and explicit scope, with good and bad examples.
    - repo: mattpocock/skills
      path: skills/productivity/handoff/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Pointing to existing documents instead of copying them, and leaving secrets out.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the TPM and the Chrysalis brief template. The orchestrate playbook's queue, store, and cloud machinery are left out.
---

# Briefing

The brief is your product. Each agent starts with a fresh context and sees only the brief and the files it points to, so it can't ask you what you meant. A vague brief fails without warning. The agent guesses, and the guess looks like an answer until a gate catches it.

## Fill every field

Your agent file has you fill every field of [the agent brief template](../../templates/agent-brief.md). The ROLE, ISSUE, BRANCH, and QUESTIONS lines come straight from the issue. These fields take judgment:

- GOAL: the outcome in one sentence, clear to someone who never saw the chat. "The four acceptance tests for due-dates-01 pass" is a goal. "Work on due dates" is a topic.
- WRITE SCOPE: the agent file's write scope, narrowed to this run where you can.
- CONTEXT: paths to the spec, the feature brief, contracts, ADRs, and earlier verdicts. When the run depends on another agent's report, paste the report in full, because agents can't see each other.
- ACCEPTANCE: checkable criteria, one per line, each one true or false on its own. For a slice, take them from the spec.
- VERIFY: the exact commands from the stack profile, and any known trouble with them.
- LIMITS: a time or step budget, and what the agent reports when it runs out.
- FORBIDDEN: bans for this run only. `AGENTS.md` and the agent file cover the rest.

## Describe the outcome, and leave the method to the agent

Say what must be true when the agent finishes, and which contract it must meet. "The due date route returns 400 with the message from AC-03 when the date is in the past" leaves the design to the backend agent. "Add an if statement to the handler" makes the agent's decision for it, and it breaks when the code isn't shaped the way you pictured.

## Quote what you relay

When you pass on a question, an answer, a verdict, or another agent's report, quote it in full. A summary drops detail the next agent needed, and nobody can tell which detail it dropped.

## Size the brief to the run

A one-line fix gets a short brief that still names the goal, the scope, the verify command, and the report. A large run gets every field in full. When a run outgrows its scope, stop it and write a new brief with the combined scope, instead of adding instructions to the old one.

## Point at secrets by name

Refer to a secret by its environment variable name. Keys, tokens, and passwords stay out of briefs.

## Check the brief before you start the agent

- Every field is filled.
- A stranger could tell from the brief alone when the work is done.
- Every file the agent must read is in CONTEXT, and every report it depends on is pasted in.
- The VERIFY commands run.

Bad:

> GOAL: Fix the due date bug.
> CONTEXT: See the chat.

Good:

> GOAL: The regression test for todo#14 passes, and the rest of the suite still passes.
> WRITE SCOPE: The backend files the stack profile lists for apps/todo.
> CONTEXT: The bug issue todo#14 and its comments. The slice spec at apps/todo/docs/features/due-dates/slices/01-set-due-date.md. The test agent's report, pasted below.
> ACCEPTANCE: The test "[todo#14 AC-03] rejects a due date in the past" passes. Every other test, the typecheck, and the lint pass.
