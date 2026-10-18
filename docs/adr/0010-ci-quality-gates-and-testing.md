# ADR-0010: CI quality gates and testing strategy

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
`next.config.mjs` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`; a local typecheck found five errors, including in billing. There is no CI and no automated test suite (Playwright is installed but unused for regression). Deploys happen on push to `main`, which has received direct pushes.

## Decision
- **GitHub Actions** pipeline on every PR: install → typecheck (`tsc --noEmit`) → lint incl. module boundary rules (ADR-0002) → unit + integration tests (Vitest; integration against a disposable Postgres) → `next build` → migration check (ADR-0009) → dependency and secret scanning.
- **Preview deploy** per PR; Playwright smoke suite runs against it (plan → result → save → reopen → share; guest limit; paywall path) using Clerk and Stripe test modes and recorded LLM/Places fixtures.
- **Branch protection on `main`:** required checks, PR review (self-review checklist acceptable for a solo team), no direct pushes, linear history.
- Re-enable type and lint checks in `next build`; fix existing errors first.
- **Coverage focus over percentage:** domain rules (route validation, ledger, edit commands, prompt building) and provider adapters (contract tests on fixtures). LLM quality is covered by the eval suite (ADR-0008), not unit tests.
- **Release:** merge to `main` → production deploy → `prisma migrate deploy` → smoke check → Sentry release with source maps.

## Consequences
- Defects of the kind found in the audit (type errors in billing, divergent limits between routes) are caught before deploy.
- PRs take minutes longer; acceptable.
- Requires a staging database and test-mode credentials for Clerk and Stripe in CI secrets.
