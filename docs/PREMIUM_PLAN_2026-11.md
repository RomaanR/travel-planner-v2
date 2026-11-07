# TravalBee Premium: end-to-end plan (2026-11-05)

Status: proposal, nothing built. Scope agreed with the owner: travel alerts, trip kit, multi-city trips, refine credits. Share and co-plan is out of scope.

## 1. The offer

| | Free | Premium |
|---|---|---|
| Price | $0 | $9.99 / month or $79 / year |
| Trips per month | 3 (today 5) | 10 |
| Days per trip | up to 3 | up to 14 |
| Cities per trip | 1 | up to 3 |
| Refines per month | 0 | 5 |
| Travel alerts by email | no | yes |
| Trip kit | basic print only | calendar export, branded PDF, offline, "Know before you go" |

Notes
- The 10 / 14 numbers already exist in code (`src/lib/credits.ts`, forms). Only Free (5 to 3) changes.
- The schema comment on `UserProfile.isPremium` still says "$10.99/month". Update it.
- The pricing page says Premium includes a "Dedicated Concierge", but the code only gates trip length by plan (`planningMode: "tailor"` is not gated in `itinerary-stream/route.ts`). Decide: gate it, or drop the claim.
- A one-time Trip Pass ($4.99) is deferred. It needs a per-trip entitlement table and is not required for launch.

## 2. What is enforced where (important)

Only server-enforced features are really paid features.

| Feature | Enforcement | Notes |
|---|---|---|
| Trips, days, cities, refines | Server (generation route) | Solid |
| Travel alerts | Server (alert job checks `isPremium`) | Solid |
| Calendar export, branded PDF, "Know before you go" | Client-side | A determined user can bypass UI gating. Acceptable: the value is convenience, not secrets. |
| Offline access | Client-side | Same |

## 3. Stripe

### 3.1 Products and prices (create in test mode first, then live)
- Product "TravalBee Premium"
  - Price A: $9.99 / month recurring
  - Price B: $79 / year recurring
- Prices are immutable in Stripe: create new ones, do not edit the old one. Archive the old monthly price once nobody is on it.
- Customer portal: enable cancel, payment-method update, and **plan switching between A and B** (list both prices).
- Env vars: `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`. Keep `STRIPE_PRICE_ID` as a fallback for monthly during transition.
- Tax: decide on Stripe Tax before going live (US sales tax on digital subscriptions varies by state; EU/UK VAT if selling there). This is an accountant question; the plan only reserves the switch (`automatic_tax: { enabled: true }` on checkout).

### 3.2 Checkout changes (`src/app/api/stripe/checkout/route.ts`)
- Body becomes `{ plan: "monthly" | "annual" }` (Zod enum, default monthly). Server maps the plan to the price ID. The client never sends a price ID.
- Everything else stays: one customer per user, 409 when already subscribed, rate limit, metadata `clerkUserId`.
- Pricing page: monthly/annual toggle, "Save 34%" label, price shown (replaces the current dash).

### 3.3 The annual-plan credit problem (needs a design change)
Today credits are granted once per paid invoice (`subscription_create` / `subscription_cycle`, `src/lib/billing.ts`). That is right for monthly. An annual subscriber is invoiced once a year, so they would get 10 trips for 12 months.

Options
1. Grant 120 credits per year. Simple, but a user can burn the whole year in days (cost up to about $60 against $79 revenue).
2. **Monthly reset by lazy evaluation (recommended).** No cron. When credit status is read, if now is past `creditsResetAt`, atomically reset credits for the new monthly window.
   - `UPDATE ... WHERE id = ? AND creditsResetAt = <old value>` makes the reset race-safe.
   - Works for monthly plans too (idempotent with the invoice grant) and survives missed webhooks.

Edge cases to test: plan switch monthly to annual (Stripe sends a `subscription_update` invoice, which deliberately grants nothing; the lazy reset covers it), refund, downgrade, `past_due` grace.

### 3.4 Webhook changes
- No new events needed. Existing ten events stay.
- `prepareSubscriptionSync` also stores `interval` ("month" | "year") from the subscription item price.
- On a new paid period for a monthly plan: unchanged (credits to 10, and now also refine credits to 5, `creditsResetAt` set).

### 3.5 Admin metrics
- Revenue from paid invoices is already correct.
- Add MRR: monthly subs at face value plus annual subs divided by 12.

## 4. Database changes (all additive, nothing dropped)

