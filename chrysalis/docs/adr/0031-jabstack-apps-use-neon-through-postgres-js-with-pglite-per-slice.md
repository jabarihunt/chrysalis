---
status: accepted
date: 2026-11-06
---

# 0031. JabStack apps use Neon through postgres.js, with a PGlite database for each slice

The JabStack stack profile makes Neon the default production host, while JabStack itself works with any Postgres host. The app connects with postgres.js over TCP. `DATABASE_URL` takes Neon's pooled connection string, and `DATABASE_MIGRATION_URL` takes the direct one, because Neon's docs send schema migrations through a direct connection. Prepared statements stay on, since Neon's pooler supports the driver-level kind. Each slice gets its own PGlite folder, which holds Postgres compiled to WebAssembly, for its migrations, unit tests, and acceptance tests. Neon is used only for test runs that need a real Postgres server. This answers Q-03.

Fly.io runs long-lived machines that open TCP connections, so a driver built for platforms without TCP adds nothing there. JabStack already picks PGlite or postgres.js from the form of `DATABASE_URL`, so one code path serves both. Its CI runs the database test and the acceptance tests against a Postgres 18 server, with prepared statements on and off. A PGlite folder per slice gives each slice its own data, including Better Auth's users and sessions, with no Neon account, no network calls, and nothing to delete after the merge.

## Considered options

- node-postgres (`pg`) over TCP. It would work as well, but JabStack already tests postgres.js.
- Neon's serverless driver, over HTTP or WebSockets. It's built for edge platforms without TCP. On Fly.io it adds nothing, and it ties the app's code to Neon.
- Bun's built-in `Bun.SQL`. Vitest and `vite preview` run under Node, where `Bun.SQL` doesn't exist.
- A Neon branch for each slice. Every slice would test against real Postgres, but each one would need a Neon account, network calls, and a branch to delete after the merge.

## Consequences

- Only one process can open a PGlite folder, and PGlite doesn't lock it. The dev server and the acceptance tests use separate folders, as JabStack's `.pglite/dev` and `.pglite/acceptance` do.
- A difference between PGlite and a Postgres server shows up only in a run against Neon. The stack profile says which runs use Neon.
- 0019 notes that a Neon branch copies Better Auth's tables. With a PGlite folder per slice, each slice's auth tables come from its own migrations instead. 0019's decision, to run Better Auth inside the app, still holds.
- JabStack also offers Turso through `bun run setup:database turso`. App setup always picks Postgres.
