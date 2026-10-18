# ADR-0004: Generation as durable background jobs

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
Generation runs inside a single HTTP request (`/api/itinerary-stream`, `maxDuration = 290`) that streams NDJSON. Consequences seen in production code and history:
- Closing or backgrounding the tab (notably iOS Safari) kills the work; retry logic caused duplicate generations and a tab-switch restart bug.
- No durable record of an in-flight generation; refresh loses progress.
- Retries are not idempotent; credits are decremented after the fact.
- Work is bounded by platform function duration.

## Options considered
1. **Keep request-scoped streaming**, harden retries. Smallest change; failure modes above remain inherent.
2. **Job table + queue + SSE progress**, with the queue as a swappable adapter:
   - 2a. Upstash QStash / Workflow (already using Upstash; HTTP-delivered, retries, step functions on serverless).
   - 2b. Inngest or Trigger.dev (good DX; another vendor).
   - 2c. AWS SQS + Lambda / Step Functions (natural in ADR-0003 Option B/C).
3. **Client-driven orchestration** (browser calls one day at a time). Simple, but trusts the client with sequencing and makes credits and validation harder.

## Decision
Option 2 with **2a (Upstash QStash/Workflow) as the initial transport**, behind a `platform/queue` interface so 2c can replace it without touching modules.

- `POST /api/generations` validates, reserves a credit (ADR-0005), inserts `GenerationJob(status=queued, idempotencyKey)` (unique), enqueues, returns `202 { jobId }`.
- The worker generates **day by day as workflow steps** (each step well inside function limits), validates each day, persists progress to the job row, and commits or releases the credit at the end.
- `GET /api/generations/{id}/events` streams progress via SSE from persisted state; reconnecting resumes from the last persisted day.
- Same mechanism serves `regenerateDay`, city-library builds and content drafts.

## Consequences
- Tab close / refresh / iOS background no longer loses or duplicates work.
- Retries are safe by construction (idempotency key + reservation).
- Per-step execution removes the 290 s single-request ceiling.
- More moving parts (job table, worker endpoint, signature verification of queue callbacks). Worker endpoints must verify QStash signatures and be unreachable otherwise.
- Time to first day may increase slightly (queue hop); measured against the ≤15 s p75 target.
