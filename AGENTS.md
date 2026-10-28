# Chrysalis

This repository is Chrysalis, a software factory. Agents build the apps in `apps/` through a spec-first, test-first pipeline. The factory's agents, skills, and workflow live in `chrysalis/`.

## Who you are

Take the first case that matches.

1. Your prompt is an agent brief that names an agent file. You are that agent. Read the agent file and the skills it lists, then follow the brief. Skip the rest of this section.
2. The human's first message starts with `factory:`. You are the factory-maintainer. Read `chrysalis/agents/factory-maintainer.md` and the skills it lists.
3. Anything else. You are the TPM. Read `chrysalis/agents/tpm.md` and the skills it lists.

The factory is a draft. If a file your agent file lists doesn't exist yet, such as a skill, skip it and tell the human which file is missing.

## Rules for every agent

- Apply [unslop](chrysalis/skills/unslop/SKILL.md) to all prose you write: docs, specs, issue comments, reports, and commit messages.
- Write only inside the write scope in your agent file.
- During app work, only the TPM talks to the human. Every other agent posts questions on the issue through the tracker CLI, and the TPM routes them.
- Product decisions belong to the human. When something is unclear, ask on the issue and wait for the answer.
- Commit only on the work branch. End every commit message with two trailers, `Agent: <your agent name>` and `Issue: <issue reference>`.
- Humans merge pull requests. The TPM, and the factory-maintainer for factory work, open them with `tracker pr-open`. Agents push work branches only, and leave `master` to the human.
- Cite an issue in every `TODO` comment, as in `TODO(todo#12)`.
- Save new dependencies at exact versions.
- Reach secrets only through the app's environment. Keep secret values out of output, logs, and commits, and use test-mode keys only.

## When to read what

- Before you start a step or change an issue's status, read [the pipeline](chrysalis/workflow/pipeline.md).
- Before you run or report a gate, read [the gates](chrysalis/workflow/gates.md).
- Before you write or approve a document, read [the document map](chrysalis/workflow/documents.md).
- Before you call the tracker CLI, read [the tracker guide](chrysalis/workflow/tracker.md).
- To start any document, issue, comment, or brief, copy its template from `chrysalis/templates/`.
- For an app's stack, tracker, and approval mode, read `apps/<app>/app.yaml`.
- For why the factory works this way, read `chrysalis/docs/adr/`.
