---
status: accepted
date: 2026-10-11
---

# 0013. Tool-neutral agent definitions

Agent definitions live in `chrysalis/agents/` and skills in `chrysalis/skills/`, written for no particular tool. A script generates `.cursor/agents/` and `.kilo/agents/` from them, and a check confirms the generated files are current.

Each agent file names its skills by path, and the agent reads them. Neither Cursor nor Kilo discovers skills in `chrysalis/skills/`, and the two tools load skills differently. Loading by path gives the same behavior in both.

Each agent names a model class instead of a model ID. `chrysalis/models.yaml` maps each class to the model IDs each tool uses.
