<!-- Retro template. The TPM posts it as a "retro" comment through the tracker CLI after the human merges. The factory-maintainer reads retros to find mistakes that repeat. One event per line. Write "None" under a heading with nothing to report. Delete these comments. -->

Issue: <app>#<n>, merged in <pull request link, or "a local merge" in a repository with no remote>

## What blocked

- <gate>, block <n> of 3: <the cause in one sentence>. Fix owner: <agent>. Evidence: <the verdict comment's time, or for the code review gate, the link to its verdict on the pull request>. Missed: <the file and section that already covered it, or "no rule covers it">

## What the human corrected

- <where: cut, criteria, PRD, ARD, escalation, or chat>: <what the human changed or rejected>, in their words: "<quote>". Missed: <the file and section that should have led the agent there, or "no rule covers it">

## What an agent got wrong

- <agent>: <what it did, and what it should have done>. Caught by: <the gate, the TPM, or the human>. Evidence: <comment time or commit SHA>. Missed: <the file and section that covers it, or "no rule covers it">