```prisma
model UserProfile {
  // new
  refineCredits  Int       @default(0)      // premium: refines left this period
  creditsResetAt DateTime?                  // when the next monthly reset is due (annual plans, and a safety net for monthly)
  alertsEnabled  Boolean   @default(true)   // email travel alerts; unsubscribe link sets false
}

model Subscription {
  // new
  interval String?                          // "month" | "year"
}

model Trip {
  // new (denormalised so alerts can find trips without scanning JSON)
  countryCodes  String[]  @default([])      // ISO alpha-2, one per city/stop
  departureDate DateTime?
  returnDate    DateTime?
  @@index([departureDate])
  // plus a GIN index on countryCodes (raw SQL) once volume justifies it
}

model AlertDelivery {                       // new: prevents duplicate emails
  id      String   @id @default(uuid())
  userId  String
  tripId  String
  kind    String                            // "level_raised" | "disaster"
  refId   String                            // AdvisoryChange.id or NewsItem.id
  sentAt  DateTime @default(now())
  @@unique([tripId, kind, refId])
  @@index([userId])
}
```

- Multi-city needs no new table: the itinerary and request live in JSON columns.
- Backfill: a one-off script fills `countryCodes`, `departureDate`, `returnDate` for existing trips from `request` and the destination text. Trips with no match keep an empty array (they simply get no alerts).
- Apply with `prisma db execute` as before. Your local `.env.local` points at the production database, so each change needs your explicit go-ahead.
- Account deletion: `AlertDelivery` rows must be deleted with the user (extend `src/lib/accountDeletion.ts`). This sits next to the open M5 item.

## 5. Features

