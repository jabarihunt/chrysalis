---
status: accepted
date: 2026-10-11
---

# 0012. Our own skills, built from parts of upstream skills

Agents use skills that we write in `factory/skills/`. We build them from the parts of Matt Pocock's skills and pstack that we need. We take what a skill does, not the workflow around it, and leave the rest of both repositories behind. Humans never use the upstream skills directly.

We install no plugins. Each plugin works in only one tool, and plugins would put upstream workflows in the human's menus. Each skill records the upstream files and commit it came from. Upstream changes come in only through enhancement sessions that diff the pinned commit against the latest one.

Both upstream repositories use the MIT license. `THIRD_PARTY_NOTICES.md` carries their notices and lists every file that copies or adapts upstream material.
