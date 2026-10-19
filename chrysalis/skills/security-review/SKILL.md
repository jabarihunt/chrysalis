---
name: security-review
description: A stub for the checks the security agent runs at the security gate beyond the gate's own list. The security agent reads it before every security gate.
metadata:
  sources: []
  license: No upstream material yet.
  changes: A stub. The security session writes its content.
---

# Security review

TODO(factory#14): Write this skill's checks. Q-05 holds the open question of what the skill checks and which scanners back it.

This skill has no checks of its own yet. Until it does, the [security gate's list](../../workflow/gates.md#security) is the whole checklist, and your agent file's steps say how to work through it.
