# ADR-0012: Content agent with human approval

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
The home page needs content that drives people into the planner. A daily travel-news feed was considered and parked: it does not lead to planning, goes stale if approvals lapse, carries accuracy risk (advisories, entry rules) and copyright care when summarising outlets. Preferred content: **Trip Ideas** (ready-made itineraries for launch cities, each with its own crawlable page and a "Make it mine" action) and a monthly **"Where to go this month"** strip. The owner wants an agent to draft and a human to approve.

## Options considered
1. Manual content only.
2. **Scheduled agent drafts → human approval → publish**, inside the app.
3. External CMS (e.g. Sanity, Contentful) + agent writing into it. Better editing UI; another vendor and integration.

## Decision
Option 2, in the `content` module, reusing the job and LLM infrastructure (ADR-0004, ADR-0008).

- **Schedule:** Trip Ideas weekly (1–2 drafts), seasonal strip monthly.
- **Drafting:** job calls the LLM gateway (`content.draft`) with web research where needed; Trip Ideas are assembled from **library places only** (ADR-0007), so every stop is verified. Drafts include sources and are written in original wording.
- **Approval:** `ContentItem(status=pending)` → email via Resend with preview and a link to `/admin/content` (admin-gated like `/admin/metrics`) → approve / edit / reject. Approval links require an authenticated admin session; no one-click approve-by-email-token.
- **Publish:** approved items render on the home page and at `/ideas/[slug]` with metadata for search; "Make it mine" copies the plan into the planner with the visitor's dates.
- **Freshness:** home page shows the latest published items; nothing dated appears, so missed weeks do not make the page look abandoned.
- News feed remains parked; it can reuse this pipeline later as a separate content type.

## Consequences
- Steady, product-linked content with low ongoing effort (review only).
- Indexable pages support organic acquisition.
- Bounded cost (a few cents per draft).
- Requires the library (ADR-0007) for launch cities before Trip Ideas can publish.
