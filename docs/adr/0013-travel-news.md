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

## Update 2026-10-30: presentation and data-quality rules
- **Current vs history:** a serious alert (severity 3+) is "current" for 14 days (GDACS) or 60 days (FCDO, State Dept); after that, or once a newer update from the same source exists for the country, it moves to a collapsed history section. No item appears twice.
- **One event, one card:** GDACS rows are per country; the index merges rows of the same event and lists the other countries ("Also affecting").
- **No event-wide measures per country:** GDACS area figures (e.g. drought "km2") describe the whole event, so they are omitted from our per-country summaries.
- **Dates:** "Updated" (FCDO, GDACS) or "Published" (State Dept) comes from the source; "Checked" is the last successful run of our daily check (`NewsFeedState.lastSuccessAt`, oldest feed per source) and is not a human review.
- **Severity:** each authority keeps its own wording and an icon; scales are never mapped to each other.

## Update 2026-10-31: every country, in two tiers
- **Popular tier (10 countries, `NEWS_COUNTRIES`):** UK FCDO written updates are fetched, they are the filter chips and feed "Latest updates".
- **Basic tier (all ~213 countries the State Dept lists, `src/content/worldCountries.json`):** a page at `/news/<slug>` with the US level, its history and any current GDACS alert. Found through search and the map. Non-popular pages are rendered on first visit and cached (hourly), not pre-built.
- **Storage:** `AdvisoryLevel` now holds every country's level; new table `AdvisoryChange` records each level change (history and "raised" alerts). First sightings of non-popular countries create no news item.
- **Current alerts:** GDACS Orange/Red for any country (one card per event, listing the other countries), plus a US level raised to 3 or 4 within 30 days. "Latest updates" stays popular-only.
- **Level 4 pages** carry no "Plan a trip" button.
- **Not covered:** the US itself (the State Dept does not rate it), tiny territories not in the outline data, and written advisory text for non-popular countries (adding a country to the popular tier is one row plus a flag).

## Update 2026-11-02: UK advice for every country
- The UK FCDO publishes one Atom feed per country; 208 of our 213 countries have a page (matched to GOV.UK's own index of country pages). The daily ingest fetches them with bounded concurrency (12 at a time), conditional GET and per-feed state. First run ~55 s; steady state ~17 s.
- **UK updates are informational (severity 0).** Their summaries are regional and often negated ("no longer advises against all travel to volcanoes"), so text matching mislabelled countries; alert levels come only from the US State Dept and GDACS.
- The "Checked" date for a multi-feed source is the median feed time, so one broken feed does not make every card look stale.
- Not covered: Australia's Smartraveller (blocks non-browser requests; its own site documents a public API, so ask DFAT for access) and Singapore's MFA (web pages only, no feed).

## Update 2026-11-02: Canada's travel advice
- Source: Global Affairs Canada open data, one JSON file for every country (`data.international.gc.ca/travel-voyage/index-updated.json`), ISO codes, levels 0–3. Licence: Open Government Licence – Canada (commercial reuse with attribution), so their level wording is shown verbatim; attribution added to the page note.
- Stored in `AdvisoryLevel` with source `canada` (no schema change). Shown as a third card on country pages next to the US and UK. No news items or level-change alerts for Canada yet.
- A regional flag in the data is shown as "some regions differ". Not mapped onto the US scale; each government keeps its own terms. `NEWS_DISABLED_SOURCES=canada` switches it off.
