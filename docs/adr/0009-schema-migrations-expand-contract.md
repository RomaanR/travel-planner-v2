# ADR-0009: Versioned schema migrations with expand/contract

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
Schema changes are applied with `prisma db push` against production. There is no migration history, no review artifact and no safe rollback; some changes can drop data. The refactor changes the schema substantially (ledger, trip versions, places, jobs, content).

## Options considered
1. Continue `db push`.
2. **`prisma migrate`** with committed SQL migrations, applied by CI.
3. A separate migration tool (Atlas, Flyway). More capable; unnecessary while Prisma suffices.

## Decision
Option 2, with these rules:
- **Baseline** the current production schema as migration `0_init` (`prisma migrate diff` + `migrate resolve --applied`), without touching data.
- Migrations are reviewed SQL in the PR; CI runs them against a fresh database and a copy of the staging schema.
- **Expand → migrate → contract** across separate releases: add new columns/tables (nullable or defaulted) → deploy code writing both / backfill → switch reads → remove old structures in a later release. No destructive change ships in the same release as the code that stops using it.
- Backfills run as idempotent jobs, not inside migrations, when they touch many rows.
- Production applies migrations with `prisma migrate deploy` in the pipeline using the direct (non-pooled) URL.
- Backups: platform daily backups + PITR, plus a scheduled logical dump to separate storage; restore is tested quarterly.

## Consequences
- App rollback never requires schema rollback.
- Every schema change has an audit trail and review.
- Slightly slower schema evolution (multi-release changes); accepted.
