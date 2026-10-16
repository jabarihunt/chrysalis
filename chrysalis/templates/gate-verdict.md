<!-- Gate verdict template. Gate agents post this as a "verdict" comment through the tracker CLI, which writes the header line. Delete these comments. -->

Gate: <red-review, security, test, or code-review>
Verdict: <pass or block>
Commit: <the SHA checked>
Range: <the git range reviewed, such as master...HEAD>
Block count: <blocks at this gate on this issue, including this one, such as 1 of 3>
Model: <tool and model ID, such as kiro claude-opus-5.5>
Same family as the reviewed work: <yes or no. Yes is allowed only in a tool marked single_family in chrysalis/models.yaml.>

## Findings

<"None" on a clean pass. On a block, every finding that caused it.>

| # | Severity | Where | Finding | Breaks | Fix owner |
|---|---|---|---|---|---|
| 1 | <critical, high, medium, or low> | <file and line, or test name> | <what is wrong> | <criterion ID, ARD requirement ID, or standard> | <agent> |

## Not blocking

<Findings that don't block. The TPM may turn them into issues. "None" if there are none.>
