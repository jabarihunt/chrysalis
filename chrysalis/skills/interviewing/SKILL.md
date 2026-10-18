---
name: interviewing
description: How the TPM asks the human questions at intake, at app setup, and whenever a request leaves a decision open, and how it records the answers. The TPM reads it before it questions the human.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/productivity/grilling/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: The tree of decisions, asking the whole frontier in numbered rounds with a recommended answer for each, looking up facts instead of asking for them, and finishing only when nothing is left assumed.
    - repo: mattpocock/skills
      path: skills/engineering/grill-with-docs/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Writing the answers down as the interview goes.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the TPM. Answers become decision comments on the issue, and the end of an interview depends on whether it's intake or app setup.
---

# Interviewing

Product decisions belong to the human, and every later agent works only from what the interview recorded. Ask until nothing is left to guess, in as few rounds as you can, and write every answer down.

You interview at three points:
- at intake of a feature request, until you can state the feature in one paragraph,
- at app setup, until the notes cover the PRD and the ARD,
- when a bug or small change leaves a decision open.

## Map the decisions first

Every decision opens others. Whether a task can have a due date comes before whether overdue tasks send reminders. Treat the open decisions as a tree. The frontier is every decision whose prerequisites are settled, so you can ask about it now without assuming an answer you haven't heard.

Before you ask anything, read what's already settled: the PRD, the ARD, the ADRs, earlier issues, and the code. When a document already made a decision, cite it and move on.

## Ask in rounds

Ask the whole frontier in one message.

- Number each question.
- Give each one your recommended answer and a short reason.
- Word it so that "yes" accepts your recommendation.
- Offer numbered options when there are a few clear choices.

Hold a question for a later round when its answer depends on another question in this round. After each round, recompute the frontier from the answers and ask the next round.

For example:

> 1. Can a task have more than one due date? I recommend one, because reminders and sorting both need a single date. One due date per task?
> 2. Should overdue tasks show in red on the list page? I recommend yes, since the PRD's second goal is fewer missed tasks. Show overdue tasks in red?

A question about reminders before the due date waits for the next round, because it depends on the answer to question 1.

## Look up facts, and ask for decisions

Facts are your job, such as what the code does today, what a document says, or what a service supports. Find them by reading the files yourself. When a fact takes a while to find, ask the questions that don't depend on it now, and hold the rest until you have it. Ask the human only for decisions: what the product should do, for whom, and within what limits.

## Record every answer

Post the answers after each round, in the human's words, as your agent file describes. Include each question with its answer. The spec writer reads only the issue, so an answer left in chat is lost.

## Finish only when nothing is assumed

The interview is done when the frontier is empty and you've assumed nothing. Then:
- for a feature, state it in one paragraph and ask the human to confirm it,
- for app setup, confirm that the notes answer every section of [the PRD template](../../templates/prd.md) and [the ARD template](../../templates/ard.md), and ask about each section they don't.

Hand the work on only after the human confirms.

An escalation isn't an interview. It asks one question, in the format of [the escalation template](../../templates/escalation.md).
