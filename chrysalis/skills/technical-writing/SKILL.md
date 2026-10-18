---
name: technical-writing
description: How to write docs for people, which are the app README, guides, the changelog, and pull request bodies. The documentation agent reads it before writing any of them.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/technical-writing/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Picking one Diátaxis mode per document, sentence rules from Google developer style, Simplified Technical English, and Global English, and treating a pull request body as a short briefing.
    - repo: mattpocock/skills
      path: skills/engineering/pr/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Showing the smallest view that makes a change clear, before and after evidence, and saying how hard a change is to reverse and what it could affect.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the documentation agent and the Chrysalis PR body template. Rules that unslop already covers are left to unslop.
---

# Technical writing

Write so a tired developer understands on the first read. Your readers are the app's users and the developers who work on it, and they read your docs to get something done. Apply unslop to everything you write, and these rules on top of it.

## Pick the mode first

Each document does one job. Two questions pick it: does the reader want to do something or understand something, and are they learning or working?

- A tutorial teaches by doing. Every step produces a result the reader can see, and you tell them what they should see.
- A how-to guide gives the steps to one goal, for a reader who knows the basics. Name it by the task, as in "Set a due date on a task". Keep it to actions, and link the background.
- Reference holds facts to look up, such as settings, commands, and error messages. Keep it dry and complete, and arrange it the way the thing it describes is arranged.
- Explanation covers why something works the way it does. It's the only mode for opinion and history.

Guides in `docs/guides/` are how-to guides. The changelog is reference. A README usually says what the app is, walks through getting it running, and links the rest. Keep the modes apart: when a guide needs a table of settings, link to the reference page that holds it.

## Write each sentence to the reader

- Address the reader as "you", in the present tense.
- Name who does what. "The app sends a reminder" names the actor. "A reminder is sent" hides it.
- Write each step as a command with one action. "Select **Save**."
- Put the condition before the instruction. "To remove a due date, select **Clear**."
- Put the common case first and the exceptions after it.
- Keep steps under about 20 words and other sentences under about 25.
- Leave out "simply", "just", "easy", and "quickly". A reader who is stuck feels worse for reading them.
- Use one word for each thing and each action, and keep using it. When the button says Archive, the guide says "archive" every time.
- Keep "the" and "a", and the small words that show structure. "Remove the backup file" reads one way, and "Remove backup file" reads two.
- Make every "it" and "this" point at one obvious noun. Repeat the noun when in doubt.
- Put "only" and "not" next to the word they change.

## Show the real thing

- Write the exact command, setting, or file name in code font, and the exact label of anything on screen in bold.
- Run every command you document, and show what the reader sees after it.
- Make every count and list true at the commit that adds it.
- Give each link text that says where it goes, such as the page title. "Click here" says nothing.

## Use headings and lists that carry the point

- Write headings in sentence case. A task heading is a verb phrase, such as "Set a due date". Use one top-level heading per page, and skip no levels.
- Number the steps that go in order, and use bullets for everything else. Introduce each list with a full sentence, and keep its items parallel.

## Write changelog lines for the reader

Say what changed for the reader, in their words. "You can now set a due date on a task (todo#4)" tells a user something. "Add due_date column" tells them nothing.

## Write the pull request body as a briefing

Fill [the PR body template](../../templates/pr-body.md). The human reads it in about a minute before opening the pull request, so write a briefing, not a log.

- In the summary, say what a user can now do. Then show the smallest view that makes the change clear: a short file tree, a call tree, a before-and-after sketch of a screen's structure, or a diagram. One or two views are enough.
- In "How to check it", give the steps or commands that show the change working, and what the reviewer sees before and after.
- In "Risks and follow-ups", say how hard the change is to undo, and what else it could affect. A change that deletes data or alters a contract other code depends on is hard to reverse, and the human needs to know that before merging.
- Link logs and long tables instead of pasting them.

## Example

Before:

> Configuration of reminder settings is performed via the settings page. It is important to note that reminders, which are sent before the due date, should only be enabled if email is set up.

After:

> To get reminders, set up email first. Then open **Settings** and turn on **Reminders**. The app emails you one day before each due date.
