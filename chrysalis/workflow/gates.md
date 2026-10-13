# Gates

A gate decides whether work moves to the next step. Agent gates post a verdict on the issue. Human gates are approvals that the TPM records. [The pipeline](pipeline.md) says when each gate runs.

| Order | Gate | Run by | Applies to |
|---|---|---|---|
| 1 | Spec check | TPM | Slices |
| 2 | Criteria approval | Human | Slices and small changes |
| 3 | RED check | Test agent and `check.ts` | Slices, small changes with criteria, and bugs |
| 4 | RED review | Code review agent | Same as the RED check |
| 5 | Security | Security agent | Setup, slices, small changes, and bugs |
| 6 | Test | Test agent | Setup, slices, small changes, and bugs |
| 7 | Code review | Code review agent | Everything |

## Verdicts

- Gate agents post verdicts with the [gate verdict template](../templates/gate-verdict.md). A verdict is `pass` or `block`, and it names the commit SHA it checked.
- A verdict names the tool and model it ran on, and whether that model's family matches the family of the work it reviewed. A same-family verdict is allowed only in a tool marked `single_family` in `chrysalis/models.yaml`.
- A pass stays valid while every later commit changes only files outside the gate's inputs. The RED review takes the spec and the acceptance tests as input. The security and test gates take every file except docs for people. The code review gate takes every file.
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

The code review agent reviews the tests in the RED commit before any implementation starts. It runs on a different model from the test agent, as [factory ADR 0022](../docs/adr/0022-gate-models-differ-from-the-work-they-review.md) requires, and it changes no files. It reruns `check.ts --red` first. The tests pass the review when every criterion's test:
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

The agent blocks on any spec-axis finding, a missing link, a write-scope violation, or a breach of a documented standard. It reports code smells without blocking.

## Automated checks

`chrysalis/scripts/check.ts` runs these checks. Phase 4 of the factory plan builds the script.

1. The branch or pull request cites an issue, and slice work cites a spec path.
2. The spec is unchanged since the approved commit SHA.
3. With `--red`, every acceptance test fails on an assertion, and the RED commit changes only acceptance test files.
4. The acceptance tests are unchanged since the RED commit SHA.
5. Every criterion ID in the spec has exactly one test.
6. Every commit has `Agent:` and `Issue:` trailers, and each commit's files are inside that agent's write scope.
7. Each gate's latest verdict is a pass that is still valid for the current commit.
8. Every `TODO` comment cites an issue.
9. A pull request changes either the factory or one app.
10. For factory changes, the generated tool files match `chrysalis/agents/`.
