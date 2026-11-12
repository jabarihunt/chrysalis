# JabStack

Read [`profile.yaml`](profile.yaml) for the source pin, layer write scopes, command strings, and copy changes. This file holds the rules that app agents need after app setup removes JabStack's own agent files. It adapts the source `AGENTS.md` at the commit that `profile.yaml` pins.

## Stack

JabStack uses Bun, SvelteKit 3, Svelte 5 runes, TypeScript 6, and Vite 8. SvelteKit owns the frontend and backend. Postgres uses Drizzle with postgres.js or PGlite. Better Auth runs inside the app. Unit tests use Vitest 5, and acceptance tests use Playwright with Chromium.

Use Bun for packages and scripts. Follow the repository-wide dependency and secret rules in the root [`AGENTS.md`](../../../AGENTS.md). Do not run `bun run test`, because it starts Vitest in watch mode. The profile's `commands.test.unit` command runs unit tests once. The profile uses `bun run check` for both typecheck and lint because the pinned source has no separate linter. A passing check reports zero errors and zero warnings.

## Database

The schema is `src/lib/server/db/schema.ts`. Drizzle writes committed SQL migrations under `drizzle/`. After a schema change, run `commands.migration.generate`, read the SQL, run `commands.migration.apply`, and commit the schema and migration together. Do not use `db:push` for factory work.

`DATABASE_URL` selects the driver. A `file:` URL opens PGlite. A `postgres://` or `postgresql://` URL opens postgres.js over TCP. Keep prepared statements on. Query through Drizzle instead of raw SQL.

Give each slice separate PGlite folders under `.pglite/<slice-id>/`, using the URLs in `profile.yaml`. Set `DATABASE_URL` to the development URL for migrations and the dev server. Set `TEST_DATABASE_URL` to the unit URL. Set `ACCEPTANCE_DATABASE_URL` to the acceptance URL. Clear `DATABASE_MIGRATION_URL` for local migrations so a value in `.env` cannot select a remote database.

Only one process may open a PGlite folder. Stop the process that owns a folder before migrating or opening it with another command. The development and acceptance URLs use different folders so the dev server and acceptance suite can run at the same time.

Use Neon for production and for a real-Postgres compatibility run after a change to `src/lib/server/db/**`, `drizzle/**`, `drizzle.config.ts`, Better Auth's database schema or database configuration, or the versions of postgres.js, PGlite, Drizzle, or Better Auth. For that run, set `DATABASE_URL` to Neon's pooled string and `DATABASE_MIGRATION_URL` to its direct string, then run `commands.migration.apply`. Set `TEST_DATABASE_URL` and `ACCEPTANCE_DATABASE_URL` to the pooled string before running `commands.test.unit` and `commands.test.acceptance`. All other development, migration, unit-test, and acceptance-test runs use the slice's PGlite URLs.

Create timestamp columns with the schema's `timestampTz` helper. Export each table's row type next to the table. Better Auth owns `users`, `sessions`, `accounts`, and `verifications`. After a Better Auth upgrade or plugin change, generate its reference schema outside the repository and compare it with the app schema.

## Backend

Keep server-only code in `src/lib/server/`. Never import it into a client component. Put page loads and form actions in `+page.server.ts` or `+layout.server.ts`. Put JSON APIs in `+server.ts`, validate input with Zod, and return `Response.json(...)`.

Declare every environment variable in `src/env.ts`. Import private values from `$app/env/private` and public values from `$app/env/public`. Do not read `process.env` in app code. `drizzle.config.ts` is the exception because Drizzle Kit runs outside SvelteKit. Wrap each new secret's schema with the existing `secret(...)` helper so builds can use its placeholder when production secrets are absent. Update `.env.example` with a placeholder for every variable.

Better Auth handles `/api/auth/*`. Call its endpoints through `src/lib/auth-client.ts` or `auth.api`. Do not add a competing OAuth callback. If server code needs the current session, read it through `auth.api.getSession` with the request headers. Before adding an authentication guard to `/dashboard`, replace the redirect placeholder at `/auth/login` with a real sign-in page. Otherwise, a signed-out request loops between the two routes.

JabStack has Stripe and Resend helpers. Acceptance and unit tests do not call Google, Stripe, Resend, or another network service. The real-Postgres compatibility run in the database section is the only test run that contacts Neon. Before changing Stripe through an agent tool, read `docs/stripe-agent-permissions.md`. Ask the TPM for any permission that file does not grant.

## Frontend

Write Svelte 5 runes such as `$props`, `$state`, `$derived`, and `$effect`. Import files under `src/lib/` through `#lib/`, include the compiled file extension, and never use the removed `$lib` alias. Read page state from `$app/state`. Use `use:enhance` for page forms.

Routes under `/dashboard` use shadcn-svelte components from `#lib/components/ui/`. Every other route uses Bits UI with custom Tailwind CSS. Do not mix the two libraries on one route. Put reusable marketing components in `src/lib/components/marketing/`, and create that folder with its first component.

JabStack stays on Tailwind CSS 3. `components.json` points to shadcn-svelte's Tailwind 3 registry. After adding a shadcn component, check that its imports use `#lib/`. Use `@lucide/svelte` for interface icons, and merge Tailwind classes with `cn()` from `#lib/utils.js`.

## Acceptance tests

App setup keeps JabStack's source smoke tests for AC-01 through AC-05 and renames their titles to `[setup AC-NN] ...`. New slices put Playwright tests under `tests/acceptance/<feature>/`. Use one test per approved criterion and the title format in `profile.yaml`. The slice spec owns the criteria. The factory copy has no `tests/acceptance/criteria.md` or `test:criteria` script.

Use Playwright's `page` fixture for page seams and `request` for route seams. Use `page.clock` to pin dates and times. For an intermittent regression, append the profile's `test.repeat_option` to `commands.test.acceptance` and report the number of runs.

The acceptance command builds the app and starts `vite preview` on port 4173. It installs Chromium when needed. The Playwright configuration supplies placeholder service credentials and reads `ACCEPTANCE_DATABASE_URL`. Standard runs use the slice's acceptance PGlite URL. Use Neon only for the compatibility run that the database section requires.

Unit tests stay next to the code they cover as `*.test.ts`. Mock SvelteKit environment modules and external service SDKs. Every unit test must reach at least one assertion.
