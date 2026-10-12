---
status: accepted
date: 2026-10-11
---

# 0020. Factory ADRs stay separate from app ADRs, under factory/docs

Factory ADRs and planning notes live in `factory/docs/`, and each app's ADRs live in `apps/<app>/docs/adr/`. The two sets have different writers, the factory-maintainer and the spec writer. They also have different readers. App agents read their own app's ADRs before every spec, and factory process decisions would only fill their context.

An app ADR may cite a factory ADR, but a factory ADR never cites an app ADR. When an app departs from a factory default, its own ADR records the departure and cites the factory ADR it departs from.

`factory/docs/adr/` mirrors `apps/<app>/docs/adr/`. Everything the factory-maintainer owns sits under `factory/` or at the repository root, so the maintainer's write scope and the check that a pull request changes either the factory or one app each need one rule. If the factory moves into the larger company's repositories, its decisions move with it, and the root `docs/` stays free for company-level documents.

## Considered options

- Factory ADRs in the root `docs/adr/`. It's the conventional place, but it splits the factory's files across two top-level folders.
