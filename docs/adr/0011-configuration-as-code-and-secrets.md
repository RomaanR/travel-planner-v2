# ADR-0011: Platform configuration as code and secrets handling

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
Platform setup (Vercel project, env vars, domains, cron; Supabase project; Upstash; Google Cloud key restrictions; Stripe products/webhooks; Clerk settings) is configured by hand in dashboards. A server-side Google key currently reaches clients through returned URLs (audit P0). Environment variable names and required values are documented only in prose.

## Decision
- **Typed config:** a single `server/platform/config` module parses `process.env` with Zod at startup; the app fails fast on missing or malformed config. Client-exposed values are a separate, explicitly listed schema.
- **Infrastructure as code with Terraform** for what has providers: Vercel (project, domains, env var definitions, cron), Supabase (project settings), Upstash (databases), Google Cloud (API key restrictions, enabled APIs), Sentry (projects/alerts). Stripe products/prices and webhook endpoints scripted with the Stripe CLI/API. State in a remote backend.
- **Secrets** live in the platform secret stores (Vercel env, GitHub Actions secrets; Secrets Manager if ADR-0003 moves to AWS), never in the repo. Terraform manages names and references, not secret values.
- **Least privilege keys:** separate keys per environment; Google browser key referrer-restricted to Maps JS + Places; server key restricted by API and never returned to clients.
- **Rotation runbook:** documented procedure and schedule for Anthropic, Google, Stripe, Clerk, Upstash, Resend and DB credentials; immediate rotation of the server Maps key once the leak is fixed.

## Consequences
- Environments are reproducible; drift is visible in plan output.
- Initial import of existing resources into Terraform state takes effort.
- Portability toward AWS (ADR-0003) improves: config shape is already explicit.
