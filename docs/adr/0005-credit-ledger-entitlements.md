# ADR-0005: Entitlements via an append-only credit ledger

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
Today `UserProfile.availableCredits` is a mutable counter: checked before generation, decremented after. Free balances are recalculated when the dashboard is visited. Guest limits (1/day/IP, 3 days) live in the streaming route only; the legacy route bypasses them. Plan definitions (5 free, 10 premium, 3- vs 14-day caps) are duplicated across UI copy and server code. Parallel requests can spend the same credit; failed generations can consume credits.

## Options considered
1. **Atomic counter** (`UPDATE … SET credits = credits - 1 WHERE credits > 0`). Fixes double spend; no history, no refunds/expiry semantics, no audit.
2. **Append-only ledger + reservations**, balance derived (optionally materialised).
3. **Delegate to Stripe entitlements / metered billing.** Couples free and guest tiers to Stripe; latency on the hot path.

## Decision
Option 2, in the `entitlements` module, as the single policy point for guests, free and paid users.

- `Plan` definitions live in one place (`shared/contracts/plans.ts`) and drive both server checks and UI copy.
- `CreditLedgerEntry` (append-only): `grant`, `consume`, `expire`, `refund`, with `periodStart/End` and `source` (plan renewal, Stripe invoice ID, manual bonus).
- `CreditReservation`: created inside the same transaction that checks the balance (row lock on the user, or `SERIALIZABLE`), unique on the request idempotency key, with an expiry. `commit` → `consume` entry; `release` → delete; a sweeper releases expired holds.
- Free/premium periods are granted by a scheduled job and by Stripe webhooks — never by a page visit.
- Guests are keyed by a signed anonymous ID plus IP rate limit; their entitlement is "1 trip per 24 h, ≤3 days", enforced in the same module.
- Every generation entry point calls `entitlements` — there is no other path.

## Consequences
- No double spend; failed work never costs a credit; full audit trail for support and refunds.
- Balance is a query (`SUM` over the current period); add a materialised balance if it becomes hot.
- Migration: backfill a `grant` entry per user equal to current `availableCredits`; keep the old column read-only until removed (ADR-0009).
