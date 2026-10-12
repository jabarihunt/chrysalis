---
status: accepted
date: 2026-10-11
---

# 0009. Gate blocks stand until the same gate passes

Only a pass from the gate that blocked can clear a block. The TPM can't lift a block or skip a gate. When a gate blocks for the third time on one issue, the TPM escalates to the human instead of trying a third fix.

A pass covers the commit it names. A fix that changes a gate's inputs invalidates that gate's pass, so the gate runs again. Without these rules, an orchestrator under pressure to finish could argue its way past a reviewer.
