<!-- Gate verdict template. Gate agents post this as a "verdict" comment through the tracker CLI. The header line comes first. Delete these comments. -->

verdict from <agent> at <ISO 8601 time>

Gate: <red-review, security, test, or code-review>
Verdict: <pass or block>
Commit: <the SHA checked>
Range: <the git range reviewed, such as master...HEAD>
Block count: <blocks at this gate on this issue, including this one, such as 1 of 3>

## Findings

<"None" on a clean pass. On a block, every finding that caused it.>

| # | Severity | Where | Finding | Breaks | Fix owner |
|---|---|---|---|---|---|
| 1 | <critical, high, medium, or low> | <file and line, or test name> | <what is wrong> | <criterion ID, ARD requirement ID, or standard> | <agent> |

## Not blocking

<Findings that don't block. The TPM may turn them into issues. "None" if there are none.>
