# Documents

Each document has one writer and one home. The spec writer writes for agents. The documentation agent writes for people. Unslop applies to both.

## App documents

| Document | Holds | Written by | Approved by | Path | After approval |
|---|---|---|---|---|---|
| App config | The stack, tracker, and spec approval mode | TPM, through the app setup script | Human, at setup | `apps/<app>/app.yaml` | Changes only at the human's request |
| PRD | The problem, users, goals, and user stories for the whole app | Spec writer | Human | `apps/<app>/docs/prd.md` | Changes go through a slice or a docs-only request, and the human approves them |
| ARD | Requirements and constraints for the whole app, each with an ID and the gate that checks it | Spec writer | Human | `apps/<app>/docs/ard.md` | Same as the PRD |
| Glossary | Domain terms that specs, code, and tests share | Spec writer | Spec check | `apps/<app>/docs/glossary.md` | Any slice may add or sharpen a term |
| ADR | One decision and why it was made | Spec writer | Human for escalation answers, spec check otherwise | `apps/<app>/docs/adr/NNNN-<slug>.md` | The decision is never edited. A new ADR supersedes it. Paths and names may be updated after a rename. |
| Feature brief | A feature's problem, users, stories, and cut | Spec writer | Human approves the cut | `apps/<app>/docs/features/<feature>/brief.md` | A changed cut needs the human's approval |
| Slice spec | One slice's criteria, contract changes, layers, test seams, and what's out of scope | Spec writer | Spec check, then the human under the app's approval mode | `apps/<app>/docs/features/<feature>/slices/NN-<slice>.md` | Frozen. A change needs a new spec check and approval. |
| Contracts | Schema, route types, and API definitions | The implementer for that layer | Code review | Set by the stack profile | Change only as a spec describes |
| Acceptance tests | One test per criterion | Test agent | RED check, RED review, and test gate | `apps/<app>/tests/acceptance/<feature>/` | Frozen at the RED commit |
| Docs for people | Guides, the README, and the changelog | Documentation | Code review | `apps/<app>/README.md`, `apps/<app>/CHANGELOG.md`, `apps/<app>/docs/guides/` | Updated by each slice that changes what people see |

Small changes, bugs, and docs-only work have no spec file. The issue body is the spec.

## Factory documents

| Document | Written by | Path |
|---|---|---|
| Agent instructions | Factory-maintainer | `AGENTS.md`, `CLAUDE.md`, `chrysalis/agents/` |
| Workflow | Factory-maintainer | `chrysalis/workflow/` |
| Model classes | Factory-maintainer | `chrysalis/models.yaml` |
| Templates | Factory-maintainer | `chrysalis/templates/` |
| Skills | Factory-maintainer | `chrysalis/skills/` |
| Factory ADRs | Factory-maintainer | `chrysalis/docs/adr/` |
| Planning notes | Factory-maintainer | `chrysalis/docs/planning/` |

## Rules

- Specs, briefs, and ADRs name modules by glossary term. They leave out file paths, which go stale.
- When two documents conflict, the agent that notices stops and asks on the issue, and the TPM escalates. No agent picks which document wins.
- Factory ADRs and app ADRs are separate sets, each numbered from 0001. An app ADR may cite a factory ADR, but a factory ADR never cites an app ADR. When an app departs from a factory default, such as its stack or its auth, the spec writer records an app ADR that cites the factory ADR it departs from.
- Every document starts from its template in `chrysalis/templates/`.
