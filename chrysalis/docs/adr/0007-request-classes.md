---
status: accepted
date: 2026-10-11
---

# 0007. Request classes

The TPM classifies each request as a new app, a feature, a small change, a bug, or a docs-only change, and sends factory changes to the factory-maintainer. Each class has its own path through the pipeline.

Running a typo fix through a feature brief, a slice spec, and every gate costs more than the change. A small change gets a short spec in the issue and still goes through the security, test, and code review gates. A bug skips the spec writer when the TPM can cite the approved criterion or requirement the bug breaks. If the TPM can't cite one, the request isn't a bug, because the expected behavior was never approved.
