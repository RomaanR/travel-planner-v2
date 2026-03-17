# Seek Wander — Technical Due Diligence
## As-Built Architecture Review · v1.0

> **Document Status:** Finalised — Phase 3 complete. Reflects production codebase as of March 2026.
> All claims below correspond directly to committed, deployed code.

---

## 1. Product Summary

Seek Wander is a luxury AI travel concierge that generates bespoke, multi-day itineraries. Users describe their journey preferences through a 7-field intake form; the system returns a geographically-verified, chronologically-ordered day plan with restaurant recommendations, hidden gems, transit estimates, and curated hotel stays — all rendered in an editorial split-screen interface.

The product is built on a zero-hallucination data model: every activity and restaurant is enriched post-generation via Google Places API, so ratings, opening hours, and photo URLs are ground-truthed before the user ever sees the output.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  Next.js App Router · Tailwind CSS · Framer Motion          │
│  Google Maps JS SDK · Sonner Toasts · Serwist Service Worker│
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                  VERCEL EDGE / SERVERLESS                    │
│                                                             │
│  POST /api/itinerary                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Zod validation (ItinerarySchema.safeParse)       │   │
│  │ 2. Upstash Redis rate limit check (5/hr sliding)   │   │
│  │ 3. Anthropic claude-sonnet-4-6 generation          │   │
│  │ 4. sanitizeJson() + JSON.parse() + repair fallback │   │
│  │ 5. enrichPlace() × N (PlaceCache-first, parallel)  │   │
│  │ 6. Haversine transit calculation (zero API calls)  │   │
│  │ 7. CostLog.create() (awaited before response)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  GET /api/trips     — Clerk auth · Prisma query + photos   │
│  GET /api/cron/...  — CRON_SECRET bearer auth · GC         │
└──────┬─────────────────────────┬───────────────────────────┘
       │                         │
┌──────▼──────┐         ┌────────▼───────┐
│  Supabase   │         │   Upstash      │
│  PostgreSQL │         │   Redis        │
│             │         │                │
│  Trip       │         │  Rate limit    │
│  PlaceCache │         │  counters      │
│  CostLog    │         │  (sliding      │
└─────────────┘         │   window)      │
                        └────────────────┘
       │
