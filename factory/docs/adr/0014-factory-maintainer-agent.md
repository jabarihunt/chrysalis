---
status: accepted
date: 2026-10-11
---

# 0014. A factory-maintainer agent changes the factory

Only the factory-maintainer changes `factory/`, the root `AGENTS.md`, generated tool config, and CI. The TPM never does. A session becomes a maintainer session when the human's first message starts with `factory:`. The prefix works in every tool, because every tool loads `AGENTS.md`.

A skill change alters how every app gets built. Maintainer work therefore gets its own session, runs the factory's evals before proposing a change, and lands in its own pull request. The maintainer also runs upstream enhancement sessions and reviews the TPM's retro comments.