### 5.1 Travel alerts (headline feature)
How it works
1. Save time: when a trip is saved, derive `countryCodes` (match the destination against `src/content/worldCountries.json`; fall back to the stop's place details) and the dates from `request`.
2. The daily news cron already detects changes: a new `AdvisoryChange` row (US level change) and new high-severity `NewsItem` rows (disaster alerts, severity 3 and up).
3. After ingest, an alert step finds premium users whose trips include the affected country and whose `returnDate` is still in the future (and `departureDate` within roughly 12 months).
4. For each match not already in `AlertDelivery`: email via Resend (sender `support@travalbee.com` is already verified), then insert the `AlertDelivery` row.
5. Email content: country, what changed (from level X to Y, or the disaster headline), the trip it affects, a link to the trip and the official source. No advice, no scare language; it says "check the official advisory".

Details that matter
- Email addresses are fetched from Clerk at send time (`clerkClient`), not copied into our database.
- Unsubscribe: signed link (same HMAC approach as save tokens) sets `alertsEnabled = false`, with a one-click page. Also a toggle on the dashboard.
- Volume control: cap sends per run and per user per day; a mass advisory change must not produce hundreds of emails in one function run. Send in batches and let the next run continue.
- Cron limits: the news cron has `maxDuration = 60` and takes about 17 s steady state. Alert sending goes in a separate step with its own time budget. Vercel Hobby allows only two cron jobs and both are used, so either run the alert step inside the news cron or move to Vercel Pro (needed for commercial use anyway: audit item M8). Recommended: upgrade to Pro and add `/api/cron/alerts` at 06:00 UTC.
- Honest scope: alerts follow US level changes and GDACS Orange/Red disasters. UK and Canada items are not level-based; do not promise them.
- Privacy page and FAQ must describe the alert emails (generic wording, no vendor names).

### 5.2 Trip kit
- **Calendar export (.ics):** generated in the browser from the saved itinerary (dates from `request`, times from `startTime`, floating local time because the app has no timezone data). One event per timeline item, location and notes filled from the item.
- **Branded PDF without watermark:** the current export is browser print (`PrintItinerary.tsx`). Premium gets a cleaner layout (cover, map, per-day pages). There is no watermark today, so the free version becomes the plain one.
- **Know before you go:** a panel on the trip page showing current US/UK/Canada advisory levels, active alerts, and entry-related updates for the trip's country, with links to the official source. Data already exists in `AdvisoryLevel` and `NewsItem`. It must carry a clear "not legal or visa advice" line.
- **Offline:** `OFFLINE_MODE_ENABLED` is currently `false` in `useOfflineTrips.ts`. Turning it on for Premium requires finishing audit item L11 first (clear the per-user cache on sign-out), caching the trip page and map tiles through the service worker, and a visible "available offline" state. Treat as its own sub-phase and ship last.

### 5.3 Refine credits
- Today "Refine" regenerates the whole trip and consumes a normal credit.
- New: Premium gets 5 refine credits per period (`refineCredits`), reserved and refunded atomically exactly like trip credits (`reservePremiumCredit` / `refundPremiumCredit`).
- Generation request gains `refineOf: <generationId>`; the server checks the parent belongs to the user, then charges a refine credit instead of a trip credit.
- Cost warning: a refine costs about the same as a new trip. 10 trips plus 5 refines is at most 15 generations a month, about $1.5 to $7.5 against $9.99. That is the reason for 5 and not 10. Review real averages in `/admin/metrics` after a month and adjust.
- Free users keep paying a normal credit to regenerate.

### 5.4 Multi-city trips (largest build, ships last)
Request
- New optional `stops`: up to 3 items `{ name, placeId, lat, lng, days }`. Total days must equal `duration` (max 14). `destination` becomes a display string ("Paris, Rome").
- Server-enforced Premium only (Zod plus plan check in the generation route).

Prompt and pipeline (`src/app/api/itinerary-stream/route.ts`)
- The Neighbourhood Lock rule becomes per city: each day stays inside its stop's city. Add an explicit inter-city transfer item on travel days (new timeline type `transfer`, with mode and duration), and a rule against geographic zig-zagging between cities.
- Day plans gain `city` so the viewer, map and hotels group by city. Place enrichment already takes a search centre per day; pass the stop's coordinates.
- `recommendedStays` are generated per city.
- `max_tokens` is 16000: a 14-day, 3-city trip is the worst case, so test it early, and consider lowering stops-per-day or capping multi-city at 10 days if it truncates.

UI
- Form: "Add another city" up to 3, with a days split control.
- Viewer, map and print layout: city headers, colour per city, transfer cards.
- Compatibility: `normalizeDayPlan` already handles old shapes; `city` and `transfer` are optional, so saved trips keep working.

## 6. Delivery phases

| Phase | Content | Needs from you |
|---|---|---|
| 0. Prerequisites | Stripe test keys and webhook secret, Vercel Pro, decide tax setting, confirm pricing | Accounts and decisions |
| 1. Foundation | Prices, checkout plan param, `interval`, entitlement helper, lazy monthly reset, Free to 3, schema changes (UserProfile, Subscription, Trip, AlertDelivery), backfill, pricing page toggle | Approve DB changes |
| 2. Alerts | Trip metadata at save, alert job, email template, unsubscribe, dashboard toggle, caps | Resend sender confirmed |
| 3. Trip kit (minus offline) | .ics export, branded PDF, Know before you go | |
| 4. Stripe test run and launch | Full test plan (section 7), legal and FAQ copy, live keys, small soft launch | Live Stripe keys |
| 5. Refine credits | Request flag, reserve/refund, UI counter | |
| 6. Multi-city | Request/prompt/viewer/map changes, truncation testing | |
| 7. Offline | Finish L11, cache strategy, UI | |

Launch after phase 4. Phases 5 to 7 ship as updates to paying users. Alerts and the trip kit are the reason to subscribe on day one.

## 7. Stripe test plan (test mode)
Extends `docs/stripe-setup.md`.

| Scenario | Expected |
|---|---|
| Subscribe monthly | `Subscription.interval = month`, premium, 10 trips, 5 refines |
| Subscribe annual | `interval = year`, premium, 10 trips, `creditsResetAt` about 1 month ahead |
| Annual, advance test clock 1 month | credits reset to 10 without any invoice |
| Switch monthly to annual in portal | one subscription, no duplicate credit grant, premium unbroken |
| Cancel at period end | premium until period end, alerts stop after |
| Failed renewal | `past_due`, premium kept, then downgrade after final retry |
| Full refund | credits 0 as today; alerts stop when premium ends |
| Duplicate webhook | no change |
| Tax on (if enabled) | tax line appears; invoice totals match |
| Downgrade then generate | Free limits (3 trips, 3 days, 1 city) apply immediately |

## 8. Risks and open decisions
1. Cost: refines and multi-city raise cost per user. Mitigated by the 5 refine cap, daily caps, and watching `/admin/metrics`.
2. Alert accuracy and liability: alerts repeat official data; copy must stay factual with a link to the source.
3. Email deliverability and law: unsubscribe in every email, physical identity in the footer (OpsisX LLC), and a mention in Privacy. Have the lawyer review.
4. Vercel Hobby is non-commercial and limits cron jobs: upgrade before charging.
5. Decisions needed: monthly price ($9.99 vs the old $10.99), whether to keep the "Concierge" claim, tax setting, Trip Pass later or never.
