---
status: accepted
date: 2026-10-14
---

# 0024. The public repository is a template, and apps live in copies

`jabarihunt/chrysalis` is public and marked as a GitHub template repository. It holds the factory and no apps. Everyone who builds apps, the factory's owner included, makes a copy and builds there. Inside a copy, ADR 0001 still holds, and the factory and its apps share one repository. A copy can be private, which keeps its apps and its tracker issues out of public view. ADR 0026 says how a copy is made and how factory changes move between it and the template.

A fork works for sending factory changes back. GitHub keeps every fork of a public repository public, so apps built in a fork are public too, and anyone can comment on the fork's GitHub issues. The GitHub tracker passes those comments to agents through `tracker show`.

## Consequences

- App setup stops when `origin` is the template.
- Rulesets don't copy with a repository. Each copy imports `.github/rulesets/protect-master.json`, as ADR 0025 describes.
