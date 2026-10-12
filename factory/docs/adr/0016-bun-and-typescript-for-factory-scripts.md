---
status: accepted
date: 2026-10-11
---

# 0016. Factory scripts use Bun and TypeScript

The factory's scripts, including the tracker CLI, the adapter generator, the app setup script, and `check.ts`, are TypeScript run with Bun and tested with `bun test`. The default stack already uses Bun, so one runtime serves both.

## Considered options

- POSIX shell. It needs no runtime, but shell scripts are harder to test, and the tracker CLI parses YAML and JSON.
