# Seek Wander — Technical Due Diligence
### Architecture & Engineering Review
**Classification:** Confidential — ZenithAI Data Room
**Document Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Executive Tech Stack Overview](#1-executive-tech-stack-overview)
2. [System Architecture Flow](#2-system-architecture-flow)
3. [Database Schema & ERD](#3-database-schema--erd)
4. [Core Data Flow: The Itinerary Lifecycle](#4-core-data-flow-the-itinerary-lifecycle)
5. [Security & Margin Protection Posture](#5-security--margin-protection-posture)
6. [Environment Variable Manifest](#6-environment-variable-manifest)

---

## 1. Executive Tech Stack Overview

Seek Wander is a full-stack, serverless luxury travel curation platform. The engineering philosophy prioritises **zero-infrastructure operational burden**, **defence-in-depth security**, and **aggressive API cost containment** — all deployed to a globally distributed edge network from a single monorepo.

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend & API** | Next.js 14 (App Router, TypeScript) | Full-stack monorepo; React Server Components eliminate redundant data fetches; file-based routing for API routes co-located with UI |
| **Hosting & Serverless** | Vercel (Serverless Functions + Edge Network + Cron) | Zero-ops deployment; automatic preview environments; native cron scheduling; global CDN with <100ms TTFB |
| **Database** | Supabase (PostgreSQL, managed) | Fully managed Postgres; row-level security available; PgBouncer connection pooling included; generous free tier for pre-revenue stage |
| **ORM** | Prisma 7 | Type-safe query builder; schema-as-code via `schema.prisma`; auto-generates TypeScript types; migration tooling |
| **Authentication** | Clerk v6 | Drop-in auth with modal flows; no custom session management; JWT-based; supports social OAuth and magic links |
| **AI Engine** | Anthropic Claude (`claude-sonnet-4-6`) | State-of-the-art instruction-following for structured JSON generation; 8,192 output token budget; hardened via system prompt |
| **Maps & Enrichment** | Google Maps JavaScript API + Places API | Industry-standard geocoding and venue data; photo CDN; rating and opening hours enrichment |
| **Input Validation** | Zod | Runtime schema validation on all API POST bodies; TypeScript type inference from schema; no trust boundary violations |
| **Styling** | Tailwind CSS v3 + Framer Motion 12 | Utility-first with custom design tokens; GPU-accelerated animations; no CSS-in-JS runtime overhead |
| **PWA** | Serwist (@serwist/next) | Service worker for offline support and photo caching; installable on iOS and Android |

> **Operational model:** The application requires zero dedicated infrastructure beyond a Supabase project and a Vercel deployment. There are no persistent servers, no container orchestration, and no managed queues. The entire backend surface is serverless functions invoked on demand.

---

## 2. System Architecture Flow

The following diagram illustrates the macro request flow for a trip generation — the application's primary and most complex user journey.

```mermaid
graph TD
    A([User — Browser / PWA]) -->|HTTPS Request| B[Next.js Client\nApp Router + React]

    B -->|Sign In Modal| C[Clerk v6\nAuthentication]
    C -->|JWT Session Cookie| B

    B -->|POST /api/itinerary\nJSON body| D[Next.js API Route\nServerless Function]

    D -->|safeParse request body| E{Zod Schema\nValidation}
    E -->|400 Bad Request\n+ fieldErrors| A
    E -->|Valid — proceed| F[PlaceCache Lookup\nPrisma → Supabase]

    F -->|Cache HIT\nZero API cost| G[parseOpenNow\nLocal Math]
    F -->|Cache MISS| H[Google Places API\nText Search + Details\nMAPS_SERVER_KEY]
    H -->|Upsert result| F
    H --> G

    G -->|Enriched place data| I[Anthropic API\nclaude-sonnet-4-6\nSystem Prompt Guard]
    I -->|Pure JSON — timeline schema| J[Haversine Transit\nLocal Calculation\nZero API calls]

    J -->|Complete itinerary| K[CostLog Write\nPrisma → Supabase\nAwaited before response]
    K -->|ItineraryResponse JSON| B

    B -->|Render split-screen| L[ItineraryViewer\n+ ItineraryMap]
    L -->|Save Trip action| M[saveTrip Server Action\nAuth-gated\nPrisma → Supabase]

    subgraph Supabase PostgreSQL
        F
        K
        M
    end

    subgraph Automated Maintenance
        N[Vercel Cron\n0 0 * * *] -->|DELETE PlaceCache\nupdatedAt > 14 days| F
    end
```

---

## 3. Database Schema & ERD

The database consists of four tables. Three are active in production (`Trip`, `PlaceCache`, `CostLog`). `UserBalance` is the planned schema for the Phase 9 Stripe paywall — defined here for completeness in due diligence review.

```mermaid
erDiagram
    TRIP {
        uuid id PK
        string userId "Clerk userId — no FK"
        string destination
        int days
        json itineraryData "Full ItineraryResponse blob"
        datetime createdAt
    }

    PLACECACHE {
        uuid id PK
        string cacheKey UK "name|city — normalized"
        string photoUrl "nullable"
        float rating "nullable"
        int userRatingsTotal "nullable"
        string hoursOpen "nullable — e.g. 9:00 AM - 9:00 PM"
        int priceLevel "nullable — 1 to 4"
        datetime fetchedAt
        datetime updatedAt "auto — Prisma @updatedAt"
    }

    COSTLOG {
        uuid id PK
        string userId "nullable — Clerk userId"
        string destination
        decimal aiCost "Decimal 10,6 — Anthropic USD"
        decimal googleCost "Decimal 10,6 — Google USD"
        decimal totalCost "Decimal 10,6 — aiCost + googleCost"
        int cacheHits "PlaceCache hits this generation"
        int cacheMisses "Fresh Google API calls"
        datetime createdAt
    }

    USERBALANCE {
        uuid id PK
        string userId UK "Clerk userId — 1:1"
        int freeGenerationsUsed "0 or 1 — free tier cap"
        int paidCredits "purchased via Stripe"
        string stripeCustomerId "nullable"
        datetime createdAt
        datetime updatedAt
    }

    TRIP ||--o{ COSTLOG : "destination tracked"
    USERBALANCE ||--o{ TRIP : "userId owns"
    USERBALANCE ||--o{ COSTLOG : "userId linked"
```

> **Schema notes:**
> - `TRIP.userId` and `COSTLOG.userId` reference Clerk user IDs directly — no FK constraint is intentional (Clerk manages user lifecycle independently of Postgres).
> - `PLACECACHE` is **shared across all users** — a single cache entry for "Nobu Malibu|Malibu" benefits every generation that includes that venue.
> - `PLACECACHE.updatedAt` is auto-managed by Prisma's `@updatedAt` directive and is the TTL signal used by the Vercel Cron cleanup job.
> - `USERBALANCE` is pre-designed — not yet live. Will be created via `prisma db push` when Phase 9 begins.

---

## 4. Core Data Flow: The Itinerary Lifecycle

Every trip generation traverses a deterministic five-stage pipeline. Each stage is designed to fail gracefully without breaking the user experience.

---

### Stage 1 — Input Validation (Zod)

**File:** `src/app/api/itinerary/route.ts`

The raw POST body is parsed through a strict Zod schema *before* any external API call or database interaction. This is the first and most cost-effective defence layer.

```
POST /api/itinerary
  └─ raw body received
       └─ ItinerarySchema.safeParse(raw)
            ├─ FAIL → 400 { fieldErrors: { destination: [...], ... } }
            └─ OK   → typed ItineraryRequest — proceed to Stage 2
```

**Schema constraints enforced:**
| Field | Constraint |
|-------|-----------|
| `destination` | `string`, min 1, max 100 chars |
| `placeId` | `string`, min 1, max 300 chars |
| `lat` / `lng` | `number`, must be finite |
| `departureDate` / `returnDate` | ISO `YYYY-MM-DD` regex |
| `duration` | integer, 1–5 inclusive |
| `travelParty` | enum: `solo \| couple \| family \| group` |
| `pace` | enum: `relaxed \| moderate \| packed` |
| `budgetTier` | enum: `premium \| luxury \| ultra-luxury` |
| `dietary` | array, max 7 items |
| `interests` | array, max 10 items |

`safeParse` is used throughout — never `parse` — ensuring all validation errors are handled explicitly rather than thrown.

---

### Stage 2 — Database Cache Check (PlaceCache)

**File:** `src/app/api/itinerary/route.ts` → `enrichPlace()`

Before calling Google's paid APIs, every `TimelineItem` in the AI-generated itinerary is checked against the `PlaceCache` table.

```
enrichPlace(item, destinationCity, destinationLng)
  └─ prisma.placeCache.findUnique({ where: { cacheKey } })
       ├─ HIT  → return cached { photoUrl, rating, hoursOpen, priceLevel }
       │          + parseOpenNow(hoursOpen, lng)  ← local math, zero API cost
       │
       └─ MISS → Google Places Text Search  (MAPS_SERVER_KEY)
                  └─ Google Place Details   (skip for NATURE/ADVENTURE categories)
                       └─ prisma.placeCache.upsert()  ← fire-and-forget
```

**Cache key format:** `"{normalized-place-name}|{normalized-city}"` — e.g., `"nobu malibu|malibu"`.

**Cost impact:** A fully cached generation (repeat destination) incurs **zero Google Places API cost**, reducing per-generation cost from ~$0.83 to ~$0.06 (Claude tokens only).

---

### Stage 3 — AI Generation (Claude)

**File:** `src/app/api/itinerary/route.ts`

The enriched client profile is submitted to the Anthropic API using a two-part message structure:

| Parameter | Content |
|-----------|---------|
| `system` | `SYSTEM_PROMPT` — hardcoded role, output schema, injection defence instructions |
| `messages[0]` | `buildPrompt(request)` — curated client profile (destination, dates, party, pace, budget, dietary, interests) |
| `model` | `claude-sonnet-4-6` |
| `max_tokens` | `8192` |

The `system` parameter is processed at a **higher trust level** than `messages[]` by the model — this is the architectural basis for the prompt injection defence. User-supplied values in `messages[0]` are treated as untrusted data regardless of their content.

The model is instructed to return **pure JSON only** — no markdown fences, no preamble, no apologies. The response is parsed directly with `JSON.parse()`.

---

### Stage 4 — Local Math (Haversine + `parseOpenNow`)

**File:** `src/lib/itineraryUtils.ts`

Two computations run entirely in-process with zero external API calls:

**Transit distances (Haversine formula):**
```
For each consecutive pair of coordinates in timeline[]:
  km = haversine(coord_a, coord_b)
  walkingMinutes  = max(1, round((km / 5)  × 60))   // 5 km/h
  drivingMinutes  = max(1, round((km / 25) × 60))   // 25 km/h city average
```
The Google Distance Matrix API has been **permanently removed**. This eliminates 8–16 API calls per generation at $0.005/element — saving ~$0.04–$0.08 per trip with no meaningful accuracy loss for a planning application.

**Open/closed status (`parseOpenNow`):**
```
parseOpenNow(hoursOpen: string, lng: number): boolean | undefined
  └─ UTC offset estimate = Math.round(lng / 15) hours
  └─ Parses "9:00 AM – 9:00 PM" against estimated local time
  └─ Handles: "Open 24 hours" → true | "Closed" → false | overnight spans
```
This eliminates real-time Google Places API calls for opening hours on all cache hits. Accuracy is ±30 minutes — sufficient for a trip planning context.

---

### Stage 5 — Financial Ledger (CostLog)

**File:** `src/app/api/itinerary/route.ts`

After generation is complete, a `CostLog` row is written **synchronously** (awaited) before the HTTP response is returned.

```ts
// Pricing constants
CLAUDE_INPUT_COST  = $3.00  / 1,000,000 tokens
CLAUDE_OUTPUT_COST = $15.00 / 1,000,000 tokens
GOOGLE_TEXT_SEARCH = $0.032 / call
GOOGLE_DETAILS     = $0.017 / call

// CostLog is awaited — not fire-and-forget
await prisma.costLog.create({ data: { userId, destination, aiCost, googleCost, totalCost, cacheHits, cacheMisses } })
// Then: return Response.json(itinerary)
```

> **Why awaited?** Vercel serverless functions are frozen the instant an HTTP response is returned. Any background (fire-and-forget) promise is killed mid-flight. Awaiting the write before returning guarantees **100% financial data integrity** at the cost of ~50ms — negligible against a 10–15 second generation time.

`GenerationMeta` cost breakdown is logged to the **server console only** — it is never included in the API response body, protecting margin data from exposure via browser DevTools.

---

## 5. Security & Margin Protection Posture

Seek Wander operates a layered "Fortress" security model. Each layer addresses a distinct attack surface.

---

### Layer 1 — Input Validation (Zod)

Every POST to `/api/itinerary` is validated through a strict Zod schema before any downstream system is touched. Malformed, oversized, or structurally invalid requests are rejected at the API boundary with a `400` response and per-field error messages. This prevents:
- Oversized payloads reaching the Anthropic API (token cost attack)
- Invalid enum values reaching the database
- Type confusion vulnerabilities in downstream logic

---

### Layer 2 — Prompt Injection Defence (Anthropic System Prompt)

The `SYSTEM_PROMPT` constant is passed as the `system` parameter to `client.messages.create()` — structurally separate from user-controlled content in `messages[]`.

The system prompt explicitly instructs the model to:
- Treat its role, output format, and JSON schema as **immutable** — not overridable by user message content
- **Silently ignore** any instructions embedded in `destination`, `interests`, or `dietary` fields
- Always produce a standard luxury itinerary for the stated destination regardless of injection payload content
- Never output markdown, explanations, or acknowledgements — pure JSON only

This defence is architectural (system vs. user message separation) rather than purely prompt-based, making it robust against jailbreak attempts that work only against single-turn system prompts.

---

### Layer 3 — Automated Cache Garbage Collection (Vercel Cron)

**Route:** `GET /api/cron/cleanup`
**Schedule:** `0 0 * * *` — daily at 00:00 UTC
**Configured in:** `vercel.json`

```ts
// Deletes all PlaceCache rows not accessed in 14 days
prisma.placeCache.deleteMany({
  where: { updatedAt: { lt: fourteenDaysAgo } }
})
```

**Security:** Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` on every scheduled invocation. The route validates this header and returns `401 Unauthorized` for any external caller — preventing arbitrary cache deletion.

**Why this matters for margins:** Stale cache entries for one-time destinations consume Supabase row count and storage. Without cleanup, the `PlaceCache` table would grow unbounded, degrading query performance and inflating database tier costs.

---

### Layer 4 — Google API Key Split

Two separate Google Cloud API keys are in use:

| Key | Environment Variable | Restrictions | Used In |
|-----|---------------------|-------------|---------|
| **Client key** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | HTTP referrers: Vercel production domain + `localhost:3000` | Maps JavaScript SDK, Places Autocomplete (browser) |
| **Server key** | `MAPS_SERVER_KEY` | API restriction: Places API only; no referrer restriction | Server-side enrichment in `route.ts`, photo URL resolution in `getPlacePhoto.ts` |

The client key is **referrer-restricted** — it will be rejected by Google if used from any domain other than the allowlist. This prevents billing theft via key extraction from the browser bundle. The server key is never transmitted to the client.

---

### Layer 5 — HTTP Security Headers

Applied globally to all routes via `next.config.mjs` `headers()`:

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking via `<iframe>` embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer data leakage on cross-origin navigation |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), usb=(), geolocation=(self)` | Restricts browser API access to declared minimum |

> `Content-Security-Policy` is intentionally omitted — the Google Maps JavaScript SDK and Clerk's embedded auth UI both require inline script execution and dynamic script sources that would require an excessively permissive CSP, negating its security value. `Strict-Transport-Security` is omitted as Vercel enforces HTTPS at the edge layer.

---

### Layer 6 — IDOR Prevention & Admin Route Neutrality

**Ownership enforcement** on all user-scoped data:
```ts
const trip = await prisma.trip.findUnique({ where: { id: params.id } });
if (!trip || trip.userId !== userId) notFound();
```
Both "not found" and "wrong owner" cases return an identical `notFound()` response — preventing enumeration of trip IDs owned by other users.

**Admin dashboard** (`/admin/metrics`) returns `notFound()` (not `redirect`) for all unauthorised access — the route's existence is not leaked to non-admin visitors.

---

## 6. Environment Variable Manifest

All variables must be set in Vercel → Project → Settings → Environment Variables for production. Local development uses `.env.local` (git-ignored).

### AI

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Production + Local | Anthropic Console API key. Authorises `claude-sonnet-4-6` generation requests. |

### Google Maps

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ Production + Local | **Client-side key.** Exposed in browser bundle. Must be restricted by HTTP referrer in Google Cloud Console to production domain + `localhost`. Enables Maps JS SDK and Places Autocomplete. |
| `MAPS_SERVER_KEY` | ✅ Production + Local | **Server-side key.** Never sent to client. No HTTP referrer restriction (server-side fetches have no referrer header). Restricted to Places API only in Google Cloud. Used for venue enrichment and `/trips` dashboard photos. |

### Authentication (Clerk)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Production + Local | Clerk publishable key. Enables `<ClerkProvider>`. If absent, ClerkProvider is skipped and the app renders without auth (graceful degradation). |
| `CLERK_SECRET_KEY` | ✅ Production + Local | Clerk secret key. Used server-side by `auth()` and `clerkMiddleware()` to validate sessions. |

### Database (Supabase / PostgreSQL)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Production + Local | Supabase connection string via **PgBouncer** (port 6543). Used for all runtime Prisma queries. Connection pooling prevents exhaustion under concurrent serverless invocations. |
| `DIRECT_URL` | ✅ Local (migrations only) | Supabase **direct** connection string (port 5432). Required by Prisma CLI for `db push` and schema introspection. Not needed in Vercel production environment. |

### Admin & Operations

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_USER_ID` | ✅ Production + Local | Clerk `userId` of the business owner account. Controls access to `/admin/metrics`. Must be set without leading/trailing whitespace — code applies `.trim()` defensively. |
| `CRON_SECRET` | ✅ Production + Local | Shared secret for Vercel Cron authentication. Vercel injects this as `Authorization: Bearer <value>` on every scheduled invocation of `/api/cron/cleanup`. Generate with `openssl rand -hex 32`. Must contain no leading/trailing whitespace (Vercel build will fail). |

### Monetisation (Phase 9 — Stripe)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ⏳ Phase 9 | Stripe secret key for server-side Checkout session creation. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⏳ Phase 9 | Stripe publishable key for client-side Stripe.js initialisation. |
| `STRIPE_WEBHOOK_SECRET` | ⏳ Phase 9 | Webhook signing secret for validating `checkout.session.completed` events from Stripe. |

### Rate Limiting (Future)

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | ⏳ Future | Upstash Redis REST endpoint for serverless-compatible rate limiting (e.g., `@upstash/ratelimit`). |
| `UPSTASH_REDIS_REST_TOKEN` | ⏳ Future | Upstash Redis authentication token. |

---

*This document reflects the production architecture as of March 2026. It should be updated in conjunction with `CLAUDE.md` whenever architectural decisions change.*
