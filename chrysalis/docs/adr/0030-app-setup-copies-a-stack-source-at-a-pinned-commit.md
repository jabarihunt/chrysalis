---
status: accepted
date: 2026-11-06
---

# 0030. App setup copies a stack's source at a pinned commit, and changes only the copy

Each stack profile names the repository its apps start from, one pinned commit of that repository, and the changes the factory makes to its copy. App setup downloads the source at that commit into a temporary folder outside the factory's repository. It runs the source's own setup steps there, makes the profile's changes, and copies the result into `apps/<app>/`. `app.yaml` records the commit. The source repository never changes, so a stack such as JabStack keeps working on its own outside the factory.

A stack's source is also used outside the factory, so it keeps its own agent instruction files, MCP setup, CI workflows, and conventions. Inside the factory they would compete with the factory's. Tools load `AGENTS.md` and `CLAUDE.md` from subfolders, so a copy in `apps/<app>/` would put the stack's instructions in front of app agents next to the factory's. The profile's changes remove those files from the copy, and the stack profile carries what the agents need from them. Where the source's conventions disagree with the factory's, such as how acceptance tests are named, the copy follows the factory's, because the factory's checks run on it. Because the work happens outside the repository, the source's agent files never enter it, even partway through setup.

Pinning the commit means every app set up from the same factory version starts from the same code, and the setup script's tests stay reliable. A change in the source reaches new apps only through a factory pull request that moves the pin. Its reviewer sees the source's diff, including any change to the source's agent files that the stack profile needs to pick up. Apps already set up keep their own copy.

## Considered options

- Removing the agent files from the source. The source is also used on its own, where those files are needed.
- Copying the source's agent files and telling agents to ignore them. Tools load the files themselves, so an instruction can't keep them out of an agent's context.
- Starting each app from the source's latest default branch. New apps would pick up source changes without review, and a change that breaks setup or drifts from the stack profile would surface only when someone sets up an app.
- Keeping a copy of the source in the factory's repository. The factory would carry a second copy that drifts from the source, where a pin records the same thing in one line.

## Consequences

- Moving a stack's pin is a factory change, with its own issue, pull request, and code review.
- App setup needs network access to the source's host. The setup script's tests use a small local repository instead, so they don't download the source.
- This answers Q-04. JabStack keeps its agent files, and app setup leaves them out of the copy.
