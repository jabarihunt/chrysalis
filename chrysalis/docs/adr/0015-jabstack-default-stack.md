---
status: accepted
date: 2026-10-11
---

# 0015. JabStack is the default stack, in TypeScript throughout

New apps default to JabStack. SvelteKit serves both the frontend and the backend, in TypeScript, with Postgres on Neon, Drizzle, Better Auth, and Playwright. Neon replaces Turso. The pending stack changes are in `chrysalis/docs/planning/jabstack-changes.md`.

SvelteKit's generated route types fail the frontend's typecheck when a load function's return value changes. SvelteKit also refuses to bundle `$lib/server` code into the browser. Together with write scopes based on file patterns, that gives agents layer boundaries that tools enforce, without a second language.

## Considered options

- A Go backend with a Svelte frontend. For requests that mostly wait on Postgres, Go would change response time little. It would cost a second language, a code generation step for contracts, a replacement for Better Auth, and a second test setup. Revisit it for an app with CPU-heavy work, many long-lived connections, or memory driving its hosting cost. Apps name their stack in `app.yaml`, so one app could use a Go profile without changing the others.
