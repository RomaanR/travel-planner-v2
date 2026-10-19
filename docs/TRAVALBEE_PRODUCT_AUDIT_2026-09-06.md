# TravalBee: product, usability, growth and architecture audit

**Date:** 6 September 2026. **Decision:** improve the existing product and validate one customer segment before committing to a rebuild.

Companion artifact: [interactive proposed screen layout](D:/travel-plannner-v2/output/audit/proposed-travalbee-layout.html). It illustrates the homepage, setup and trip workspace; no production behavior is implemented.

## 1. Recommendation

TravalBee has enough working functionality to test demand. It does not yet have evidence that strangers want the product, a narrow target customer, or instrumentation that explains the acquisition-to-value journey. Changing frameworks, hosting or the entire visual identity would not resolve those unknowns.

The most valuable product change is to turn a generated itinerary into a trip people can keep working on: preserve their dates and preferences, let them change individual stops, show trustworthy routes and opening information, and make saving, sharing and navigation easy on mobile. Keep the cream/terracotta editorial identity, but put the traveler’s task ahead of brand atmosphere.

Start with a consumer experiment for **independent travelers planning a 2–3-day food/culture city break within the next 60 days**. This is a proposed test segment, not an established market conclusion. Use three destinations the founder can verify well. In parallel, interview independent travel advisors and manually prepare a few proposals. Choose the agency direction only if advisors demonstrate repeated use and willingness to pay; do not build two products simultaneously.

## 2. Evidence and limits

The founder reports no new users/signups beyond friends and family. That establishes a lack of external validation, not a measured conversion or retention failure. Visitor counts, acquisition sources, advertising spend, customer interviews and production analytics were not supplied.

This audit inspected the working tree’s routes, forms, generation pipeline, data schema, pricing, billing, sharing, offline code, analytics and existing strategy documents. It also opened the public homepage, planner, sample itinerary, pricing and My Trips at **1440 × 960** and **390 × 844** in headless Chrome. All ten page visits returned HTTP 200; no browser page errors were recorded in those visits. Google autocomplete and the sample map worked. Selecting Paris expanded the mobile form to 2,568 pixels; switching from Inspire to Tailor and back cleared the selected destination. Public robots.txt and sitemap.xml returned 404.

No production generation was submitted, no account was created, and no payment, private account, database administration or destructive security test was performed. Authenticated saving, end-to-end generation quality, billing renewals, true offline behavior, production key restrictions, field performance and vendor bills remain unverified. Chromium mobile emulation is not a physical Safari/Android test. Browse elapsed times are not Core Web Vitals. Existing uncommitted changes mean local code may differ from deployment.

Only audit artifacts were added; application code was not changed. Browser evidence: [public page observations](D:/travel-plannner-v2/tmp/travalbee-audit/public-inspection.json), [interaction observations](D:/travel-plannner-v2/tmp/travalbee-audit/interactions.json).

## 3. What to keep

- Guest generation already exists. Do not introduce an account gate before the first useful result. [Guest planner](D:/travel-plannner-v2/src/app/curate/page.tsx:10)
- Streaming itinerary days, map/timeline presentation, a public sample, PDF/map exports, saved trips and share pages provide a substantial starting point.
- Hotel anchoring, dietary preferences, pace and fixed-plan inputs can support a more useful planner.
- The managed Next.js, PostgreSQL/Prisma, Clerk, Redis, Stripe and Vercel foundation is suitable for validating this business. The audit found application correctness problems, not evidence of exhausted infrastructure capacity.
- Existing ownership checks on private trip access/deletion, rate limits, Sentry, cost logs and webhook deduplication are useful foundations to strengthen.

## 4. Findings in priority order

**P0 means before broader promotion or enabling paid use; P1 means core usability/trust work; P2 means subsequent improvement.** Code-verified defects are distinct from hypotheses about conversion impact.

