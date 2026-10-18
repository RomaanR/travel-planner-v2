# ADR-0006: Trip aggregate with immutable versions

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
A saved trip is one JSON blob (`Trip.itineraryData`) without the original request (dates, transport, preferences, brief). Trips cannot be edited; "Refine" regenerates everything and loses accepted stops. Shared pages load any trip by its UUID with no opt-in or revocation. Legacy records use an older day shape handled by `normalizeDayPlan()`.

The product direction is an **editable trip**: delete, reorder, move between days, lock, undo, and regenerate a single day.

## Options considered
1. **Mutable JSON blob**, edited in place. Simple; no undo, no history, concurrent edits overwrite.
2. **Fully normalised tables** (Trip → Day → Stop rows). Queryable; every edit is many row updates; versioning is hard.
3. **Aggregate with immutable version snapshots**: `Trip` (identity, owner, request, pointer to current version) + `TripVersion` (complete plan JSON validated by a versioned contract, parent pointer, change reason).
4. **Event sourcing** (store edit events, project the plan). Powerful; more machinery than needed now.

## Decision
Option 3.

- `Trip`: `id`, `ownerId`, `destination`, `request` (validated `TripRequest` contract incl. `schemaVersion`), `currentVersionId`, timestamps.
- `TripVersion`: `id`, `tripId`, `parentId`, `plan` (validated `TripPlan` contract, stops reference `placeId`), `reason` (`generated` | `edit:<command>` | `regenerate-day:<n>`), `createdAt`.
- Edits are domain commands (`RemoveStop`, `MoveStop`, `ReorderDay`, `LockStop`) applied by pure functions to the current plan → new version. Optimistic concurrency on `currentVersionId`.
- Undo = set `currentVersionId` to the parent. Keep the last N versions per trip; prune older ones.
- `ShareLink`: random unguessable token, `createdAt`, `revokedAt`. Public pages resolve **by token only**. Trips are private by default.

## Consequences
- Reopening a trip on any device restores inputs and accepted edits.
- Undo and history are trivial; versions are cheap (small JSON).
- Querying across stops (e.g. "which trips include place X") needs JSON indexes or a derived table; add when needed.
- Migration: create `Trip.request` (nullable for legacy), backfill one `TripVersion` per existing trip through `normalizeDayPlan()`, then switch reads. Existing `/shared/[id]` URLs: issue share tokens for trips already shared, redirect old URLs for a deprecation window, then remove ID-based access.
