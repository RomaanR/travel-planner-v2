# ADR-0013: Travel news from official sources

- **Status:** Proposed
- **Date:** 2026-10-28
- **Extends:** ADR-0012 (content agent with human approval)

## Context
The owner wants visitors to be able to read travel news (visa/entry rules, safety, weather and disasters). ADR-0012 parked a general "daily travel news" feed because news does not lead to planning, goes stale if approvals lapse, carries accuracy risk (advisories, entry rules), and summarising news outlets raises copyright issues. Research on 2026-10-28 found a safer shape: governments publish structured, free feeds, and one of them is licensed for commercial reuse.

## Sources verified (2026-10-28)
| Source | Feed | Licence / terms |
|---|---|---|
| UK FCDO (GOV.UK) | Atom per country, `gov.uk/foreign-travel-advice/<slug>.atom`; the latest change summary names the section changed (e.g. "Entry requirements") | **Open Government Licence v3.0** — commercial use allowed with attribution |
| US State Dept | RSS `travel.state.gov/_res/rss/TAsTWs.xml` — Level 1–4 per country | Site policy page unreachable (403); US federal works are generally public domain — **unverified** |
| GDACS (EC JRC / UN) | RSS `gdacs.org/xml/rss.xml` — disaster alerts with country, level, coordinates | Terms page says nothing on reuse, only disclaimers (not for decisions, no liability) — **unverified** |

Not usable now: Australia Smartraveller (bot challenge), Canada (HTML only), CDC notices (feed URL not found). No free authoritative visa-requirements feed exists; visa coverage is news-only (FCDO "Entry requirements" updates).

## Options considered
1. **Aggregate news outlets' RSS/APIs.** Copyright and terms problems, noisy, not what travellers need.
2. **Official feeds only, shown as structured alerts.** Free, attributable, accurate by construction.
3. **Official feeds + AI-written editorial briefs with approval.** Adds value but needs the approval workflow (ADR-0012) and the library of cities first.

## Decision
Do **2 now** and keep 3 for a later phase.

- **Reuse policy per source:** FCDO wording is republished verbatim with the OGL attribution. For State Dept and GDACS we publish **only facts we construct ourselves** (country, level, event type, dates, our own sentence) with a link to the official source — their text is not copied — until their terms are confirmed.
- **No AI rewriting of safety-critical facts** (advisory levels, entry rules). Everything shows its source and date, links out, and carries a "check the official source" notice.
- **Pipeline:** daily Vercel cron `/api/cron/news` (CRON_SECRET) → fetch with conditional GET → parse (`fast-xml-parser`) → plain text only → `NewsItem` (+ `AdvisoryLevel`, `NewsFeedState`). Failures are isolated per feed, recorded, and sent to Sentry; `NEWS_DISABLED_SOURCES` switches a source off without a code change.
- **Scope:** launch countries only (`src/lib/news/countries.ts`): JP, PT, IT, MA, FR, ES, GR, TH, TR, AE. Expanding is one row each.
- **Surfaces:** `/news` (filters), `/news/[country]` (static hub, hourly revalidate, SEO), home "Travel briefing" strip, "Plan a trip" links into the prefilled planner.
- **Publishing:** official items auto-publish (they are facts with provenance); `status` allows hiding an item.

## Consequences
- Free data; cost is a daily function run. Hobby cron is once a day with ±59 min precision; hourly updates need Pro.
- Zero rows until the first ingest; pages and the home strip render empty states and the strip hides itself.
- GDACS/State Dept reuse terms must be confirmed (or permission obtained) before relying on them commercially; until then only constructed facts are shown.
- Liability: content is a pointer to official advice, not advice. Legal review of the disclaimer wording is recommended.
- Open: weather forecasts (MET Norway licence check; Open-Meteo free tier is non-commercial only), editorial briefs, email alerts for saved trips.
