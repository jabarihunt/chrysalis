# Gates

A gate decides whether work moves to the next step. Agent gates post a verdict on the issue, except the code review gate, which posts on the pull request. Human gates are approvals that the TPM records. [The pipeline](pipeline.md) says when each gate runs.

| Order | Gate | Run by | Applies to |
|---|---|---|---|
| 1 | Spec check | TPM | Slices |
| 2 | Criteria approval | Human | Slices and small changes |
| 3 | RED check | Test agent and `check.ts` | Slices, small changes with criteria, and bugs |
| 4 | RED review | Code review agent | Same as the RED check |
| 5 | Security | Security agent | Setup, slices, small changes, and bugs |
| 6 | Test | Test agent | Setup, slices, small changes, and bugs |
| 7 | Code review | Code review agent | Everything, including factory changes |

## Verdicts

- Gate agents post verdicts with the [gate verdict template](../templates/gate-verdict.md). A verdict is `pass` or `block`, and it names the commit SHA it checked. The tracker CLI reads the `Gate:`, `Verdict:`, and `Commit:` lines, and refuses a verdict without them or from an agent that doesn't run that gate.
- The code review gate posts its verdict on the pull request with `tracker pr-verdict`, which also sets the `chrysalis/code-review` commit status. The verdict holds the whole review, and its commit is the pull request's head commit. Code review results stay off the issue: the verdict, its findings, and any summary of them go only on the pull request. The one exception is the retro, which names each code review block's cause in one sentence and the rule it missed, and links the verdict. In a repository with no remote, no pull request exists, so the verdict goes on the issue. [Factory ADR 0026](../docs/adr/0026-code-review-verdicts-go-on-the-pull-request.md) explains why, and [the tracker guide](tracker.md#code-review-verdicts) describes the command.
- A verdict names the tool and model it ran on, and whether that model's family matches the family of the work it reviewed. A same-family verdict is allowed only in a tool marked `single_family` in `chrysalis/models.yaml`. When the tool doesn't tell the agent which model it runs, the agent copies both models from the brief's MODEL field and writes "attested in the brief" after them. TODO(factory#9): Once the generated agent files pin each agent's model, the gate's own model comes from its agent file.
- A pass stays valid while every later commit changes only files outside the gate's inputs. The RED review takes the spec and the acceptance tests as input. The security and test gates take every file except docs for people. The code review gate takes every file, and the pull request's title and body. `tracker pr-edit` withdraws a code review pass by setting the `chrysalis/code-review` status back to `pending`, so the gate runs again after every edit.
- A block sets the issue to `blocked`. Only a pass from the same gate clears it.
- Each block counts toward that gate's limit on the issue. The third block goes to the human.

## Spec check

The TPM runs this checklist on every slice spec. The spec passes when every item holds:

- The spec follows the [slice spec template](../templates/slice-spec.md), and every section is filled or says "None".
- Each acceptance criterion has an ID, Given, When, and Then lines, one observable outcome, and the seam where a test observes it.
- The slice has at most eight criteria.
- Each criterion traces to a user story in the feature brief.
- The spec states what's out of scope.
- The spec uses glossary terms. New terms are in the glossary on the same branch.
- The spec describes each contract change: which contract, and what changes.
- Nothing in the spec contradicts the PRD, the ARD, or an accepted ADR. A new decision the slice needs has a proposed ADR.
- No open questions remain.
- The spec names modules by glossary term instead of file path, and it contains code only for contract shapes.
- The prose passes unslop.

## Criteria approval

The TPM shows the human a summary with:
- the slice title and what it delivers,
- each criterion in plain language, with its ID,
- what's out of scope,
- each contract change.

The human approves all of it or asks for changes. The TPM records the approval in the human's words with the commit SHA of the approved spec.

## RED check

The test agent runs this check on its own tests before it reports. It confirms that:
- one test exists per criterion, and its name carries the slice ID and the criterion ID,
- each test fails because the behavior is missing, not because of a setup error, a syntax error, or a missing fixture,
- the tests drive the app only through the seams the spec names.

The test agent then runs `chrysalis/scripts/check.ts --red` on the RED commit. The script confirms that:
- each criterion ID in the spec has exactly one test,
- every one of those tests fails on an assertion, not on an error thrown before one,
- the RED commit changes only acceptance test files.

For a bug, the same checks apply to the single regression test and the criterion it protects.

## RED review

The code review agent reviews the tests in the RED commit before any implementation starts. It runs on a different model from the test agent, as [factory ADR 0027](../docs/adr/0027-gates-differ-from-every-class-they-review.md) requires, and it changes no files. It reruns `check.ts --red` first. The tests pass the review when every criterion's test:
- asserts the criterion's Then line, with expected values taken from the spec instead of computed the way the code would compute them,
- reaches the app only through the seam the spec names,
- would fail if the feature returned nothing or did nothing.

On a block, the test agent fixes the tests, and the RED check and the RED review run again. When the review passes, the TPM records the RED commit SHA on the issue and sets `red`.

## Security

The security-review skill is a stub until the security session fills it in. Until then, the security agent checks at least these:
- No secrets in commits, logs, error messages, or responses.
- Authentication and authorization on every new route, page, and form action.
- Input validation where data enters the app.
- Responses and pages return only data the current user may see.
- New dependencies are pinned to exact versions and have no known advisories.
- Every security requirement in the ARD holds.

The agent blocks on any finding it rates high or critical, and on any unmet ARD security requirement. It lists lower findings under "Not blocking", and the TPM may turn them into issues.

## Test

The test agent passes the gate when:
- the acceptance test files are unchanged since the RED commit,
- every criterion has a test with its ID, and every test passes,
- the full test suite, the typecheck, and the lint pass, using the stack profile's commands,
- each new unit test calls code the way its users do and asserts on what they observe, so it would fail if every imported function returned `undefined`,
- no test was skipped or deleted unless the spec says so.

## Code review

The code review agent reports two axes separately and doesn't rank one against the other.
- The spec axis checks that the change does everything the spec or issue asks, nothing outside it, and nothing wrong.
- The standards axis checks the change against the repository's documented standards and the stack profile's rules. Code smells such as duplicated code or speculative generality are judgement calls.

The agent also confirms that:
- the pull request body cites the issue and, for slices, the spec path,
- every commit has `Agent:` and `Issue:` trailers, and each commit's files are inside that agent's write scope,
- every earlier gate has a valid pass for the current commit,
- `chrysalis/scripts/check.ts` passes.

Until `check.ts` exists, the agent writes "check.ts: not built yet" under the verdict's Checks and doesn't block on it. TODO(factory#9): Remove this exception once `check.ts` exists.

The agent blocks on any spec-axis finding, a missing link, a write-scope violation, or a breach of a documented standard. It reports code smells without blocking.

Every factory pull request goes through this gate, and the factory-maintainer is the fix owner for its findings. The human may waive the gate for one factory pull request. The factory-maintainer then records the waiver as a `decision` comment on the issue, in the human's words, before setting `ready-to-merge`. [Factory ADR 0028](../docs/adr/0028-factory-pull-requests-go-through-code-review.md) explains why.

## Automated checks

`chrysalis/scripts/check.ts` runs these checks. Phase 4 of the factory plan builds the script.

1. The branch or pull request cites an issue, and slice work cites a spec path.
2. The spec is unchanged since the approved commit SHA.
3. With `--red`, every acceptance test fails on an assertion, and the RED commit changes only acceptance test files.
4. The acceptance tests are unchanged since the RED commit SHA.
5. Every criterion ID in the spec has exactly one test.
6. Every commit has `Agent:` and `Issue:` trailers, and each commit's files are inside that agent's write scope.
7. Each gate's latest verdict is a pass that is still valid for the current commit. The code review gate's latest verdict is the one on the pull request.
8. Every `TODO` comment cites an issue.
9. A pull request changes either the factory or one app.
10. For factory changes, the generated tool files match `chrysalis/agents/`.
