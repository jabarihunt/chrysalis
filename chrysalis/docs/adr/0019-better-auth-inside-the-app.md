---
status: accepted
date: 2026-10-11
---

# 0019. JabStack runs Better Auth inside the app

JabStack apps run the Better Auth library inside the SvelteKit app, with users and sessions stored in the app's own Postgres tables through the Drizzle adapter. JabStack already wires Better Auth into SvelteKit, so this needs no new integration work. Every Better Auth plugin stays available, including two-factor sign-in, passkeys, organizations, and Stripe. Session cookies are first-party cookies on the app's own domain.

The auth tables live in the app's Neon database, so a Neon branch copies them along with everything else. Branched auth data was the main reason to consider Neon's managed service, and the in-app version gets it too.

## Considered options

- Neon's Managed Better Auth. Neon runs and updates it, and it keeps separate auth settings for each Neon branch. It was rejected for four reasons. Neon doesn't list SvelteKit as a supported framework. It supports fewer plugins, with MFA not yet available and organizations only partly supported. Social sign-in is limited to Google, GitHub, and Vercel. It ties auth to Neon's AWS regions. Revisit it if Neon adds SvelteKit support and MFA.

## Consequences

- The factory applies Better Auth's security updates itself. The security gate checks dependencies for known advisories.
- OAuth settings come from environment variables for each deploy, so every environment that offers social sign-in needs its own callback URL registered with the provider.
