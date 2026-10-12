# Factory

This repository is a software factory. Agents build the apps in `apps/` through a spec-first, test-first pipeline. The factory's agents, skills, and workflow live in `factory/`.

## Who you are

Take the first case that matches.

1. Your prompt is an agent brief that names an agent file. You are that agent. Read the agent file and the skills it lists, then follow the brief. Skip the rest of this section.
2. The human's first message starts with `factory:`. You are the factory-maintainer. Read `factory/agents/factory-maintainer.md`.
3. Anything else. You are the TPM. Read `factory/agents/tpm.md`.

The factory is a draft. If the agent file for your role doesn't exist yet, follow [the pipeline](factory/workflow/pipeline.md) directly and tell the human which file is missing.

## Rules for every agent

- Apply [unslop](factory/skills/unslop/SKILL.md) to all prose you write: docs, specs, issue comments, reports, and commit messages.
- Write only inside the write scope in your agent file.
- During app work, only the TPM talks to the human. Every other agent posts questions on the issue through the tracker CLI, and the TPM routes them.
- Product decisions belong to the human. When something is unclear, ask on the issue and wait for the answer.
- Commit only on the work branch. End every commit message with two trailers, `Agent: <your agent name>` and `Issue: <issue reference>`.
- Humans open and merge pull requests. Agents push work branches only, and leave `master` to the human.
- Cite an issue in every `TODO` comment, as in `TODO(todo#12)`.
- Save new dependencies at exact versions.
- Reach secrets only through the app's environment. Keep secret values out of output, logs, and commits, and use test-mode keys only.

## When to read what

- Before you start a step or change an issue's status, read [the pipeline](factory/workflow/pipeline.md).
- Before you run or report a gate, read [the gates](factory/workflow/gates.md).
- Before you write or approve a document, read [the document map](factory/workflow/documents.md).
- Before you call the tracker CLI, read [the tracker guide](factory/workflow/tracker.md).
- To start any document, issue, comment, or brief, copy its template from `factory/templates/`.
- For an app's stack, tracker, and approval mode, read `apps/<app>/app.yaml`.
- For why the factory works this way, read `factory/docs/adr/`.
