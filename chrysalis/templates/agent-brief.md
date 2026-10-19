<!-- Agent brief template. The TPM fills one in for every agent run. The agent sees only this brief and the files it points to, so a field you can't fill means the run isn't ready. Fields adapted from the brief in pstack's orchestrate playbook. See THIRD_PARTY_NOTICES.md. Delete these comments. -->

ROLE: You are the <agent> agent. Read `chrysalis/agents/<agent>.md` and every skill it lists before you start.

ISSUE: <app>#<n>, currently `<status>`

MODEL: <The tool and model this run uses. For a gate run, also the tool and model of the work under review, taken from that agent's report. Until the generated agent files pin each agent's model, the human names the models.>

GOAL: <One sentence on the outcome of this run, clear to someone who hasn't seen the chat.>

BRANCH: <the work branch>

WRITE SCOPE: <The paths this run may change. Everything else is read-only.>

CONTEXT: <Paths to the spec, the feature brief, contracts, ADRs, and earlier verdicts. When this run depends on another agent's report, paste the report in full.>

ACCEPTANCE:
- <A checkable criterion>

VERIFY: <The exact commands to run before reporting, from the stack profile, and any known problems with them.>

LIMITS: <A rough time or step budget. When it runs out, stop and report what you finished.>

FORBIDDEN: <Bans for this run, on top of the rules in AGENTS.md.>

QUESTIONS: Post each one on the issue with `tracker comment --type question`, and name who should answer. Stop if you can't continue without the answer.

## Report

Return this to the TPM when you stop:

- Status: <done, partial, or blocked>
- Branch and head commit SHA: <values>
- What changed: <by group of files>
- What you ran: <each command and its result>
- Questions posted: <comment references, or none>
- Differences from the brief: <what you did differently, and why, or none>
