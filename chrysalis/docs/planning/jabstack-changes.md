# JabStack changes

These are changes to make to [JabStack](https://github.com/jabarihunt/jabstack) during the stack session. They come from the factory planning sessions of October 2026. JabStack stays TypeScript, with SvelteKit serving both the frontend and the backend, and Better Auth stays inside the app. See ADRs 0015 and 0019. Open stack decisions are in `open-questions.md` as Q-03 and Q-04.

## Decided

### 1. Add Playwright for acceptance tests

- Add `@playwright/test`, a `playwright.config.ts`, and a `tests/acceptance/` folder.
- Add a `test:acceptance` script, and install Playwright's browsers in CI.
- Each acceptance test name includes its criterion ID, such as `AC-03`, so CI can check that every criterion has a test.

### 2. Move from Turso to Postgres, with Neon as the default host

- Switch `drizzle.config.ts` to the Postgres dialect, rewrite `src/lib/server/db/schema.ts` with Postgres table definitions, and regenerate the migrations.
- Replace `@libsql/client` with a Postgres driver. The driver choice is Q-03.
- Keep Better Auth inside the app, as ADR 0019 records, and set its Drizzle adapter to the `pg` provider. Regenerate the auth tables for Postgres.
- Replace the Turso variables in `.env.example` with Neon's connection strings.
- Run the Fly.io app in the region closest to the Neon project's region. Every query pays the network round trip between the two.
- Replace the Turso icon and references with Neon.

### 3. Fix the Stripe MCP setup

`.mcp/mcp.json` starts `@stripe/mcp` with `--tools=all` and the full secret key from `STRIPE_SECRET_KEY`.

Problems:
- Any agent in a session with this server can write to the Stripe account behind that key, including charges, refunds, and customers. With a live key, that is real money.
- The config passes the key as a command-line flag, `--api-key=...`. Other processes on the same machine can read command-line arguments, for example with `ps`.
- [Stripe's MCP docs](https://docs.stripe.com/mcp) say that starting October 31, 2026, Stripe MCP stops accepting full-access secret keys and restricted keys without the Agent tag. Stripe's toolkit has fetched its tools from `mcp.stripe.com` since version 0.9, so this config will likely stop working on that date.
- The MCP entry and the app read the same `STRIPE_SECRET_KEY` variable, so every agent session gets the app's key.

The October 31 change covers Stripe MCP only. The app's own Stripe calls in `src/lib/server/stripe.ts` go through the `stripe` SDK to Stripe's API, so they keep working in development and production.

Fix:
- Connect to Stripe's remote server at `https://mcp.stripe.com`.
- Use OAuth for interactive sessions, and grant access to a sandbox only.
- For agents that can't use OAuth, create an Agent API key in a sandbox with only the permissions the agents need. Stripe now sets tool access through the key's permissions, so drop `--tools=all`.
- Give the MCP server its own environment variable for that key, separate from the app's `STRIPE_SECRET_KEY`.
- Turn on tool-call approval for the Stripe server in each tool.
- Never give an agent a live-mode key.

## Proposed

These follow from the decisions above. Confirm them in the stack session.

### 4. Replace the Turso MCP server with Neon's, for development only

- The current Turso entry passes `DATABASE_AUTH_TOKEN`, so the server can write to whatever database that token reaches.
- Use Neon's hosted server, limited to the development project and to read operations: `https://mcp.neon.tech/mcp?projectId=<dev-project-id>&readonly=true`. Agents run migrations with `drizzle-kit`, so they don't need write access through MCP.
- [Neon's MCP docs](https://neon.com/docs/ai/neon-mcp-server) recommend MCP for development and testing only, never against production databases.
- Keep the Svelte and shadcn MCP servers. They only look up documentation.

### 5. Give each slice its own Neon branch

- When a slice starts, the pipeline creates a Neon branch for it. The database agent migrates that branch, Playwright runs against it, and the pipeline deletes it after merge.
- Better Auth keeps users and sessions in the app's own tables, so each slice's branch has its own copy, and acceptance tests can run real sign-in flows on isolated data.
- The factory pipeline creates and deletes the branches. JabStack needs scripts and environment wiring that accept a branch connection string.

### 6. Move agent instructions out of the template

- The stack knowledge in `CLAUDE.md`, `documentation/CLAUDE.md`, `documentation/LLM_CONTEXT.md`, `.cursorrules`, and `.windsurfrules` moves into the factory's stack profile at `chrysalis/stacks/jabstack/`. This includes the rule that `/dashboard` routes use shadcn-svelte and all other routes use Bits UI.
- App setup doesn't copy those files or `.mcp/` into `apps/<app>/`.
- The factory generates MCP config for each tool. Cursor reads project MCP config from `.cursor/mcp.json`, Kilo reads it from its own config file, Kiro reads `.kiro/settings/mcp.json`, and Claude Code reads `.mcp.json` at the repository root, so `.mcp/mcp.json` may not load in any of them. Kiro agents also get those servers only when their agent file sets `includeMcpJson: true`. Check this in the stack session.
- Whether the JabStack repo keeps these files for use outside the factory is Q-04.

## Observed in the repo, not yet decided

- `CLAUDE.md` says Bits UI components live in `src/lib/components/marketing/`, but that folder doesn't exist.
- The `stripe:cli` script forwards webhooks to `/api/stripe/webhook`, but no route exists at that path. The only API route is `src/routes/api/auth/[...all]`.
- `package.json` installs two Lucide packages, `@lucide/svelte` and `lucide-svelte`. Keep one.
- `bun run test` runs Vitest in watch mode when the terminal is interactive, and some agent terminals are. Watch mode never exits. `test:unit` always runs once. Consider making `test` run once and adding `test:watch`.
- Dependencies use caret ranges. The lockfile pins what's installed, but packages that agents add should be saved as exact versions, for example with `exact = true` under `[install]` in `bunfig.toml`.
- Tailwind is on version 3. Check which Tailwind version current shadcn-svelte releases expect.
