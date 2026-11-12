# JabStack changes

These were the changes to make to [JabStack](https://github.com/jabarihunt/jabstack) during the stack session. They came from the factory planning sessions of October 2026. The stack session in November 2026 reviewed JabStack at commit `518d0e1`. JabStack stays TypeScript, with SvelteKit serving both the frontend and the backend, and Better Auth stays inside the app. See ADRs 0015 and 0019.

JabStack is also used outside the factory, so it stays a standalone scaffold. The factory changes only its own copy of JabStack, as ADR 0030 describes. ADR 0031 records the database choices, which answer Q-03. ADR 0030 answers Q-04.

## Done in JabStack

### 1. Playwright for acceptance tests

- `@playwright/test`, `playwright.config.ts`, and `tests/acceptance/` are in place. `test:acceptance` builds the app and runs the tests against `vite preview`, and CI installs Chromium.
- JabStack's own convention keeps the criteria in `tests/acceptance/criteria.md`, names tests `AC-NN: ...`, and checks them with `bun run test:criteria`. The factory's convention keeps criteria in slice specs and names tests `[<slice id> <criterion id>] ...`. The factory's copy follows the factory's convention.

### 2. Postgres

- `drizzle.config.ts` uses the Postgres dialect, the schema and the migration are regenerated for Postgres, and Better Auth uses the `pg` provider. `@libsql/client` is gone.
- JabStack works with any Postgres host. It connects with postgres.js to a `postgres://` URL, and uses PGlite for a `file:` URL. `DATABASE_MIGRATION_URL` takes a direct connection string for migrations.
- `fly.toml` runs in `iad`, with a comment to pick the region closest to the database.
- Turso is still an option through `bun run setup:database turso`, which deletes the setup files afterwards.

### 3. Stripe MCP

- `.mcp/mcp.json` is gone. `bun run mcp:setup <tool>` writes each tool's MCP config from one server list in `scripts/mcp-setup.ts`.
- Stripe uses its hosted server at `https://mcp.stripe.com`. People sign in with OAuth and grant access to a sandbox only. Unattended runs use a sandbox Agent API key in `STRIPE_AGENT_API_KEY`, separate from the app's `STRIPE_SECRET_KEY`.
- The script makes each tool ask before every Stripe call where the tool's config allows it. With `--agent-key`, the run itself must allow Stripe's tools, and no file auto-approves them.
- `docs/stripe-agent-permissions.md` lists what agents may do in Stripe.
- `ci.yml` fails on committed MCP config that uses `STRIPE_AGENT_API_KEY`. `mcp:setup` refuses a live agent key, and `src/env.ts` refuses a live app key under `bun run dev`. The app's key may be a restricted `rk_` key.
- [Stripe's MCP docs](https://docs.stripe.com/mcp) now give November 30, 2026, not October 31, as the last day for full-access secret keys and restricted keys without the Agent tag.

### 4. Database MCP servers

- The Turso entry is gone. JabStack ships no Postgres MCP server, because each host publishes its own. Its Turso choice adds Turso's hosted server, which asks before each call.

### Instruction files

- `AGENTS.md` holds the stack, the commands, and the conventions, including the rule that `/dashboard` routes use shadcn-svelte and all other routes use Bits UI. `CLAUDE.md` and `GEMINI.md` import it. `.cursorrules`, `.windsurfrules`, and `documentation/` are gone.

### Observed items

- `src/lib/components/marketing/` doesn't exist yet. `AGENTS.md` says to create it with the first marketing component.
- Only `@lucide/svelte` is left.
- JabStack stays on Tailwind 3, and `components.json` points at shadcn-svelte's Tailwind 3 registry. [Current shadcn-svelte](https://shadcn-svelte.com/docs/migration) expects Tailwind 4, and Tailwind 3 projects keep working.

## Implemented in the JabStack profile

- [`chrysalis/stacks/jabstack/profile.yaml`](../../stacks/jabstack/profile.yaml) makes Neon the default production host. The factory itself names no stack. The generic test agent and test skills defer runner details to the active stack profile.
- The profile pins the JabStack source for app setup, which factory#9 will implement. App setup works in a temporary folder, as ADR 0030 describes. It runs `bun install` and `bun run setup:database postgres` before any copy change, because the setup script edits `AGENTS.md`. The profile then tells app setup to change the copy:
  - Remove `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/`, `scripts/mcp-setup.ts`, and the `mcp:setup` script. GitHub reads workflows only from the repository root, and tools read MCP config only there, so the factory provides both.
  - Rename the template acceptance-test titles from `AC-NN: ...` to `[setup AC-NN] ...`. Keep the tests as the app setup smoke suite.
  - Remove JabStack's criteria file, criteria-check script, and criteria-check package script. Factory slices add their own acceptance tests from approved criteria.
  - Keep `docs/stripe-agent-permissions.md`. The [stack instructions](../../stacks/jabstack/instructions.md) point agents at it, and agents ask for a new permission through the TPM.
- The stack instructions carry the needed knowledge from JabStack's `AGENTS.md`, adapted to the factory. The profile records the source commit they describe. A later factory change that moves the pin also reviews the instructions against the source diff.
- The app uses postgres.js, Neon's pooled string for `DATABASE_URL`, and the direct string for `DATABASE_MIGRATION_URL`. Each slice gets separate PGlite folders, and Neon is used only for runs against real Postgres. See ADR 0031. This replaces the earlier plan for a Neon branch per slice.
- The profile requires Bun 1.4 or later and Node 22.17 or later. It records SvelteKit 3, TypeScript 6, Vite 8, and Vitest 5. Its unit-test command is `test:unit`, because `bun run test` starts watch mode.

## Still open

- Whether the factory's generated MCP config adds Neon's hosted server, limited to the development project and to reads: `https://mcp.neon.tech/mcp?projectId=<dev-project-id>&readonly=true`. [Neon's MCP docs](https://neon.com/docs/ai/neon-mcp-server) recommend MCP for development and testing only.
- Whether the copy gets a `bunfig.toml` with `exact = true` under `[install]`, so packages agents add are saved at exact versions. JabStack uses caret ranges.
- JabStack has no Stripe webhook route yet, though `stripe:cli` forwards to `/api/stripe/webhook`, and the app won't start without `STRIPE_WEBHOOK_SECRET`.
