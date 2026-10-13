---
status: accepted
date: 2026-10-11
---

# 0002. Humans talk only to the TPM, and agents talk through the tracker

During app work, humans talk only to the TPM, and the TPM accepts requests only from humans. Other agents communicate through comments on the issue, and the TPM routes each question to the agent or human who should answer.

Comments leave one record of every exchange, and routing keeps the TPM in control of the order of work. It also works the same in Cursor and Kilo, where a subagent started by another agent can't ask the user questions.

Each agent run starts with a fresh context and a written brief. Pipeline state lives in the tracker and in files, not in chat history, so any tool can pick up a slice and the larger company can read the factory's state.