| Priority | Evidence-backed finding | Change and acceptance condition |
|---|---|---|
| P0 | A destination-image helper puts `MAPS_SERVER_KEY` into URLs returned to clients and public share metadata. This is a verified code path, not proof of abuse. [Helper](D:/travel-plannner-v2/src/lib/getPlacePhoto.ts:35), [API](D:/travel-plannner-v2/src/app/api/trips/route.ts:35), [shared metadata](D:/travel-plannner-v2/src/app/shared/[id]/page.tsx:32) | Proxy/serve destination images safely, inspect production restrictions and rotate any affected exposed key. Check rendered HTML/API responses without logging the secret. Browser Maps keys and server secrets must have separate restrictions. |
| P0 | Premium displays an unspecified monthly price and disabled “Coming Soon” purchase buttons, while the headline says “Pay once. Travel forever.” Exhausted users are directed to upgrade. Confirmed on the live pricing page. [Pricing](D:/travel-plannner-v2/src/app/pricing/page.tsx:91) | Choose one truthful beta offer; every limit reached must lead to an available next action. Do not measure willingness to pay with a disabled checkout. Remove conflicting one-credit/five-credit/unlimited/ten-credit copy through a shared plan definition. |
| P0 | Two generation endpoints enforce different anonymous limits; the older endpoint can bypass the intended one-per-day, three-day trial rules. [Streaming limits](D:/travel-plannner-v2/src/app/api/itinerary-stream/route.ts:501), [older route](D:/travel-plannner-v2/src/app/api/itinerary/route.ts:701) | Apply one entitlement policy to every entry point and retire the obsolete public path once dependencies are checked. Direct endpoint calls must obey the same limits as the UI. |
| P0 | Credits are checked before work and decremented afterward without atomic reservation. Some persistence is unawaited; free quotas count failed cost logs. A dashboard visit recalculates stale free balances. [Streaming accounting](D:/travel-plannner-v2/src/app/api/itinerary-stream/route.ts:535), [dashboard](D:/travel-plannner-v2/src/app/dashboard/page.tsx:94) | One entitlement service with reserve/complete/release and request idempotency. Parallel requests cannot spend the same credit; failed work releases it; renewal/reset does not require visiting a particular page. |
| P0 before paid launch | Renewal code uses `invoice.subscription_details`, which does not exist in the installed Stripe types; subscription revenue is excluded from the admin payment-only revenue calculation. Production webhook impact depends on its configured API version. [Webhook](D:/travel-plannner-v2/src/app/api/stripe/webhook/route.ts:88), [metrics](D:/travel-plannner-v2/src/app/admin/metrics/page.tsx:101) | Match the actual webhook payload/version and verify with recorded fixtures. Count paid invoices/refunds over consistent periods. Stripe documents the relocation under `parent`: [official migration](https://docs.stripe.com/changelog/basil/2025-03-31/adds-new-parent-field-to-invoicing-objects). |
| P1 | On a fresh 390 × 844 homepage visit, the main CTA began at y=642 with height 49; the cookie banner began around y=658 and covered most of it. Desktop sample CTA was also partly covered. [Mobile capture](D:/travel-plannner-v2/tmp/travalbee-audit/home-390.png) | Keep the main action visible with banners present. Reserve space or use a suitable compact preference treatment. Test fresh visits, small screens, text zoom and keyboard interaction. |
| P1 | Mobile “Curate a Journey,” sample creation, shared creation and pricing’s free CTA lead back to `/`, adding unnecessary navigation. [Mobile menu](D:/travel-plannner-v2/src/components/MobileMenu.tsx:13), [sample](D:/travel-plannner-v2/src/app/sample/page.tsx:46), [pricing](D:/travel-plannner-v2/src/app/pricing/page.tsx:119) | Every create action opens the planner directly; sample/share actions prefill or copy the relevant trip. Use consistent “Plan a trip” and “My trips” labels. |
| P1 | Selecting Paris expands a long form; several preference categories and exact dates are mandatory. Switching Inspire/Tailor clears the draft, confirmed live. Typed changes also leave previously selected destination data intact in code. [Validation](D:/travel-plannner-v2/src/components/CurationForm.tsx:324), [input](D:/travel-plannner-v2/src/components/CurationForm.tsx:386), [mode mounting](D:/travel-plannner-v2/src/app/curate/CurateClient.tsx:139) | One persistent form: destination + dates/duration, visible defaults, optional personalization and existing plans. Changing destination text invalidates stale coordinates. An error or mode switch never loses entered information. |
| P1 | “Refine” changes budget/pace/interests and regenerates the entire itinerary. The hook clears the visible result before checking whether another generation is allowed. [Refine](D:/travel-plannner-v2/src/components/RefinePanel.tsx:99), [hook](D:/travel-plannner-v2/src/hooks/useStreamingItinerary.ts:146) | Preserve the prior version through edits, authentication, failures and insufficient-credit states. Add delete/move/add/lock/undo first; bounded replacement or day regeneration next. Clearly disclose any regeneration charge. |
| P1 | Saved trips omit the original dates, transport and planning brief; reopened trip views omit date/transport props. The archive is ordered by creation date. [Saved schema](D:/travel-plannner-v2/prisma/schema.prisma:11), [save action](D:/travel-plannner-v2/src/app/actions/saveTrip.ts:7), [saved viewer](D:/travel-plannner-v2/src/app/trips/[id]/page.tsx:250) | Save the full input and a versioned plan. Reopening on another device retains dates, preferences and accepted edits. Organize trips by upcoming/planning/past and show “Continue planning.” |
| P1 | Hotels and editorial copy appear before day navigation in the sample; the mobile first screen does not show the actual day plan. The list defaults Day 1 while the map defaults All and maintains separate state. [Live sample](D:/travel-plannner-v2/tmp/travalbee-audit/sample-mobile-dismissed.png), [viewer](D:/travel-plannner-v2/src/components/ItineraryViewer.tsx:194), [map](D:/travel-plannner-v2/src/components/ItineraryMap.tsx:138) | Put the trip day and its stops first. Hotels become a Stays section. Share selected day/stop between timeline and map. Mobile gets an accessible Itinerary/Map switch and reachable save/share/edit actions. |
| P1 | Visible activity/restaurant cards and map popovers provide information but lack useful directions/official-site actions. Day-level Google Maps links exist in the print/export component; that does not make each interactive card actionable. [Card](D:/travel-plannner-v2/src/components/TimelineCard.tsx:120), [popover](D:/travel-plannner-v2/src/components/ItineraryMap.tsx:277) | Add directions and verified official/booking links per stop. Distinguish a recommendation, a reservation requirement and an actual booking. Do not imply availability or booking confirmation. |
| P1 | Enrichment takes the first text-search result and retains model coordinates. Transit is straight-line distance divided by fixed speeds. Hours cache the generation weekday for 30 days and approximate timezone from longitude. Non-ASCII place names can collide in cache keys. [Enrichment](D:/travel-plannner-v2/src/app/api/itinerary-stream/route.ts:287), [travel estimates](D:/travel-plannner-v2/src/app/api/itinerary-stream/route.ts:298), [hours](D:/travel-plannner-v2/src/app/api/itinerary-stream/route.ts:347) | Resolve place identities/coordinates; use stable provider IDs; validate actual visit times in destination timezones; check route feasibility. Label approximations until actual route data is available. Test closed days, rivers, overnight hours and multilingual destinations. |
| P1 | Any saved trip with a known UUID can be loaded publicly without explicit enable-sharing or revocation controls. UUID guessing is difficult; this is not an enumeration finding. [Public loader](D:/travel-plannner-v2/src/app/shared/[id]/page.tsx:63) | Private by default; explicit revocable share tokens; a publication preview; omit sensitive booking details from public shares. Essential before client/agency use. |
| P1 | TypeScript/lint errors are bypassed during builds; local typecheck found five errors, including billing. [Configuration](D:/travel-plannner-v2/next.config.mjs:13) | Restore required checks and fix failures. Add a small regression suite around generation, retries, quotas, save/reopen, privacy and billing; use migrations with rollback plans. |
| P1 | General Vercel Analytics exists, but no custom activation funnel or acquisition attribution was found in source. [Analytics mount](D:/travel-plannner-v2/src/app/layout.tsx:105) | Measure source → planner → result → meaningful use, segmented by device and real prospects versus founder/friends. Confirm successful generations and payments server-side. |
| P2 | robots.txt and sitemap.xml return 404; inspected metadata lacks canonical setup and an explicit homepage share image. No dedicated destination acquisition pages were found. A missing robots file does not itself block crawling. [Metadata](D:/travel-plannner-v2/src/app/layout.tsx:25) | Add a sitemap, deliberate robots/index rules, canonical URLs, useful social previews and Search Console verification. Start with three reviewed destination pages; keep private app data out of indexing. |

### Trust and accessibility details

Replace hardcoded “Zero tourist traps,” “100% hidden gems,” and “95% of travelers never find” claims with supportable descriptions and examples. “Cross-referencing Michelin guides” is timer-based loading copy, not evidence of a real Michelin lookup. Show actual generation stages. Avoid presenting stock fallback imagery as a photograph of a specific venue. [Homepage claims](D:/travel-plannner-v2/src/app/page.tsx:31), [loader](D:/travel-plannner-v2/src/components/GenerationLoader.tsx:11), [image fallback](D:/travel-plannner-v2/src/components/TimelineCard.tsx:45)

Keep serif headings, but increase readability of working controls. Add persistent input labels, keyboard selection semantics, focus management for dialogs, visible focus, reduced-motion support and adequately sized touch controls. Tiny uppercase micro-copy is widespread; test contrast and 200% zoom rather than declaring compliance from source. [Global type](D:/travel-plannner-v2/src/app/globals.css:77), [refine dialog](D:/travel-plannner-v2/src/components/RefinePanel.tsx:120)

Verify offline claims by loading an explicitly downloaded trip in airplane mode after restarting the app. Make the downloaded state and missing live-map data clear. A cached list alone is insufficient evidence that all itinerary/maps/hotel functionality works offline. [Offline hook](D:/travel-plannner-v2/src/hooks/useOfflineTrips.ts:96), [service worker](D:/travel-plannner-v2/src/app/sw.ts:29)

Photo references are persisted and attribution fields are discarded in the inspected implementation. Google’s current Legacy Photos documentation prohibits caching photo references and requires supplied attribution when present. Review the applicable supplier agreement and redesign refresh/attribution handling; do not assume indefinite photo caching is a sustainable cost strategy. This is a supplier-documentation mismatch, not a legal determination. [Google documentation](https://developers.google.com/maps/documentation/places/web-service/legacy/photos)

## 5. Audience and competitive position

“People who travel often” describes frequency, not a sufficiently precise problem. A traveler planning a weekend, a family arranging a complex holiday and an advisor producing client proposals require different defaults, pricing and workflows.

| Direction | Problem to test | Why someone would choose TravalBee | Proof required before expanding |
|---|---|---|---|
| Consumer, recommended first experiment | Turn a near-term city break into realistic days without hours of research | A quick starting plan that respects existing reservations, is easy to change and is usable on the trip | Strangers retain substantial parts, return to the plan and accept an actual paid offer |
| Independent travel advisor, parallel discovery | Turn a client brief into a polished proposal with less correction/formatting work | Accurate, editable drafts and reusable branded output that fit an existing workflow | Several advisors pay for pilots and use it for multiple real client briefs |

Wanderlog already advertises collaborative editing, reservations, map view, route optimization and offline access. Mindtrip advertises recommendations with maps/photos, group planning, receipt organization and importing Google Maps saved places. These are incumbent feature claims, not independently measured quality. “AI itinerary + map” alone is therefore a weak differentiator. [Wanderlog](https://wanderlog.com/), [Mindtrip](https://mindtrip.ai/)

Agency competitors go much further into operations: Travefy combines proposals and itineraries with CRM/invoicing, while TravelJoy includes branded proposals, approvals and payments. Building an agency product means entering that workflow, not adding an “Agencies” label to the homepage. The smaller entry opportunity is a proposal-drafting assistant that works alongside existing systems. [Travefy](https://travefy.com/), [TravelJoy](https://traveljoy.com/)

The proposed differentiation to test is **“Make your booked plans and places you want to visit fit into days you can actually follow.”** Start with pasted place names/links and manually entered reservations; full email import, social-video ingestion and general concierge chat can wait. Routing accuracy and preserving user choices must support this promise before marketing it as achieved.

## 6. Proposed screens and navigation

### Homepage

Use a useful headline, for example **“Your next city break, planned around you.”** Supporting text: “Get a day-by-day starting plan with places to eat, things to do and a map. Keep what you like and make it your own.” Only promise editing once it exists.

Keep a compact TravalBee wordmark and the existing palette. Above the fold show destination entry, a primary **Plan my trip** action, a secondary **See a real example**, and “Try a plan without an account.” Include a genuine itinerary preview beside the form, rather than devoting the whole first screen to the brand name. Make the first action reachable while the cookie notice is visible.

Below that, show what the traveler actually receives, three reviewed destination examples, a simple three-step explanation and honest limits. Use real customer examples when they exist. Remove unsupported certainty rather than replacing it with fabricated testimonials.

### Create a trip

One form with two quick stages:

1. Destination, dates **or** duration, and an obvious “dates undecided” path. Show the supported duration before the user fills the form.
2. A visible summary of sensible pace/budget defaults and an optional “Personalize” section for interests, food needs, party, walking preference and existing bookings.

Combine Inspire/Tailor under “Already have plans?” with optional hotel and fixed activities. Preserve drafts, avoid silent destination mismatches, and show an always-visible submit action with understandable validation. Progressive disclosure should shorten initial effort without hiding constraints that affect feasibility.

### Trip workspace

Header: destination, actual travel dates, traveler summary, save status, share and export. Navigation: **Itinerary · Map · Stays · Trip details**. Desktop shows the selected day’s schedule alongside its map. Mobile starts on the itinerary and offers a clear map switch.

Each stop shows its time/window, a short reason it fits, duration, directions, verified source and edit controls. Detailed descriptions expand on demand. Move/remove/lock changes preserve all other accepted stops; alternatives explicitly update affected travel legs and conflicts. Add undo and version history. Put hotel affiliate recommendations in Stays, with disclosure, so they do not displace the itinerary’s main job.

Keep Save/Share/More reachable on mobile and preserve the result through sign-in. Sharing is available from the trip itself; a recipient can view without signing up and choose **Make a copy**, subject to privacy settings.

### My trips

Use **Planning / Upcoming / Past**, travel dates and a clear “Continue planning” action. Put billing and account usage in account settings rather than maintaining a competing generic dashboard. Add a simple “Today” view only once travelers demonstrate in-trip use.

## 7. Architecture plan

**Keep:** Next.js/React, PostgreSQL/Prisma, managed auth/deployment, Redis limits, Sentry and Stripe if paid validation warrants it. Review supported dependency versions during normal maintenance; do not undertake a framework migration simply as a response to no signups.

**Refactor:** one planning domain layer shared by all routes; one entitlement definition; one place-resolution service; one runtime-validated itinerary schema; one analytics contract. The existing documentation contains obsolete product names, conflicting one-call rules and business-model assumptions. Replace that with a short current specification. Cost-control rules should not prohibit the editing workflow users need; use cheap deterministic edits and bounded paid generation instead.

**Evolve data incrementally:**

- `Trip`: owner, destination identity, timezone, actual dates, planning brief/preferences, status and explicit visibility.
- `TripVersion`: accepted plan snapshot, schema version, timestamps and origin. A versioned JSON model is sufficient for the first editable release; normalize every item only when editing/query/concurrency requirements justify it.
- `Generation`: request/idempotency ID, status, inputs, persisted progress/result, error, usage and reserved credit.
- `ShareLink`: separate revocable token and approved public projection.
- Stable IDs inside day/stop data, resolved place identity, source metadata and user locks.

Migrate existing trips as legacy records with unknown original dates/preferences; do not invent missing values. Retain old readers until backfill/compatibility checks pass. Use reviewed schema migrations and backups before changing production data.

**Target execution:** validate brief → reserve entitlement → generate candidate plan → resolve places → validate schedule → progressively persist/display days → finalize result and cost → release reservation on failure. User edits update only affected parts and produce a new version.

The current stream depends on the browser connection. Add a durable job/worker if measured disconnects, retries or execution duration require generation to survive navigation. The UI can still stream or poll persisted progress. This is a focused infrastructure addition, not a need for microservices, Kubernetes or replacing the database. Completion and credit settlement must be idempotent regardless of transport.

A quality evaluation set should cover at least: ordinary city trips; a river/bridge route; a closed weekday; DST/overnight hours; Japanese/Arabic place names; a fixed booking; short walking tolerance; provider timeout; partial generation; simultaneous credit requests; and save/reopen after editing. Compare constraint violations and human correction effort between releases. Do not equate well-formed JSON with a trustworthy trip.

## 8. Acquisition, measurement and pricing tests

Recruit people with a real trip coming up, not general followers who say travel apps sound interesting. Start through relevant local/travel groups where research invitations are allowed, small destination creators and direct founder conversations. No outreach was sent as part of this audit.

Build three reviewed destination pages, each with an actual example plan, useful constraints and a prefilled planning action. If using social posts, link to the exact destination/example featured in the post with campaign attribution. Broad scenic content may get views without attracting someone currently trying to plan. Do not assume SEO or social content is free acquisition; count founder time. Avoid mass-produced thin destination pages and large ad spend before there is a usable funnel.

Observe ten unrelated consumers attempting their own trip. Before showing the product, ask them to show how they currently plan, what is already booked and what remains hard. During use, record misunderstandings and corrections. Afterward, ask which suggestions they would actually keep, what they must verify elsewhere, and whether the app replaced a real task. Follow up during the same planning cycle, with permission.

Separately interview 8–10 advisors and prepare a small number of proposals from real, appropriately anonymized briefs. Measure drafting plus correction time against their ordinary process. Offer a paid pilot with clear deliverables before adding organization accounts, CRM, payments, white-label domains or supplier integrations.

Instrument: `planner_started`, `destination_selected`, `form_validation_failed`, `generation_requested`, `first_day_shown`, `generation_completed/failed`, `trip_saved`, `stop_edited`, `directions_clicked`, `trip_reopened`, `share_created`, `shared_trip_viewed`, `trip_copied`, `checkout_started`, `payment_succeeded`. Record campaign/source, device, experiment and pseudonymous journey IDs as appropriate. Avoid capturing raw booking details, dietary text or free-form briefs in analytics. A share click or download request does not prove another person viewed it or that the trip was used.

| Question | Metric with explicit denominator |
|---|---|
| Are the right people arriving? | Qualified non-friend visits and source; interview recruitment yield |
| Do they understand the offer? | Planner starts / qualified landing visits |
| Is setup too hard? | Valid generation requests / planner starts, by field/device |
| Does generation deliver? | Completed usable results / valid requests; p50/p95 first-day latency; failure reason |
| Is the plan valuable? | Interview-rated usable plans; saved/edited/shared or reopened plans / completed plans, reported separately |
| Do they use it again when relevant? | Reopening for the same upcoming trip and eventual next-trip use, excluding test users |
| Can it support a business? | Actual paid conversions and contribution margin per activated traveler or agency pilot |

Suggested initial decision rules, **internal targets rather than market benchmarks**: 7 of 10 consumers create a plan they judge usable without founder rescue; 5 reuse/share/reopen it for the real trip; 3 accept a clearly described paid offer. Alternatively, at least 3 advisors pay for pilots and reuse them for multiple briefs. With such small samples, these justify another experiment, not a claim of product-market fit. If results fail, inspect the specific objection and test one changed proposition before enlarging the build.

Test a trip pass or trip bundle against a subscription when the product can reliably fulfill either offer. Planning is episodic even for many frequent travelers. Agencies may fit recurring billing if repeat work is demonstrated. Keep the free sample/guest path as acquisition; bound costly generation rather than restricting cheap viewing/manual edits. Affiliate revenue is supplemental until actual clicks and attributed bookings establish otherwise.

Use **contribution per paid trip = net revenue minus generation, place/routing/photo/map usage, payment fees and attributable support/refund costs**. Reconcile against actual vendor bills. Existing cost logs and revenue summaries omit material components, so no defensible margin or acquisition budget can be calculated from the current audit.

## 9. Delivery sequence and decision gates

Indicative plan for one experienced builder with founder-led recruitment; dates are estimates, not commitments. Recruitment runs alongside fixes. No phase requires waiting for a full redesign before talking to prospects.

| Window | Scope | Completion / decision gate |
|---|---|---|
| Days 1–3 | Close key exposure; unify advertised limits and real next actions; correct high-intent links and banner overlap; add funnel events; schedule prospects | The first journey is measurable and has no known marketing/billing dead end. Validate changes with public desktop/mobile smoke checks. |
| Days 4–10 | Fix lost drafts, destination mismatch, destructive refinement states and credit/reset behavior; restore checks; run first observed consumer sessions and advisor interviews | Identify the actual failure point with session evidence. Keep the previous plan on all error/auth paths. |
| Weeks 2–3 | Test clearer landing/setup; add direct directions/source actions; persist trip input; introduce basic edit/undo/autosave; start place/time validation fixes | Travelers can change and reopen the same plan with dates and preferences intact; evaluate on real briefs. |
| Weeks 3–4 | Complete a narrow reliable planning loop; release three reviewed acquisition pages; try paid consumer offers and manually assisted advisor pilots | Choose the next segment from observed use, correction effort and payment, rather than expressed interest alone. |
| Weeks 5–8, conditional | For consumer evidence: better saved-place input, bounded replacement, shared copying and trip-day use. For advisor evidence: reusable templates, branded proposals, versions/approval, minimal client workspace | Invest only in the chosen workflow. Add durable background jobs if reliability measurements justify them. |

If qualified people do not reach the site, work on access and distribution. If they arrive but do not start, test the promise/examples. If they abandon setup, simplify it. If they generate and reject results, improve accuracy/control. If they value results but do not return, investigate their planning lifecycle. A retention feature cannot solve an acquisition problem, and more traffic cannot repair an unusable itinerary.

Defer a full infrastructure rewrite, native mobile apps, a general voice concierge, broad social/community features, a complete agency CRM, direct booking infrastructure and hundreds of SEO pages. None has evidence yet that warrants diverting effort from the first successful customer journey.

## 10. Verification record and remaining checks

The code audit ran `tsc --noEmit --incremental false`; it failed with five errors: legacy route Set iteration, a Usage cast, Stripe Invoice field mismatch, RefinePanel interest typing and incomplete SearchBar request data. Build configuration suppresses these errors. No checked-in automated core-flow assertion suite or Prisma migration directory was found in the inspected repository. Existing screenshot scripts are useful but do not validate billing/quota correctness.

Before declaring the proposed release ready, test: guest → generation → sign-in → save → reload; failed refinement retaining the previous version; two concurrent requests with one credit; rolling-window reset without dashboard access; a real Stripe test-mode renewal/cancellation/retry fixture; private/shared/revoked links; real device browser navigation; and genuinely downloaded offline trips. These checks were not performed against production during this planning audit.

Remaining business unknowns: qualified visitor volume, acquisition channel access, competitor switching reasons, generation quality on real trips, correction time, willingness to pay, support burden and actual unit costs. The recommended plan is deliberately designed to answer these before large infrastructure investment.