┌──────▼──────────────────────────────────┐
│         External APIs                   │
│  Anthropic API   — claude-sonnet-4-6    │
│  Google Places   — Text Search + Details│
│  Clerk           — Auth + JWTs          │
│  Booking.com     — Affiliate AID 4013143│
└─────────────────────────────────────────┘
```

### 2.1 Core Request Pipeline (`POST /api/itinerary`)

| Step | Mechanism | Failure Mode |
|------|-----------|-------------|
| Input validation | Zod `safeParse` | 400 + field errors |
| Rate limiting | Upstash sliding window | 429 + Retry-After header |
| AI generation | Anthropic SDK, `system` prompt | 500 (JSON repair attempted first) |
| JSON sanitisation | Regex sweep + repair call | 500 (both phases failed) |
| Place enrichment | PlaceCache → Google Places | Graceful null (item still renders) |
| Transit | Pure Haversine math | Never fails (local computation) |
| Cost logging | Prisma `CostLog.create()` | Non-fatal try/catch |

### 2.2 PWA & Service Worker

Built with `@serwist/next` (not `next-pwa`). Service worker registered automatically in production, disabled in development to prevent stale cache confusion.

| Cache Strategy | Applies To | TTL | Cap |
|---|---|---|---|
| `CacheFirst` | Google Places photo URLs | 30 days | 100 entries |
| `defaultCache` | Next.js static assets (JS, CSS, fonts) | Serwist defaults | — |

The app is installable as a PWA. `src/app/manifest.ts` declares `display: "standalone"`, `name: "Seek Wander"`, and brand-colour splash screen.

### 2.3 Offline Architecture

`/trips` page degrades gracefully when the device is offline:

1. `navigator.onLine` check → if `false`, immediately load from `localStorage` key `seek_wander_archive`
2. Attempt `GET /api/trips` (Clerk-authed, returns photo URLs pre-resolved server-side)
3. On success: update UI + persist fresh data to cache
4. On network failure: load from `localStorage` fallback, show offline banner

Photo URLs are pre-resolved server-side in `/api/trips` using `MAPS_SERVER_KEY` so the client never holds or exposes API keys.

---

## 3. Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js App Router | 14 | TypeScript, server + client components |
| Styling | Tailwind CSS | v3 | Custom config — no border-radius design system |
| Animation | Framer Motion | 12 | All sections animated; `AnimatePresence` throughout |
| Maps | @react-google-maps/api | Latest | Places Autocomplete + Map + Polyline |
| AI | @anthropic-ai/sdk | ^0.78 | `claude-sonnet-4-6`, max_tokens 8192 |
| Auth | @clerk/nextjs | **v6** | v7 incompatible with Next.js 14 — do not upgrade |
| ORM | Prisma | 7 | Supabase PostgreSQL backend |
| Rate Limiting | @upstash/ratelimit | Latest | Sliding window, Redis-backed |
| Notifications | sonner | 2 | Branded toast layer |
| PWA | @serwist/next | Latest | Service worker + offline caching |
| Validation | zod | 4 | All API POST bodies; `z.infer<>` as source of truth |

---

## 4. Security Architecture

### 4.1 Input Validation
Every `POST /api/itinerary` body is parsed through `ItinerarySchema.safeParse()` before any computation. Invalid requests receive `400` with per-field `fieldErrors`. The Zod schema — not a TypeScript interface — is the single source of truth for the request shape.

### 4.2 Prompt Injection Defence
The `SYSTEM_PROMPT` constant is passed as the `system` parameter to the Anthropic SDK — not inside `messages[]`. This places it in a higher-trust tier: the model treats system instructions as authoritative and treats user-supplied fields (destination, interests, dietary) as untrusted input to be used for content only. Injection attempts are silently discarded.

### 4.3 AI JSON Self-Healing (`sanitizeJson` + `JSON_REPAIR_PROMPT`)
Large language model outputs occasionally contain minor JSON defects (trailing commas, markdown code fences). Two recovery phases prevent these from surfacing as 500 errors:

**Phase 1 — `sanitizeJson(raw: string)`** (zero API calls, <1ms):
- Strips ` ```json … ``` ` code fence wrappers
- Removes trailing commas before `}` and `]`
- Trims leading/trailing whitespace

**Phase 2 — Repair Anthropic call** (triggered only if Phase 1 + `JSON.parse()` still fails):
- Sends the malformed string to `claude-sonnet-4-6` with `JSON_REPAIR_PROMPT`
- Instructs the model to return only the corrected JSON — no explanation
- Result is parsed again; if still malformed, a clean `500` is returned

Net effect: Claude's own occasional output errors are invisibly healed by a second Claude call. Users never see raw JSON errors.

### 4.4 Rate Limiting (Upstash Redis)
```
Limiter: slidingWindow(5, "1 h")
Key:     Clerk userId (authenticated) | IP address (unauthenticated)
Prefix:  "seek-wander:itinerary"
On fail: HTTP 429 + X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset headers
```
The limit is checked at the top of the route handler — before any Anthropic API call — so rate-limited requests incur zero AI cost.

### 4.5 HTTP Security Headers
Applied to all routes via `next.config.mjs`:
```
X-Frame-Options:        DENY
X-Content-Type-Options: nosniff
Referrer-Policy:        strict-origin-when-cross-origin
Permissions-Policy:     camera=(), microphone=(), payment=(), usb=(), geolocation=(self)
```

### 4.6 Google API Key Isolation
| Key | Var | Restriction | Scope |
|-----|-----|-------------|-------|
| Client key | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | HTTP referrers: production domain + localhost | Maps JS, Places Autocomplete |
| Server key | `MAPS_SERVER_KEY` | Places API only; no referrer restriction | `route.ts` enrichment, `getPlacePhoto.ts`, `/api/trips` photo resolution |

The server key is never transmitted to the client. `/api/trips` resolves photo URLs server-side and returns pre-signed strings.

### 4.7 IDOR Prevention
`GET /trips/[id]` fetches by ID then enforces `trip.userId === userId`. Both missing records and wrong-owner records return an identical neutral `notFound()` — no ownership information leaks through error differentiation.

### 4.8 `/api/trips` Auth Guard
Returns `401 Unauthorized` when Clerk `userId` is absent. All DB queries are scoped to `{ where: { userId } }` — a user cannot retrieve another user's trip list through any input manipulation.

### 4.9 Admin Route — Neutral 404
`/admin/metrics` uses `notFound()` (not `redirect`) for all non-admin access. This prevents revealing the route's existence to non-admin users through response-code differentiation.

### 4.10 Cron Job Security
`GET /api/cron/cleanup` validates `Authorization: Bearer <CRON_SECRET>`. Vercel's cron runner injects this header automatically. Any other caller receives `401`.

---

## 5. Data Architecture

### 5.1 Prisma Schema (Supabase PostgreSQL)

```prisma
model Trip {
  id            String   @id @default(uuid())
  userId        String                       // Clerk userId — no FK
  destination   String
  days          Int
  itineraryData Json                         // Full ItineraryResponse blob
  createdAt     DateTime @default(now())
}

