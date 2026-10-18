# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-18

## Context
Decisions so far live in a 3,300-line changelog (`CLAUDE-v2.md`) mixed with session notes, and the older `CLAUDE.md` contradicts it (brand, limits, routes). Reasons and rejected alternatives are hard to find, so decisions get re-litigated or silently reversed.

## Decision
Record each significant architectural decision as an ADR in `docs/adr/`, using the template in the README. `ARCHITECTURE.md` describes the current target shape and links to ADRs for reasoning. Session changelogs stay in their own file and stop being the source of truth for architecture.

A decision is "significant" if it affects module boundaries, data model, external providers, hosting, security posture, or cost model.

## Consequences
- New contributors (and AI assistants) can find why something is the way it is.
- `CLAUDE.md` / `CLAUDE-v2.md` are to be merged into one short operating guide that points at `ARCHITECTURE.md` and the ADRs (see `to-do.md` §9).
- Small overhead per decision; acceptable.
