---
status: accepted
date: 2026-10-14
---

# 0023. Chrysalis uses the MIT license

Chrysalis is public so that people can copy it and build their own factories. With no license, people could view and fork it on GitHub but would have no right to use it in a project of their own. The root `LICENSE` grants that right under the MIT license.

Both upstream sources, pstack and Matt Pocock's skills, use MIT. Copies already have to keep their notices in `THIRD_PARTY_NOTICES.md`, so one license with the same terms covers the whole repository.

This closes Q-15.

## Considered options

- Apache-2.0. It adds a patent grant, but a repository of prompts, docs, and small scripts carries little patent risk, and its notice rules ask more of every copy.
- A copyleft license such as GPL or AGPL. Anyone who shipped a changed factory would have to share their changes. It would also raise the question of whether apps built in a copy fall under it, and that question would put people off using the template.