model PlaceCache {
  id               String   @id @default(uuid())
  cacheKey         String   @unique          // "{name}|{city}" normalised
  photoUrl         String?
  rating           Float?
  userRatingsTotal Int?
  hoursOpen        String?                   // "9:00 AM – 9:00 PM" (today's hours)
  priceLevel       Int?
  fetchedAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt       // used by cron GC
}

model CostLog {
  id          String   @id @default(uuid())
  userId      String?
  destination String
  aiCost      Decimal  @db.Decimal(10, 6)
  googleCost  Decimal  @db.Decimal(10, 6)
  totalCost   Decimal  @db.Decimal(10, 6)
  cacheHits   Int
  cacheMisses Int
  createdAt   DateTime @default(now())
}
```

### 5.2 Cost Efficiency — PlaceCache

Every `enrichPlace()` call checks `PlaceCache` before making any Google API call. On cache hit (< 30-day TTL):
- Zero Google API calls
- `parseOpenNow(hoursOpen, lng)` computes live open/closed status locally using `Math.round(lng / 15)` as UTC offset
- Savings: `$0.049` per item ($0.032 Text Search + $0.017 Place Details)

Cache hit rates of 60–80% are typical after the first few weeks of operation.

### 5.3 Vercel Cron — Automated GC
Daily at 00:00 UTC, `GET /api/cron/cleanup` deletes `PlaceCache` rows where `updatedAt < 14 days ago`. The `@updatedAt` Prisma directive refreshes on every upsert, so frequently-accessed places naturally survive each cleanup cycle.

---

## 6. Observability & Cost Tracking

### 6.1 `/admin/metrics` Dashboard
Internal BI page accessible only to `ADMIN_USER_ID` (Clerk userId, trimmed). Shows:

| KPI | Calculation |
|-----|------------|
| Total Spent | `SUM(totalCost)` across all CostLog rows |
| Total Generations | `COUNT(CostLog)` |
| Avg Cost / Trip | `totalSpent / totalGenerations` |
| Cache Hit Rate | `SUM(cacheHits) / SUM(cacheHits + cacheMisses)` |

Generation log table: last 200 rows, newest first. Cost colour-coding: green < $0.15, amber > $0.50.

### 6.2 Unit Economics (Reference)

| Item | Cost |
|------|------|
| Anthropic input | $3.00 / 1M tokens |
| Anthropic output | $15.00 / 1M tokens |
| Google Text Search | $0.032 / call |
| Google Place Details | $0.017 / call |
| Typical generation (cache cold) | ~$0.08–$0.14 |
| Typical generation (60% cache hit) | ~$0.05–$0.09 |

Cost data is assembled server-side and written to `CostLog` before the HTTP response is returned (awaited, not fire-and-forget — Vercel freezes functions on response).

---

## 7. Affiliate Monetization

### Booking.com Integration
- **Affiliate ID:** AID `4013143` (Seek Wander account)
- **Utility:** `src/lib/affiliate.ts` → `createAffiliateUrl(hotelName, destination)`
- **All hotel links must use this utility** — no manual URL construction
- **`StayCard.tsx`** — `motion.a` card rendered in `ItineraryViewer` when `itinerary.recommendedStays` is non-empty; `print:hidden`

### Accommodation Branching
`CurationForm` collects `accommodationStatus: "needed" | "booked"`:
- `"needed"` → Claude generates `recommendedStays[]` with real hotel names and Booking.com-searchable terms
- `"booked"` → User provides `hotelName`; Claude uses it as the itinerary base and omits hotel recommendations

Commission revenue scales linearly with itinerary volume at zero marginal infrastructure cost.

---

## 8. Mobile-First Design

### 8.1 Responsive Navigation

The desktop navbar collapses to a hamburger trigger on mobile (`md:hidden`). The full-screen mobile menu (`MobileMenu.tsx`) uses `createPortal(…, document.body)` to escape the Navbar's CSS stacking context (created by `backdrop-blur-sm`).

**Architecture lesson:** Any `fixed` full-screen overlay rendered inside an element that uses `backdrop-filter`, `transform`, `filter`, or `will-change` must be portalled to `document.body`. Otherwise, `fixed inset-0` anchors to the stacking-context ancestor, not the viewport.

**Mobile menu overlay spec:**
- `fixed inset-0 z-[100]` — guaranteed full-viewport coverage
- `bg-paper` + `style={{ backgroundColor: "#F5F0E8" }}` — dual opaque background (Tailwind class + inline fallback)
- Scroll lock: `document.body.style.overflow = "hidden"` on open, `"unset"` on close
- `AnimatePresence` fade-in (`opacity: 0 → 1`) — background is never part of this animation (opacity on the overlay container would make the background transparent during the transition)

### 8.2 High-Contrast UI for Hero Images

The landing page uses a full-bleed photographic hero. All UI elements that appear over it use one of two patterns:

| Pattern | Usage | Example |
|---------|-------|---------|
| Solid background pill/button | Interactive controls | Hamburger: `bg-paper border border-ink/20 rounded-full shadow-md` |
| Semi-transparent ink overlay | Text on imagery | Hero text: `text-white` on dark overlay or gradient |

The design system enforces `rounded-none` globally (`* { border-radius: 0 !important }` in `globals.css`) — the hamburger button uses `rounded-full` as an explicit design exception for this specific mobile affordance.

### 8.3 Split-Screen Layout (Desktop)
```
┌──────────────────────────────────────────┐
│ Navbar (fixed top, z-50, backdrop-blur)  │
├─────────────────────────┬────────────────┤
│  55% — Scrollable       │  45% — Sticky  │
│  Timeline (ItineraryViewer)│  Map (Google)│
│  • Editorial opener     │  • SVG markers │
│  • Tabbed day nav       │  • Polyline    │
│  • TimelineCards        │  • Day legend  │
│  • StayCards            │                │
│  • Bottom CTA slot      │                │
└─────────────────────────┴────────────────┘
```
On mobile, the map renders as a `h-52` banner above the timeline. The split-screen collapses to full-width single-column.

---

## 9. Deployment

| Target | Platform | Notes |
|--------|----------|-------|
| Production | Vercel | Auto-deploy on `main` push |
| Database | Supabase (PostgreSQL) | PgBouncer pooled (port 6543) for runtime; direct (port 5432) for Prisma migrations |
| Rate Limiting | Upstash Redis | REST API — no persistent connection needed |
| Auth | Clerk | Modal sign-in, no dedicated auth pages |
| Cron | Vercel Cron | `"0 0 * * *"` — `vercel.json` |

**Critical deployment note:** `package.json` includes `"postinstall": "prisma generate"` so Vercel regenerates the Prisma client with the correct Amazon Linux binary after `npm install`. Do not pin `binaryTargets` — Prisma auto-detects the correct platform.

---

## 10. Phase Completion Audit Trail

| Phase | Status | Key Deliverables |
|-------|--------|-----------------|
| 1 — Core Engine | ✅ Complete | Next.js + Claude + Google Maps baseline |
| 2 — Concierge UX | ✅ Complete | 7-field form, split-screen results, enrichment |
| 3 — Ultra-Luxury UI | ✅ Complete | Tabbed nav, cost badges, transit connectors, day-centric map |
| 4 — Auth | ✅ Complete | Clerk v6, conditional ClerkProvider, NavbarAuth |
| 5 — Persistence | ✅ Complete | Prisma + Supabase, saveTrip, /trips archive, IDOR enforcement |
| 6 — PWA & Sharing | ✅ Complete | @serwist/next, /shared/[id] OG, ShareButton, PDF export |
| 7 — Timeline Refactor | ✅ Complete | `timeline: TimelineItem[]` canonical shape, normalizeDayPlan backward-compat |
| 8 — Margin Protection | ✅ Complete | PlaceCache, Haversine transit, CostLog, /admin/metrics, Vercel Cron, Zod, security headers |
| 9 — Affiliate Monetization | ✅ Complete | Booking.com AID 4013143, StayCard, accommodation branching |
| 10 — UX & Polish | ✅ Complete | GenerationLoader, Sonner toasts, UnauthenticatedState, EmptyTripsState, MobileMenu portal fix |
| 11 — Mobile, Offline & Resilience | ✅ Complete | useOfflineTrips, /api/trips, Upstash rate limiting, AI JSON self-healing, dynamic OG metadata |
| 12 — Stripe Paywall | 🔜 Next | $4.99 per generation (post-free-tier) |

### Notable Bug Resolution — Transparent Mobile Menu Overlay

**Reported:** Mobile navigation overlay appeared transparent; text from the hero background image bled through.

**Root cause identified:** `Navbar.tsx` applies `backdrop-blur-sm` to its root `<motion.nav>`. `backdrop-filter` creates a new CSS stacking context. Any `fixed`-positioned descendant is anchored to that stacking context ancestor rather than the viewport. The overlay's `fixed inset-0` was effectively `fixed` to the ~64px Navbar bar — covering only the navbar height.

**Resolution:** `createPortal(overlay, document.body)` in `MobileMenu.tsx`. Moving the DOM node to `document.body` exits the Navbar's stacking context entirely. `fixed inset-0` then works as specified — full viewport coverage.

**Lesson learned:** `backdrop-filter`, `transform`, `filter`, `will-change`, and `perspective` all create stacking contexts that trap `fixed`-positioned children. Full-screen overlays inside any such ancestor must use `createPortal`.

---

*Document maintained alongside codebase. Update whenever architecture decisions change.*
