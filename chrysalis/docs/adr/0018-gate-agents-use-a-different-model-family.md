---
status: accepted
date: 2026-10-11
---

# 0018. Gate agents use a different model family from the work they review

Each gate agent runs on a different model family from the agent whose work it reviews. The code review agent's RED review runs on a different family from the test agent. The security, test, and code review gates run on a different family from the implementers. A reviewer on the same model tends to share the blind spots of the model that wrote the work. `chrysalis/models.yaml` sets the families.
