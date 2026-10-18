# ADR-0002: Modular monolith in TypeScript on Next.js

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
The app is a Next.js 14 App Router project in TypeScript. Business logic sits inside route handlers and large components (two generation routes of 1,159 and 777 lines with copied prompt code; `CurationForm.tsx` at 936 lines). Quota rules are spread across routes and pages. There are no tests and builds ignore type errors.

The team is one person; the product is pre-traction; requirements will change frequently.

## Options considered
1. **Keep the current structure, clean up opportunistically.** Cheapest now; duplication and scattered rules keep producing defects (the audit's P0 items are mostly this).
2. **Microservices** (generation, places, billing as separate services). Clear boundaries, but adds network calls, deployment pipelines, distributed transactions and on-call surface for one person. Not justified at this scale.
3. **Modular monolith** in the existing Next.js app: capability modules with explicit public APIs and enforced dependency rules, one deployable.
4. **Rewrite in another stack** (e.g. a separate Python/Go backend). No requirement that TypeScript/Node cannot meet; loses shared client/server contracts.

## Decision
Option 3. Keep TypeScript and Next.js; organise server code into capability modules (`identity`, `planning`, `places`, `trips`, `entitlements`, `billing`, `content`, `analytics`) with `domain / application / infrastructure` layers and an `index.ts` public API. Route files stay thin. Layout and rules are in `ARCHITECTURE.md` §5.

Upgrade Next.js and Clerk together to current majors in Phase 0 (Clerk v6 is what pins Next 14; open Next 14 advisories are tracked).

## Consequences
- Boundaries are enforced by lint rules in CI (`eslint-plugin-boundaries` or `dependency-cruiser`), not by convention.
- A module can later be extracted into its own service (most likely `planning` jobs) because its interface already exists.
- Up-front cost: moving code into modules happens incrementally per phase, not as a big-bang move.
- Framework upgrade risk is taken early, before new code is written against old APIs.
