# Upstream sources

Chrysalis builds its own skills and templates from parts of two MIT-licensed repositories, as factory ADR 0012 describes. This file pins the commit of each repository that the factory's files were last checked against. [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) lists which factory files adapt which upstream files, and each skill's frontmatter names the upstream files and commit it came from.

An upstream enhancement session diffs each pinned commit against the latest one, ports only the changes the human picks, and then moves the pin.

## Pins

| Repository | Folder used | Pinned commit | Checked on |
|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/` | `49dd158d1076134a641b33efb035946536778336` | 2026-10-18 |
| [cursor/plugins](https://github.com/cursor/plugins), which holds pstack | `pstack/` | `bc1443790cc980d0ea857663260a831299884508` | 2026-10-18 |

Every factory file that adapts upstream material is checked against these pins. That includes `chrysalis/agents/code-review.md`, `chrysalis/agents/test.md`, and the code review and test sections of `chrysalis/workflow/gates.md`, which adapted upstream material before this file existed.
