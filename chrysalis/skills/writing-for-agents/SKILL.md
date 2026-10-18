---
name: writing-for-agents
description: How to write documents that agents read, such as agent files, skills, workflow files, templates, AGENTS.md, and specs. The spec writer and the factory-maintainer read it before writing any of them.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/productivity/writing-for-agents/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Pointers and the wording that triggers them, the cost of always-loaded lines, the ladder of steps, reference, and linked reference, completion criteria, leading words, positive phrasing, and pruning.
    - repo: mattpocock/skills
      path: skills/productivity/writing-for-agents/SKILL-MECHANICS.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: What changes when the document is a skill.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis, where agents read skills by path from their agent files and no tool loads a skill on its own, so the upstream invocation rules don't apply.
---

# Writing for agents

An agent reads your document with a fresh context and does what it says, the same way on every run. Write so it takes the same path each time: it reads the right material at the right moment, it knows when each step is done, and it finds each rule in exactly one place. Apply unslop to the prose too.

## Word each pointer for the case that needs it

A pointer is a line that names other material and the case for reading it, such as a line in the "When to read what" list in `AGENTS.md`, a skill path in an agent file, or a link in a workflow file. Its wording decides whether the agent follows it.

- Say what the material is and which case sends the agent there. "Before you call the tracker CLI, read the tracker guide" names both.
- Give each distinct case one trigger. Two phrasings of one case are one trigger written twice.
- When the agent keeps missing material it needs, sharpen the pointer's wording first. Copy the material inline only when sharpening fails.

## Spend always-loaded lines carefully

`AGENTS.md` loads in every session, so each of its lines costs attention on every run, whether or not it applies. Keep it to routing and the rules every agent needs. Everything else goes behind a pointer, where it costs one line until the agent needs it.

## Put each piece at the right depth

A document holds steps, which are actions in order, and reference, which is rules and facts the agent looks up. Rank each piece by how soon the agent needs it:

1. Steps, in the file.
2. Reference that every case needs, in the file.
3. Reference that only some cases need, in another file behind a pointer.

Leave too much in the file and the steps get lost in it. Move too much out and the agent misses what it needed. Keep in the file what every path through it uses, and link what only some paths use.

Keep a concept's definition, rules, and exceptions under one heading. Scattered pieces get read one at a time and applied out of context.

A document can be too long even when every line is true and in use. Then move reference behind pointers, or split the document by case so each path carries only what it needs.

## End every step on a check

Each step ends on a condition the agent can test. "Read the spec" has no end. "Every criterion names a seam" does.

- Make the condition clear. A vague end, such as "until you understand the code", invites the agent to stop early and hurry on to the steps it can see coming.
- Make it demanding. "Every changed file is inside your write scope" makes the agent check every file. "Check your changes" lets it check one.

The strongest conditions are both checkable and exhaustive.

## Name the behavior you want

- Use a word the model already knows for a whole pattern, such as tracer bullet, frontier, seam, or red. One well-chosen word, repeated, does the work of a sentence every time it appears.
- State the behavior you want. "Write one-line comments" steers better than a ban on long comments, because the ban puts long comments in the agent's mind. When you need a hard ban, pair it with the behavior that replaces it.

## Prune

- Keep each rule in one file, and link to it from everywhere else. A copied rule drifts, and two versions of one rule leave the agent to pick one.
- Leave out what the agent can look up in one step, such as a script in `package.json`, a flag in `--help` output, or a folder's contents. Write down what it can't look up: the reason behind a choice, an unwritten convention, or a trap.
- Cut each instruction the model would follow anyway. Test a sentence by asking whether it changes what the agent does. When it doesn't, cut the whole sentence.
- Delete a stale line as soon as you notice it. A document that only grows keeps old rules that nobody removes.

## Write skills for this repository

Skills live at `chrysalis/skills/<name>/SKILL.md`. An agent reads a skill because its agent file lists the path, and no tool loads these skills on its own. The description is for people browsing the folder, and the body does all of the skill's work.

The frontmatter holds:
- `name`, which matches the folder name,
- `description`, one or two sentences on what the skill covers and which agents read it,
- `metadata.sources`, with one entry per upstream file the skill adapts, giving its `repo`, `path`, `commit`, and what the skill `took` from it,
- `metadata.license` and `metadata.changes`.

Each upstream file a skill adapts also gets a row in `THIRD_PARTY_NOTICES.md`, and its commit goes in `chrysalis/UPSTREAM.md`.
