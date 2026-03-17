# Seek Wander — Financials & Unit Economics
### The Ledger — Financial Architecture Document
**Classification:** Confidential — ZenithAI Data Room
**Document Version:** 1.0
**Last Updated:** March 2026
**Revenue Model:** Native Affiliate Placements (Pivoted from Stripe Paywall)

---

## Table of Contents

1. [Executive Summary: The Business Model](#1-executive-summary-the-business-model)
2. [Margin Protection & Cost Engineering](#2-margin-protection--cost-engineering)
3. [Unit Economics — Cost Per Curation](#3-unit-economics--cost-per-curation)
4. [Revenue Model — The Affiliate Math](#4-revenue-model--the-affiliate-math)
5. [The Internal Ledger — CostLog](#5-the-internal-ledger--costlog)
6. [Infrastructure Runway — Fixed Costs](#6-infrastructure-runway--fixed-costs)

---

## 1. Executive Summary: The Business Model

### Model Classification: High-Volume Affiliate Commerce

Seek Wander operates as a **zero-CAC, high-ARPU affiliate commerce platform** dressed in the aesthetic of a luxury editorial product. The product is free at the point of use. Revenue is captured entirely on the backend when users act on the recommendations embedded in their curated itinerary.

The model is structurally identical to the playbooks that built NerdWallet ($8.7B IPO), TripAdvisor ($4B peak market cap), and Booking Holdings ($120B+ market cap): acquire users at zero marginal cost via a genuinely useful free product, then monetize the high-intent behaviour that the product naturally produces.

In Seek Wander's case, the high-intent behaviour is **luxury travel booking**. A user who has just received a curated 5-day Amalfi Coast itinerary — complete with a specific hotel recommendation, a Michelin-starred restaurant reservation, and a private boat tour — is the highest-quality booking prospect in the travel vertical. They have intent, they have a specific recommendation they trust, and they have a credit card.

### The Strategic Pivot: Removing the Paywall

The original monetization strategy (Phase 9: $4.99 Stripe paywall per generation) was analytically sound but strategically premature. At the pre-brand-awareness stage, a hard paywall imposes a 60–80% estimated conversion penalty on top-of-funnel user acquisition. Every user who bounces at the payment screen is a lost affiliate opportunity worth a potential $160+ in backend commissions.

**The pivot thesis:** One converted hotel booking (commission: ~$160) is worth 32 paywall transactions ($4.99 × 32 = $159.68). Maximizing the volume of users who receive and act on curated recommendations is therefore a higher expected-value strategy than maximizing payment conversions at acquisition.

> **Key insight:** The paywall monetizes the act of planning. The affiliate model monetizes the act of booking. Booking is worth 32× more per transaction, occurs at higher intent, and requires zero upfront friction.

### Business Model Summary

| Dimension | Value |
|-----------|-------|
| **Revenue model** | Native affiliate commissions on travel bookings |
| **User acquisition cost (CAC)** | $0 — programmatic SEO + social automation + viral sharing |
| **Cost per generation (cache miss)** | ~$0.08–$0.12 |
| **Cost per generation (cache hit)** | ~$0.03 |
| **Blended affiliate commission** | 4–10% of booking value |
| **Revenue per converted user** | $80–$200 (hotel: $160, tour: $32, activity: $40) |
| **Gross margin at scale** | >95% (variable cost is LLM tokens only) |
| **Primary fixed infrastructure** | Vercel + Supabase + Clerk + Upstash (all free/hobby tier) |

---

## 2. Margin Protection & Cost Engineering

Seek Wander's cost structure was architected with a single mandate: **the variable cost of serving a user must approach zero as the platform scales.** Three specific engineering decisions achieved this before the first dollar of revenue.

### 2.1 The PlaceCache — Supabase Google Places Cache

**The problem:** The Google Places API charges $0.032 per Text Search call and $0.017 per Place Details call. With 8–10 `TimelineItem` entries per itinerary (activities + meals), a fully uncached generation incurs approximately $0.40–$0.49 in Google API costs alone — before a single Anthropic token is counted.

**The solution:** A `PlaceCache` table in Supabase PostgreSQL stores the result of every Google Places API call, keyed by `"{normalized-place-name}|{normalized-city}"`. On every subsequent generation that includes the same venue, the enrichment data is returned from the database at zero API cost.

```
Cache key: "nobu malibu|malibu"
Cached fields: photoUrl, rating, userRatingsTotal, hoursOpen, priceLevel
TTL: 30 days (enforced by updatedAt timestamp comparison)
```

**Cost impact at scale:**

| Scenario | Google API Cost | Cache Behaviour |
|----------|----------------|-----------------|
| First generation — new destination | $0.40–$0.49 | 100% miss — all calls live |
| Second generation — same destination | $0.00 | 100% hit — zero API calls |
| Mixed — 50% popular destinations | ~$0.20–$0.24 | 50% hit rate |
| Mature platform — 80% cache hit rate | ~$0.08–$0.10 | 80% hit rate |

**The 14-day TTL Cron Cleanup:**
A Vercel Cron Job runs daily at 00:00 UTC (`GET /api/cron/cleanup`) and executes:

```sql
DELETE FROM "PlaceCache"
WHERE "updatedAt" < NOW() - INTERVAL '14 days'
```

The `updatedAt` field uses Prisma's `@updatedAt` directive — it is automatically refreshed on every cache hit upsert, meaning frequently-accessed venues perpetually renew their TTL. Only venues that have not been accessed in 14 days are purged. This prevents unbounded Supabase row growth without sacrificing cache utility for popular destinations.

---

### 2.2 Haversine Replacement — Eliminating the Distance Matrix API

**The problem:** The Google Distance Matrix API charges $0.005 per origin-destination element. A 5-day itinerary with 8 `TimelineItem` stops per day generates 35 consecutive-stop pairs. At full utilisation, this represents $0.175 in Distance Matrix costs per generation — for transit estimates that a mathematical formula can produce with equivalent utility.

**The solution:** The Distance Matrix API was permanently removed and replaced with a pure Haversine distance calculation running entirely in-process on the Next.js serverless function:

```
For each consecutive (coord_a, coord_b) pair in timeline[]:
  km = 2 × R × arcsin(√(sin²(Δlat/2) + cos(lat_a) × cos(lat_b) × sin²(Δlng/2)))
  walkingMinutes  = max(1, round((km / 5)  × 60))   // 5 km/h pedestrian
  drivingMinutes  = max(1, round((km / 25) × 60))   // 25 km/h urban average
```

**Accuracy trade-off:** The Haversine formula computes great-circle (straight-line) distances. Actual walking or driving routes are 10–30% longer depending on urban geometry. For a trip planning application — where the user is deciding whether to walk between venues, not navigating turn-by-turn — this accuracy is more than sufficient.

**Cost saving:** $0.175 per generation × 1,000 monthly generations = **$175/month saved** at 1K users. At 10K users: **$1,750/month**. Zero ongoing cost regardless of scale.

---

### 2.3 Local Time Computation — Eliminating Live openNow API Calls

**The problem:** Displaying whether a venue is currently open requires either (a) a live Google Places API call at render time, or (b) storing the venue's opening hours and computing the status locally. Option A charges $0.017 per Place Details call on every cache hit. At 100 cache hits per day across all generations, this represents $1.70/day ($51/month) for data that is already stored in `PlaceCache.hoursOpen`.

**The solution:** The `parseOpenNow(hoursOpen: string, lng: number)` function in `src/lib/itineraryUtils.ts` computes open/closed status entirely in-process:

```
UTC offset estimate = Math.round(lng / 15) hours
  (longitude / 15° ≈ UTC hour offset, accurate to ±30 minutes)

Parse "9:00 AM – 9:00 PM" against estimated local time:
  "Open 24 hours" → true
  "Closed"        → false
  "HH:MM AM – HH:MM PM" → compare currentMins against [openMins, closeMins]
  Overnight spans (closeMins < openMins) → handled correctly
```

**Accuracy:** ±30 minutes versus actual local time. For a trip planning tool — where the user is deciding whether to visit a museum tomorrow, not in the next 5 minutes — this is entirely fit for purpose.

**Cost saving:** Eliminates every Place Details API call on cache hits. At 80% cache hit rate across 1,000 daily `TimelineItem` enrichments: **$13.60/day saved** ($408/month) at meaningful scale.

---

## 3. Unit Economics — Cost Per Curation

### Pricing Constants

| Service | Cost Unit | Rate |
|---------|-----------|------|
| Anthropic Claude (input tokens) | Per 1M tokens | $3.00 |
| Anthropic Claude (output tokens) | Per 1M tokens | $15.00 |
| Google Places Text Search | Per call | $0.032 |
| Google Place Details | Per call | $0.017 |
| Google Distance Matrix | Per element | $0.005 — **REMOVED** |

### Scenario A — New Destination (Cache Miss, 100%)

*All 8 TimelineItem slots require fresh Google API calls. No prior cache entries.*

| Cost Component | Calculation | Cost (USD) |
|---------------|-------------|-----------|
| Claude input tokens | ~3,500 tokens × ($3.00 / 1,000,000) | $0.0105 |
| Claude output tokens | ~2,800 tokens × ($15.00 / 1,000,000) | $0.0420 |
| Google Text Search × 8 | 8 × $0.032 | $0.2560 |
| Google Place Details × 6 | 6 × $0.017 (NATURE/ADVENTURE skipped) | $0.1020 |
| Distance Matrix | Permanently removed | $0.0000 |
| **Total** | | **~$0.41** |

*At 8% blended affiliate commission on a single $2,000 hotel booking, this generation pays for itself 390× over.*

### Scenario B — Popular Destination (Cache Hit, 100%)

*All 8 TimelineItem slots are served from PlaceCache. Zero Google API calls.*

| Cost Component | Calculation | Cost (USD) |
|---------------|-------------|-----------|
| Claude input tokens | ~3,500 tokens × ($3.00 / 1,000,000) | $0.0105 |
| Claude output tokens | ~2,800 tokens × ($15.00 / 1,000,000) | $0.0420 |
| Google Places API | 100% cache hit | $0.0000 |
| **Total** | | **~$0.053** |

### Scenario C — Blended (80% Cache Hit Rate, Mature Platform)

*Realistic steady-state for a platform with 6+ months of PlaceCache accumulation.*

| Cost Component | Calculation | Cost (USD) |
|---------------|-------------|-----------|
| Claude tokens (all generations) | Constant | $0.0525 |
| Google APIs (20% miss rate) | 20% × $0.3580 | $0.0716 |
| **Total** | | **~$0.124** |

### Cost Trajectory Summary

| Stage | Cache Hit Rate | Cost Per Generation |
|-------|---------------|---------------------|
| Launch (Month 1) | 0% | ~$0.41 |
| Early Growth (Month 3) | 40% | ~$0.20 |
| Growth (Month 6) | 65% | ~$0.18 |
| Mature (Month 12+) | 80%+ | ~$0.12 |
| Theoretical maximum | 100% | ~$0.05 |

> **The cost curve is permanently downward.** Every generation at a previously-visited destination reduces the marginal cost of every future generation at that destination to $0.05. PlaceCache is a compounding cost moat.

---

## 4. Revenue Model — The Affiliate Math

### Injection Architecture

Every `TimelineItem` in the generated itinerary is passed through `src/lib/affiliateLinks.ts` at render time. The resolver maps item type and destination to an affiliate deep link with UTM attribution parameters:

```
TimelineItem { type: "dinner", title: "Nobu Malibu", ... }
  → affiliateLinks.resolve(item, destination)
  → "https://opentable.com/nobu-malibu?ref=seekwander&utm_source=seekwander&..."

TimelineItem { type: "activity", title: "Fushimi Inari Private Tour", ... }
  → "https://viator.com/tours/kyoto?ref=SW-{userId}&utm_campaign=kyoto"
```

The link renders in `TimelineCard` as a subtle `"Reserve a table →"` or `"Book this experience →"` text link — DM Sans 8pt, `ink-light` colour, indistinguishable from editorial concierge copy.

### Commission Structure

| Partner | Category | Commission Rate | Avg Booking Value | Revenue Per Conversion |
|---------|----------|----------------|-------------------|------------------------|
| Booking.com | Hotels & resorts | 4–6% | $1,500–$4,000/stay | $60–$240 |
| Viator | Tours & experiences | 8% | $150–$800/booking | $12–$64 |
| GetYourGuide | Activities | 8–10% | $100–$500/booking | $8–$50 |
| OpenTable | Restaurants | $1–2/cover | N/A | $2–$8/booking |

### The ARPU Model

**Conservative single-user conversion scenario:**
```
User generates a 3-day Paris itinerary
  → Books 1 hotel night via Booking.com: $800 stay × 5% = $40 commission
  → Books 1 Louvre private tour via Viator: $200 × 8% = $16 commission
  → Makes 2 restaurant reservations via OpenTable: 2 × $3 = $6 commission
  ─────────────────────────────────────────────────────────────────────
  Total revenue from 1 user, 1 itinerary: $62
  Cost of generation: $0.12
  Gross margin: 99.8%
```

**Aspirational single-user conversion scenario:**
```
User generates a 5-day Maldives itinerary
  → Books overwater villa via Booking.com: $3,000/night × 5 nights = $15,000
    Commission: $15,000 × 5% = $750
  → Books seaplane transfer via Viator: $600 × 8% = $48
  → Books diving excursion via GetYourGuide: $300 × 9% = $27
  ─────────────────────────────────────────────────────────────────────
  Total revenue from 1 user, 1 itinerary: $825
  Cost of generation: $0.12
  Gross margin: 99.985%
```

### Scale Model — Monthly Projections

| Monthly Active Users | Avg Generations/User | Conversion Rate | Avg Revenue/Conversion | Monthly Revenue | Monthly AI Cost | Net Margin |
|---------------------|---------------------|----------------|----------------------|----------------|----------------|------------|
| 500 | 2 | 8% | $80 | $3,200 | $124 | 96.1% |
| 1,000 | 2 | 8% | $80 | $6,400 | $248 | 96.1% |
| 5,000 | 2.5 | 10% | $100 | $50,000 | $1,550 | 96.9% |
| 10,000 | 3 | 12% | $120 | $144,000 | $3,720 | 97.4% |
| 50,000 | 3 | 15% | $150 | $337,500 | $18,600 | 94.5% |

*Assumptions: 80% cache hit rate at scale; blended generation cost $0.124; conversion rate increases with brand authority; affiliate commission blended at 6%.*

> **The model scales near-linearly with users and super-linearly with brand authority.** As Seek Wander becomes a trusted editorial voice, conversion rates and average booking values both increase — without any increase in marginal cost per user.

---

## 5. The Internal Ledger — CostLog

### Architecture

Every itinerary generation writes a financial record to the `CostLog` table in Supabase **synchronously** — awaited before the HTTP response is returned. This is a deliberate architectural decision: Vercel serverless functions are frozen the instant the HTTP response exits, killing any fire-and-forget background write. Awaiting the write guarantees zero financial data loss.

```ts
// src/app/api/itinerary/route.ts — executed after every generation
await prisma.costLog.create({
  data: {
    userId,          // Clerk userId (null for unauthenticated)
    destination,     // "Paris, France"
    aiCost,          // Decimal(10,6) — e.g. 0.052500
    googleCost,      // Decimal(10,6) — e.g. 0.071600
    totalCost,       // Decimal(10,6) — e.g. 0.124100
    cacheHits,       // int — PlaceCache hits this generation
    cacheMisses,     // int — fresh Google API calls
  }
});
// GenerationMeta logged to server console only — never in HTTP response
return Response.json(itinerary);
```

### Prisma Schema

```prisma
model CostLog {
  id          String   @id @default(uuid())
  userId      String?                         // null = unauthenticated generation
  destination String
  aiCost      Decimal  @db.Decimal(10, 6)     // 6 decimal places = $0.000001 precision
  googleCost  Decimal  @db.Decimal(10, 6)
  totalCost   Decimal  @db.Decimal(10, 6)
  cacheHits   Int
  cacheMisses Int
  createdAt   DateTime @default(now())
}
```

**Why `Decimal(10,6)` and not `Float`:** IEEE 754 floating-point arithmetic accumulates rounding errors in financial summations. `Decimal(10,6)` stores exact decimal values, giving the `/admin/metrics` aggregate queries — `SUM(totalCost)`, `AVG(totalCost)`, `SUM(cacheHits)` — mathematically correct results regardless of row count.

### Admin Dashboard — `/admin/metrics`

The internal BI dashboard aggregates `CostLog` data in real time:

| KPI Card | Query |
|----------|-------|
| Total Spent | `SUM(totalCost)` across all rows |
| Total Generations | `COUNT(*)` across all rows |
| Avg Cost / Trip | `AVG(totalCost)` |
| Cache Hit Rate | `SUM(cacheHits) / (SUM(cacheHits) + SUM(cacheMisses))` |

**Access control:** The route returns `notFound()` for all non-admin access — `ADMIN_USER_ID` env var match against Clerk `userId`. The route's existence is not leaked to non-admin users (neutral 404, not redirect).

**Cost data confidentiality:** `GenerationMeta` (the per-generation cost breakdown object) is logged to the Vercel server console only. It is **never included in the API response body** — protecting margin data from exposure via browser DevTools Network tab.

---

## 6. Infrastructure Runway — Fixed Costs

### The Lean Stack

Seek Wander's fixed infrastructure cost is effectively zero at pre-revenue scale. Every service in the stack has a generous free or hobby tier that covers the operational requirements of a pre-Series A product.

| Service | Role | Tier | Monthly Fixed Cost |
|---------|------|------|--------------------|
| **Vercel** | Hosting, serverless functions, cron jobs, edge CDN | Hobby (free) | $0 |
| **Supabase** | PostgreSQL database (Trip, PlaceCache, CostLog, UserBalance) | Free tier (500MB, 2 CPU) | $0 |
| **Clerk** | Authentication, user management, webhooks | Free tier (10,000 MAU) | $0 |
| **Upstash Redis** | Serverless rate limiting (sliding window) | Free tier (10,000 commands/day) | $0 |
| **n8n Cloud** | Social automation, onboarding email workflows | Free tier (5 active workflows) | $0 |
| **Resend / Postmark** | Transactional email (Founder's Welcome) | Free tier (100 emails/day) | $0 |
| **Total Fixed** | | | **$0/month** |

### Upgrade Thresholds

| Service | Free Tier Limit | Upgrade Trigger | Upgrade Cost |
|---------|----------------|-----------------|--------------|
| Vercel | 100GB bandwidth, 6,000 function minutes/month | >10,000 MAU | $20/month (Pro) |
| Supabase | 500MB database, 2GB bandwidth | >50,000 CostLog rows | $25/month (Pro) |
| Clerk | 10,000 MAU | >10,000 registered users | $25/month (Pro) |
| Upstash Redis | 10,000 commands/day | >500 daily generations | $10/month (Pay-as-you-go) |

**Key observation:** The platform can serve approximately **5,000–10,000 monthly active users** before a single dollar of fixed infrastructure cost is incurred. By that point, affiliate commissions from even a 5% conversion rate at $80 average commission would yield **$20,000–$40,000/month** in revenue — making the $80/month infrastructure bill economically irrelevant.

### The Only True Variable Cost

**Anthropic API usage is the sole variable cost at scale.** At $0.0525 per generation (Claude tokens, constant regardless of cache), and assuming 2.5 average generations per monthly active user:

| MAU | Monthly Generations | Anthropic Cost | As % of Revenue (5% conv, $80 ARPU) |
|-----|--------------------|-----------------|------------------------------------|
| 1,000 | 2,500 | $131.25 | 2.1% |
| 5,000 | 12,500 | $656.25 | 0.8% |
| 10,000 | 25,000 | $1,312.50 | 0.5% |
| 50,000 | 125,000 | $6,562.50 | 0.3% |

**The LLM cost as a percentage of revenue decreases as MAU scales** — this is the defining financial characteristic of a software product with a near-zero variable cost structure and a high-value conversion event. At 50,000 MAU, Anthropic represents less than one-third of one percent of gross revenue.

### Gross Margin Summary

```
Revenue (50,000 MAU, 5% conversion, $80 avg commission):  $200,000/month
  Less: Anthropic API costs                               -$6,563/month
  Less: Google Places API (blended 20% miss rate)         -$3,100/month
  Less: Fixed infrastructure (upgraded tiers)             -$80/month
  ──────────────────────────────────────────────────────────────────────
  Gross Profit:                                           $190,257/month
  Gross Margin:                                           95.1%
```

> **95%+ gross margins at scale.** The product is a software intermediary between user intent and high-value travel transactions. The marginal cost of serving each additional user is a fraction of a cent. This is the defining financial profile of a category-leading affiliate commerce business.

---

*This document reflects the financial architecture and unit economics of Seek Wander as of March 2026. Projections are illustrative and based on the assumptions stated herein. Actual results will vary based on user acquisition, conversion rates, and affiliate programme terms.*
