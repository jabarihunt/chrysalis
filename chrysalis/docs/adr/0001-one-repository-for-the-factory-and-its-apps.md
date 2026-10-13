---
status: accepted
date: 2026-10-11
---

# 0001. One repository for the factory and its apps

The factory lives in `chrysalis/` and each app in `apps/<app>/`, all in one repository. One repository is simpler to run while the factory is young, and the human prefers it.

To keep a later split cheap, each app is self-contained, with its own package file, lockfile, and tracker setting. A pull request changes either the factory or one app, never both, because a skill change alters how every app gets built and deserves its own review. With those rules, `git subtree split` can move an app into its own repository.

## Considered options

- A separate factory repository that installs itself into each product repository. Revisit this when an app needs its own access control or deploy owners, or when the larger company wants one repository per product.
