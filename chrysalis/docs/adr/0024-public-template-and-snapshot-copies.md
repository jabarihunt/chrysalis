---
status: accepted
date: 2026-10-14
---

# 0024. The public repository is a template, and apps live in snapshot copies

`jabarihunt/chrysalis` is public and marked as a GitHub template repository. It's never a working project. It holds the factory and no apps, and app setup stops when `origin` is the template. Everyone who builds apps, the factory's owner included, makes a copy with GitHub's "Use this template" and builds there. Inside a copy, ADR 0001 holds, and the factory and its apps share one repository. A copy can be private, which keeps its apps and its tracker issues out of public view.

A copy is a snapshot. It shares no history with the template, and from then on the copy's own factory-maintainer changes its factory. Nothing flows between a copy and the template after the copy is made, so later template changes reach only new copies.

The template's `backlog` branch holds the template's own factory issues and stays with the template. A copy gets only `master`, and its tracker starts a new, empty `backlog`. By the time the template is ready for copies, its `backlog` holds no issues.

The factory has no pilot app. The evals run in the template through their own runner, which never calls app setup and never writes to `apps/`, so the stop on app setup in the template has no exceptions. The evals' first run takes one feature through every agent and gate. It also compares gate findings across tools, the job ADR 0022 gave the pilot. The app setup script's own tests run it end to end in a temporary folder. The template isn't ready for copies until the human's first feature in their own copy has merged, because canned answers can't show whether the TPM's summaries and questions read well to a person.

## Considered options

- Copies that keep the template as a remote and merge its updates. Each copy changes its own factory, so every merge would conflict wherever the copy had changed the same files.
- Updating a copy by replacing its `chrysalis/` with a newer template's. That would overwrite the copy's own factory changes.
- A pilot app in a throwaway copy. It would run once, while the evals rerun after every factory change, and the human's first real feature checks the steps the evals can't.
- Letting app setup run in `evals/` inside the template. The stop would have an exception, and an eval app would sit in the public repository.
- Building apps in a fork. GitHub keeps every fork of a public repository public, so its apps would be public, and anyone could comment on its GitHub issues, which the GitHub tracker passes to agents through `tracker show`.

## Consequences

- Rulesets don't copy with a repository. Each copy imports `.github/rulesets/protect-master.json`, as ADR 0025 describes.
- This ADR, the README's copy steps, and the origin check in app setup ship to every copy. In a copy, the check passes.
