# CLAUDE.md — Seek Wander

> **Permanent project memory. Update this file whenever architecture decisions change.**

## Project Identity

**Seek Wander — Curated Luxury Journeys.**
Vogue meets National Geographic. Expensive, minimalist, editorial.
Every component must feel like it belongs in a high-end print magazine or luxury brand lookbook.
This is not a travel app — it is a digital concierge.

> **Brand note:** The word "AI" is intentionally absent from all user-facing copy, manifests, metadata, and UI text. The product is positioned around the luxury outcome ("Curated Luxury Journeys"), not the technology. Claude is the invisible engine — never the headline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 (custom config, NO rounded corners) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Maps | @react-google-maps/api (Places Autocomplete + GoogleMap + Marker + Polyline) |
| AI | @anthropic-ai/sdk — model: `claude-sonnet-4-6`, max_tokens: `8192` |
| Auth | **@clerk/nextjs v6** — **ACTIVE** (v6 is required; v7 breaks Next.js 14) |
| ORM | **Prisma 7 + Supabase (PostgreSQL)** — **ACTIVE** |
| Validation | **zod** — Zod schema on all API POST bodies |
| PWA | **@serwist/next + serwist** — service worker, offline caching, installable |
| Rate Limiting | **@upstash/redis + @upstash/ratelimit** — slidingWindow(5, "1 h") per userId |
| Notifications | **sonner** — branded toast layer (loading → success → error lifecycle) |
| Affiliate | **Booking.com** — AID 4013143, `createAffiliateUrl()` in `src/lib/affiliate.ts` |

> **Clerk version lock:** Always install `@clerk/nextjs@6`, never `@clerk/nextjs@7+`. Clerk v7 requires Next.js 15. The v6 API uses `<SignedIn>/<SignedOut>` — `<Show>` is v7-only and must NOT be used.

---

## Design System — "The Million-Dollar Aesthetic"

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#F5F0E8` | Primary backgrounds — warm off-white |
| `paper-dark` | `#EDE8DC` | Card backgrounds, subtle depth |
| `ink` | `#0A0A0A` | Primary text, borders |
| `ink-light` | `#6B6B6B` | Secondary text, captions, placeholders |
| `emerald-accent` | `#059669` | Links, active states, OPEN status |
| `burnt-orange` | `#C2410C` | Primary CTA buttons, active tab indicator, CLOSED status |
| white | `#FFFFFF` | Text on dark/image backgrounds |

### Typography

| Role | Font | Style |
|------|------|-------|
| Display headings | Cormorant Garamond (serif) | Massive, italic, tight leading |
| Body | DM Sans (sans-serif) | Regular weight, comfortable spacing |
| Navigation / micro-copy | DM Sans (sans-serif) | UPPERCASE, `tracking-widest`, bold |

### Component Rules (Non-Negotiable)

- **NO border-radius anywhere** — `rounded-none` on every component
- **Thin borders only** — `border border-black/5` or `border-b border-ink/20`
- **Framer Motion on all sections** — fade-in-up: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}` with `transition={{ duration: 0.6, ease: 'easeOut' }}`
- **Stagger children** — delay increments of `0.1s` per child
- **Tabbed day navigation** — `<AnimatePresence mode="wait">` with `initial={{ opacity: 0, y: 8 }}` / `exit={{ opacity: 0, y: -8 }}` / `transition={{ duration: 0.35 }}` keyed by `activeDay`
- **Active tab indicator** — `border-b-2 border-burnt-orange`; inactive tabs use `border-b-2 border-transparent`
- **Images** — grayscale by default, transition to full color on hover (`filter: grayscale(100%)` → `grayscale(0%)`, `transition-all duration-700`)
- **Spacing** — generous whitespace, editorial breathing room
- **HTML entities** — always use `&apos;`, `&quot;`, `&hellip;`, `&middot;` etc. in JSX, never raw special characters
- **Optional chaining** — always use `?.` on all enriched/optional data fields (Google, Anthropic)

### Map Marker Palette (Day-Centric)

Markers are keyed by **day number**, not activity type. Legend shows only days present in `mapPoints`.

| Day | Name | Fill | Stroke |
|-----|------|------|--------|
| 1 | Champagne | `#D4AF7A` | `#B8924A` |
| 2 | Slate | `#64748B` | `#475569` |
| 3 | Midnight | `#1E293B` | `#0F172A` |
| 4 | Emerald | `#059669` | `#047857` |
| 5 | Rose | `#E11D48` | `#BE123C` |

Polyline: `strokeColor: #0A0A0A`, `strokeOpacity: 0.08`, `strokeWeight: 1`

---

## Environment Variables

### Active (All Phases)

```env
# AI
ANTHROPIC_API_KEY=                       # console.anthropic.com → API Keys

# Google Maps — CLIENT-SIDE (restricted to HTTP referrers: vercel domain + localhost)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=         # Google Cloud → Maps JavaScript API + Places API
                                         # Restrict to: https://travel-planner-v2-pearl.vercel.app/* + http://localhost:3000/*

# Google Maps — SERVER-SIDE (no HTTP referrer restriction — server has no referrer header)
MAPS_SERVER_KEY=                         # Google Cloud → Places API only, Application restrictions: None
                                         # Used in: src/app/api/itinerary/route.ts + src/lib/getPlacePhoto.ts

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=       # dashboard.clerk.com → API Keys
CLERK_SECRET_KEY=                        # dashboard.clerk.com → API Keys

# Database (Supabase)
DATABASE_URL=                            # Supabase → Project Settings → Database → Connection string (port 6543, PgBouncer pooled)
DIRECT_URL=                              # Supabase → Project Settings → Database → Connection string (port 5432, direct — required by Prisma)

# Admin Dashboard
ADMIN_USER_ID=                           # Clerk userId of the business owner (e.g. user_3AsR5caVfAvf9sfqkUsb48ZNMnh)
                                         # Must be trimmed — no trailing whitespace. Controls access to /admin/metrics.

# Cron Job Security
CRON_SECRET=                             # Random secret string — Vercel sends this as Authorization: Bearer <CRON_SECRET>
                                         # Generate with: openssl rand -hex 32

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=                  # Upstash Console → Redis → REST API → Endpoint
UPSTASH_REDIS_REST_TOKEN=               # Upstash Console → Redis → REST API → Token
```

> **Clerk keyless mode:** If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, `<ClerkProvider>` is skipped entirely (conditional in `layout.tsx`). The app renders and builds correctly without Clerk keys.

> **Supabase dual URLs:** `DATABASE_URL` uses PgBouncer (port 6543) for runtime queries. `DIRECT_URL` uses a direct connection (port 5432) required by Prisma for schema introspection and `db push`. Both must be set in `.env.local`.

> **Google key split:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is exposed to the browser — restrict it by HTTP referrer in Google Cloud Console. `MAPS_SERVER_KEY` is never sent to the client and has no referrer restriction (server-side fetch has no referrer header).

### Removed / Deprecated
The following Clerk redirect env vars are NOT needed for the current implementation (modal sign-in, no dedicated sign-in/sign-up pages):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL        ← not used
NEXT_PUBLIC_CLERK_SIGN_UP_URL        ← not used
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL  ← not used
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL  ← not used
```

---

## File Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout — fonts, conditional ClerkProvider, body bg-paper, appleWebApp metadata
│   ├── page.tsx                # Landing page (CurationForm) — force-dynamic
│   ├── not-found.tsx           # Custom 404 — Seek Wander aesthetic — force-dynamic
│   ├── globals.css             # Base styles, CSS custom properties, @media print resets
│   ├── manifest.ts             # Next.js PWA manifest — "Seek Wander", standalone display, brand colors (no "AI" in name)
│   ├── sw.ts                   # Serwist service worker — precache + Google Places photo CacheFirst (30d)
│   ├── api/
│   │   ├── itinerary/
│   │   │   └── route.ts        # POST — Zod validation → AI generation → PlaceCache enrichment → Haversine transit → CostLog
│   │   └── cron/
│   │       └── cleanup/
│   │           └── route.ts    # GET — Vercel Cron: deletes PlaceCache rows with updatedAt > 14 days (CRON_SECRET auth)
│   ├── admin/
│   │   └── metrics/
│   │       └── page.tsx        # Server component — internal BI dashboard (/admin/metrics), ADMIN_USER_ID gated
│   ├── itinerary/
│   │   └── page.tsx            # Client component — split-screen live results (55% timeline + 45% map)
│   ├── shared/
│   │   └── [id]/
│   │       └── page.tsx        # Server component — public read-only shared itinerary (/shared/[id]), NO auth
│   └── trips/
│       ├── page.tsx            # Server component — user archive dashboard (/trips)
│       └── [id]/
│           └── page.tsx        # Server component — dynamic saved trip viewer (/trips/[id]) + PDF export
├── components/
│   ├── Navbar.tsx              # Fixed nav — wordmark + /public/icon-192x192.png logo, MY TRIPS link, dynamic NavbarAuth
│   ├── NavbarAuth.tsx          # Clerk auth (ssr:false) — SignInButton modal + UserButton
│   ├── ShareButton.tsx         # Client component — navigator.share() + clipboard fallback + AnimatePresence toast
│   ├── ExportPdfButton.tsx     # Client component — window.print() trigger, print:hidden in output
│   ├── CurationForm.tsx        # 7-field concierge intake (staged inline expansion) + accommodation branching
│   ├── MobileMenu.tsx          # Mobile nav overlay — createPortal(…, document.body) escapes Navbar backdrop-blur stacking context
│   ├── GenerationLoader.tsx    # "Concierge at Work" loader — thin spinning ring + AnimatePresence cycling editorial steps
│   ├── EmptyTripsState.tsx     # Editorial inspiration hub — shown when /trips archive is empty
│   ├── UnauthenticatedState.tsx # "Velvet Rope" gate — Lock icon + Clerk modal SignInButton (shown instead of /trips redirect)
│   ├── TripsClient.tsx         # Client component for /trips — useOfflineTrips hook, offline banner, trip grid
│   ├── StayCard.tsx            # Booking.com affiliate card — motion.a, whileHover y:-2, AID 4013143
│   ├── SearchBar.tsx           # Google Places Autocomplete (legacy, not in main flow)
│   ├── BentoGrid.tsx           # 12-col editorial grid
│   ├── ItineraryMap.tsx        # Google Map — day-centric SVG markers + polyline + legend
│   └── ItineraryViewer.tsx     # Client component — editorial opener, tabbed days, TimelineCard, StayCard section, print all-days
├── middleware.ts               # Clerk middleware — all routes public
├── hooks/
│   ├── useItinerary.ts         # Client-side fetch + state + Sonner toast lifecycle (loading → success → error)
│   └── useOfflineTrips.ts      # localStorage cache + /api/trips fetch; falls back to seek_wander_archive key when offline
├── lib/
│   ├── db.ts                   # Prisma singleton — prevents multiple clients in dev hot-reload
│   ├── affiliate.ts            # createAffiliateUrl(hotelName, destination) → Booking.com AID 4013143 URL
│   ├── ratelimit.ts            # Upstash Redis ratelimit — slidingWindow(5, "1 h"), prefix: "seek-wander:itinerary"
│   ├── getPlacePhoto.ts        # getDestinationPhotoUrl() — uses MAPS_SERVER_KEY, for /trips cards + OG images
│   └── itineraryUtils.ts       # Shared runtime helpers: normalizeDayPlan(), isMealType(), computeMapPoints(), parseOpenNow()
├── app/actions/
│   └── saveTrip.ts             # Server action — auth-gated Prisma trip.create
└── types/
    └── itinerary.ts            # Shared TypeScript types ONLY — no runtime functions
```

```
prisma/
└── schema.prisma               # Trip, PlaceCache, CostLog models

vercel.json                     # Cron job schedule: /api/cron/cleanup at "0 0 * * *"
```

**New API routes:**

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/trips` | Clerk userId required | Returns user's trips with photoUrls serialised (for `useOfflineTrips` client fetch) |
| `GET /api/cron/cleanup` | CRON_SECRET bearer | Deletes PlaceCache rows older than 14 days |
| `POST /api/itinerary` | Rate-limited per userId | Main generation pipeline |

---

## Architecture & Patterns

### Chronological Timeline Data Shape (Critical — Major Refactor)

The canonical itinerary shape uses a single **`timeline: TimelineItem[]`** array per day — activities, breakfast, lunch, dinner, snacks, and drinks interwoven chronologically by `startTime`. The old shape (`morning`/`afternoon`/`evening` activities + separate `dining[]` array) is fully deprecated for new generations but still exists in the database for old records.

**`TimelineItemType`** = `"activity" | "breakfast" | "lunch" | "dinner" | "snack" | "drinks"`

**`TimelineItem`** — unified card type:
```ts
type TimelineItem = {
  type: TimelineItemType;
  title: string;           // activity name OR restaurant name
  description: string;     // 2 sentences for activities; cuisine for meals
  duration: string;        // e.g. "2 hours"; empty for meals
  startTime?: string;      // HH:MM — strictly sequential
  category?: string;       // SIGHTSEEING | MUSEUM | CULTURE etc — activities only
  coordinates: Coordinate;
  cuisine?: string;        // meals only
  pricePoint?: string;     // meals only
  reservation?: boolean;   // meals only
  dietaryNote?: string;    // meals only
  // Google Places enriched:
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
  transitFromPrevious?: TransitInfo;
}
```

**`DayPlan`** (updated):
```ts
type DayPlan = {
  day: number;
  theme: string;
  pace: Pace;
  timeline: TimelineItem[];        // canonical field
  hiddenGem: string;
  hiddenGemCoordinates: Coordinate;
  // Legacy — optional, only present in DB records saved before the refactor:
  morning?: Activity;
  afternoon?: Activity;
  evening?: Activity;
  dining?: DiningRec[];
}
```

**`MapPointType`** = `"activity" | "meal" | "gem"` (simplified from the old morning/afternoon/evening/dining types)

### `src/lib/itineraryUtils.ts` — Shared Runtime Helpers

> **Rule:** `src/types/itinerary.ts` exports **types and interfaces only** — no runtime functions. All executable helpers live in `src/lib/itineraryUtils.ts`.

Four exported functions:

1. **`normalizeDayPlan(day: DayPlan): DayPlan`** — Backward-compat shim. Checks `Array.isArray(day.timeline)` — if false, synthesizes `timeline[]` from the legacy `morning`/`afternoon`/`evening`/`dining` fields. Old DB records render correctly with zero migration.

2. **`isMealType(type: TimelineItemType): boolean`** — Returns `true` for breakfast/lunch/dinner/snack/drinks.

3. **`computeMapPoints(days: DayPlan[]): MapPoint[]`** — Converts itinerary days to `MapPoint[]`. Calls `normalizeDayPlan()` internally.

4. **`parseOpenNow(hoursOpen: string, lng: number): boolean | undefined`** — Computes open/closed status locally from a cached `hoursOpen` string and destination longitude (used as UTC offset estimate). Zero API calls on cache hits. Handles: `"Open 24 hours"` → `true`, `"Closed"` → `false`, `"9:00 AM – 9:00 PM"` ranges, overnight spans. Uses `Math.round(lng / 15)` hours as UTC offset (±30 min accuracy, sufficient for a planning app).

### `ItineraryViewer.tsx` — TimelineCard

- **`TimelineCard`** replaces the old `LocationCard`. Accepts a single `TimelineItem`.
- Meal items (`isMealType()` true): `Utensils` icon placeholder, `type.toUpperCase()` badge (BREAKFAST, LUNCH, etc.), reservation/pricePoint cost badge.
- Activity items: `ImageOff` placeholder, `category` badge, priceLevel cost badge.
- Both share the same layout: photo column left, content column right.
- `DaySection` calls `normalizeDayPlan(rawDay)` at its top.
- **No separate dining section** — all items render in a single `items.map()` loop with `TransitHeader` connectors between consecutive items.

### Server-to-Client Composition Pattern

`ItineraryViewer.tsx` is a `"use client"` component with a `bottomSection?: ReactNode` slot:

```tsx
// itinerary/page.tsx — save button
<ItineraryViewer itinerary={itinerary} bottomSection={<SaveCta />} />

// trips/[id]/page.tsx — back-to-archive links
<ItineraryViewer itinerary={itinerary} bottomSection={<BackToArchiveCta />} />

// shared/[id]/page.tsx — acquisition CTA
<ItineraryViewer itinerary={itinerary} bottomSection={<AcquisitionCta />} />
```

**Do not** move page-specific CTAs, save buttons, or navigation inside `ItineraryViewer`. Keep it display-only.

### Security — Ownership Enforcement (IDOR Prevention)

```ts
// Option A — findUnique + post-fetch ownership check (used in trips/[id])
const trip = await prisma.trip.findUnique({ where: { id: params.id } });
if (!trip || trip.userId !== userId) notFound();
```

Both missing and wrong-owner records return the same neutral `notFound()`.

**`/shared/[id]` is the intentional exception** — public route, NO auth check. Anyone with the link can view.

### Admin Dashboard Auth Pattern

```ts
// src/app/admin/metrics/page.tsx
const { userId } = await auth();
const adminId    = process.env.ADMIN_USER_ID?.trim(); // .trim() — Vercel env vars can have trailing newline
if (!adminId || userId !== adminId) notFound();       // neutral 404 for all non-admin access
```

`notFound()` is used (not `redirect`) so the route's existence is not leaked to non-admin users.

### Server Component Auth Pattern (Clerk v6)

```ts
const { userId } = await auth();   // MUST be awaited — auth() returns a Promise in Clerk v6.39+
if (!userId) redirect("/");
```

**`auth()` must be `await`ed.** Without it, destructuring gives `userId = undefined`. Both `/trips` and `/trips/[id]` carry `export const dynamic = "force-dynamic"`.

### Prisma JSON Cast Pattern

```ts
const itinerary = trip.itineraryData as unknown as ItineraryResponse;
```

Always use optional chaining on the result — JSON may have been written by an older schema version.

### Map Points — Computation Pattern

- **Server-side** (`trips/[id]`, `shared/[id]`): `const mapPoints = computeMapPoints(itinerary.days ?? [])` directly in the server component.
- **Client-side** (`itinerary/page.tsx`): `useMemo(() => computeMapPoints(itinerary.days), [itinerary])`.
- Both import from `@/lib/itineraryUtils` — zero duplicated logic.

---

## Data Schemas

### Prisma — Full Schema
```prisma
generator client {
  provider = "prisma-client-js"
  // No explicit binaryTargets — Prisma auto-detects the correct platform binary.
  // Pinning targets (e.g. rhel-openssl-1.0.x) breaks Vercel (Amazon Linux 2023, OpenSSL 3.x).
}

model Trip {
  id            String   @id @default(uuid())
  userId        String                          // Clerk userId — no FK constraint
  destination   String
  days          Int
  itineraryData Json                            // Full ItineraryResponse blob
  createdAt     DateTime @default(now())
}

model PlaceCache {
  id               String   @id @default(uuid())
  cacheKey         String   @unique             // "{normalized-name}|{normalized-city}"
  photoUrl         String?
  rating           Float?
  userRatingsTotal Int?
  hoursOpen        String?                      // e.g. "9:00 AM – 9:00 PM" (today's hours, stripped of day prefix)
  priceLevel       Int?
  fetchedAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt          // auto-updated on every write — used by cron cleanup
}

model CostLog {
  id          String   @id @default(uuid())
  userId      String?                           // Clerk userId — null for unauthenticated generations
  destination String
  aiCost      Decimal  @db.Decimal(10, 6)       // Anthropic cost in USD
  googleCost  Decimal  @db.Decimal(10, 6)       // Google Places API cost in USD
  totalCost   Decimal  @db.Decimal(10, 6)       // aiCost + googleCost
  cacheHits   Int                               // PlaceCache hits (zero Google API calls)
  cacheMisses Int                               // Fresh Google Places Text Search calls
  createdAt   DateTime @default(now())
}
```

> **Vercel Deployment:** `package.json` includes `"postinstall": "prisma generate"` so Vercel regenerates the Prisma client with the correct Linux binary after `npm install`. This is the only Vercel-specific Prisma config needed.

### ItineraryRequest (POST body — Zod-validated)
```ts
// Defined as z.infer<typeof ItinerarySchema> in route.ts — source of truth is the Zod schema
type ItineraryRequest = {
  destination: string    // max 100 chars
  placeId: string        // max 300 chars
  lat: number            // finite
  lng: number            // finite
  departureDate: string  // ISO "YYYY-MM-DD"
  returnDate: string     // ISO "YYYY-MM-DD"
  duration: number       // int, 1–5 (enforced by Zod — no manual Math.min/max needed)
  travelParty: 'solo' | 'couple' | 'family' | 'group'
  pace: 'relaxed' | 'moderate' | 'packed'
  budgetTier: 'premium' | 'luxury' | 'ultra-luxury'
  dietary: DietaryOption[]   // max 7 items
  interests: Interest[]      // max 10 items
}
```

### ItineraryResponse (AI output + enriched fields)
```ts
type ItineraryResponse = {
  destination: string
  editorial: string        // Vogue-style opener sentence
  days: DayPlan[]          // timeline[] shape — see Chronological Timeline section above
}

// MapPointType = "activity" | "meal" | "gem"
// MapPoint = { day: number; type: MapPointType; label: string; lat: number; lng: number }
```

---

## Data Pipeline (`src/app/api/itinerary/route.ts`)

### Overview
1. **Zod validation** — `ItinerarySchema.safeParse(raw)` — 400 on failure with `fieldErrors`
2. **AI generation** — `claude-sonnet-4-6` with `SYSTEM_PROMPT` (injection defence) produces pure JSON
3. **Place enrichment** — `enrichPlace()` per `timeline` item in parallel (PlaceCache-first)
4. **Transit calculation** — pure Haversine (zero API calls)
5. **Cost tracking** — `CostLog` written (awaited) before response

### Zod Request Validation
```ts
const ItinerarySchema = z.object({
  destination:   z.string().min(1).max(100),
  placeId:       z.string().min(1).max(300),
  lat:           z.number().finite(),
  lng:           z.number().finite(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration:      z.number().int().min(1).max(5),
  travelParty:   z.enum(["solo", "couple", "family", "group"]),
  pace:          z.enum(["relaxed", "moderate", "packed"]),
  budgetTier:    z.enum(["premium", "luxury", "ultra-luxury"]),
  dietary:       z.array(z.enum([...])).max(7),
  interests:     z.array(z.enum([...])).max(10),
});
type ItineraryRequest = z.infer<typeof ItinerarySchema>; // local to route.ts
```

`safeParse` is used — never `parse` — so errors are handled gracefully without try/catch.

### Prompt Injection Defence (System Prompt)
A `SYSTEM_PROMPT` constant is passed as the `system` parameter to `client.messages.create()`. It instructs the model:
- Role and output format are **fixed** — cannot be overridden by user message content
- Any injection attempt in destination/interests/dietary fields is silently ignored
- Output is always pure JSON — never markdown, explanations, or apologies

The `system` parameter is processed at a higher trust level than `messages[]` — the model treats system instructions as authoritative and user content as untrusted input.

### AI JSON Schema (current — timeline shape)
```json
{
  "destination": "string",
  "editorial": "string (≤25 words)",
  "days": [{
    "day": 1,
    "theme": "string",
    "pace": "relaxed | moderate | packed",
    "timeline": [{
      "type": "activity | breakfast | lunch | dinner | snack | drinks",
      "title": "string (real place/restaurant name)",
      "description": "string (exactly 2 sentences)",
      "duration": "string",
      "startTime": "HH:MM (strictly sequential)",
      "category": "SIGHTSEEING | MUSEUM | CULTURE | NATURE | WELLNESS | ADVENTURE | SHOPPING (activities only)",
      "coordinates": { "lat": number, "lng": number },
      "cuisine": "string (meals only)",
      "pricePoint": "$$ | $$$ | $$$$ (meals only)",
      "reservation": true | false,
      "dietaryNote": "string | undefined"
    }],
    "hiddenGem": "string",
    "hiddenGemCoordinates": { "lat": number, "lng": number }
  }]
}
```

### `enrichPlace()` — PlaceCache-First Enrichment
```
1. Check prisma.placeCache (cacheKey = "{normalized-name}|{normalized-city}")
   HIT  (< 30 days old): return cached data + parseOpenNow(hoursOpen, lng) — ZERO Google API calls
   MISS: continue to Google Places

2. Google Places Text Search (textsearch/json) using MAPS_SERVER_KEY
   → photoUrl, rating, userRatingsTotal, openNow, priceLevel, place_id

3. Google Place Details (details/json?fields=opening_hours) — skipped for NATURE/ADVENTURE
   → weekday_text → today's hours string (e.g. "9:00 AM – 9:00 PM")
   → todayIdx = (new Date().getDay() + 6) % 7  (Monday=0)

4. Write result to PlaceCache (upsert, fire-and-forget — non-fatal if it fails)
```

Both Google steps use `AbortSignal.timeout()` (5000ms / 4000ms). All errors return `null` gracefully.

**`SKIP_DETAILS_CATEGORIES`** = `Set(["NATURE", "ADVENTURE"])` — outdoor places have no meaningful opening hours; skipping saves one Place Details call per item.

> **Critical:** Photo URL parameter is `photoreference` (no underscore). `photo_reference` silently returns a broken redirect.

### Transit Calculation — Pure Haversine (Zero API Calls)
**Distance Matrix API has been removed entirely.** Transit is 100% local math:
```ts
walkingMinutes  = max(1, round((km / 5)  * 60))   // 5 km/h walking
drivingMinutes  = max(1, round((km / 25) * 60))   // 25 km/h city driving
```
No async, no API key, no cost. Applied per-day across all `timeline` stop coordinates.

### Cost Tracking — `GenerationMeta` + `CostLog`
```ts
// Pricing constants
CLAUDE_INPUT_COST  = $3  / 1_000_000 tokens
CLAUDE_OUTPUT_COST = $15 / 1_000_000 tokens
GOOGLE_TEXT_SEARCH = $0.032 / call
GOOGLE_DETAILS     = $0.017 / call
```

`GenerationMeta` is assembled locally and **logged to server console only** — never transmitted to the client (margin protection). It is then **awaited** as `prisma.costLog.create()` inside a try/catch *before* `return Response.json(itinerary)`.

> **Why awaited (not fire-and-forget)?** Vercel freezes the serverless function the instant the HTTP response is returned, killing any background promise mid-flight. Awaiting the DB write guarantees financial data integrity at the cost of ~50ms (negligible vs. 10+ second generation time).

### `getDestinationPhotoUrl()` — `/trips` Dashboard Photos (`src/lib/getPlacePhoto.ts`)
```
Step 1: findplacefromtext (fields=photos) — uses MAPS_SERVER_KEY
Step 2: Constructs Places Photo URL → photoreference (no underscore)
```
Cache: `next: { revalidate: 86400 }`. Timeout: `AbortSignal.timeout(4000)`. Returns `null` on error → typographic placeholder fallback.

---

## Admin Dashboard (`/admin/metrics`)

Internal BI page — access controlled by `ADMIN_USER_ID` env var.

**KPI cards:**
- Total Spent (sum of `totalCost`)
- Total Generations (count of `CostLog` rows)
- Avg Cost / Trip
- Cache Hit Rate (`cacheHits / (cacheHits + cacheMisses)`)

**Cost split section:** Claude vs Google with per-trip averages.

**Generation log table:** Last 200 rows, newest first. Cost colour-coding: green < $0.15, amber > $0.50. Cache column: `{hits}/{hits+misses}`.

Auth pattern:
```ts
const { userId } = await auth();
const adminId    = process.env.ADMIN_USER_ID?.trim(); // trim() prevents Vercel newline bug
if (!adminId || userId !== adminId) notFound();
```

---

## Automated Garbage Collection — Vercel Cron

**Route:** `GET /api/cron/cleanup`
**Schedule:** `"0 0 * * *"` (daily at midnight UTC) — configured in `vercel.json`
**Security:** Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on every invocation. Route checks this header and returns 401 for any other caller.

**Logic:**
```ts
const fourteenDaysAgo = new Date();
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
const result = await prisma.placeCache.deleteMany({
  where: { updatedAt: { lt: fourteenDaysAgo } },
});
```

`PlaceCache.updatedAt` uses Prisma `@updatedAt` — auto-refreshed on every upsert. Records accessed recently (cache hits that trigger an upsert) stay alive.

---

## Security Architecture

### 1. Input Validation (Zod)
All POST bodies to `/api/itinerary` are parsed through `ItinerarySchema.safeParse()` before any database or API call. Invalid requests return `400` with per-field `fieldErrors`. The `ItineraryRequest` type is derived from the Zod schema (`z.infer<>`) — the schema is the single source of truth.

### 2. Prompt Injection Defence
`SYSTEM_PROMPT` is passed as the `system` parameter (not inside `messages[]`) to the Anthropic SDK. The model is instructed to ignore any instructions embedded in user-supplied fields (destination, interests, dietary). Malicious payloads are silently discarded and a standard itinerary is generated.

### 3. HTTP Security Headers (`next.config.mjs`)
Applied to all routes via `headers()`:
```
X-Frame-Options:        DENY
X-Content-Type-Options: nosniff
Referrer-Policy:        strict-origin-when-cross-origin
Permissions-Policy:     camera=(), microphone=(), payment=(), usb=(), geolocation=(self)
```
No `Content-Security-Policy` (would break Google Maps JS SDK + Clerk). No `Strict-Transport-Security` (Vercel enforces HTTPS at the edge).

### 4. Google API Key Split
| Key | Env Var | Restriction | Used In |
|-----|---------|-------------|---------|
| Client key | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | HTTP referrers: Vercel domain + localhost | Maps JS SDK, Places Autocomplete (browser) |
| Server key | `MAPS_SERVER_KEY` | API restriction: Places API only; no referrer | `route.ts` enrichment, `getPlacePhoto.ts` |

### 5. IDOR Prevention
`/trips/[id]` fetches by ID then checks `trip.userId === userId` — both missing and wrong-owner records return a neutral `notFound()`. Never expose ownership information in error responses.

### 6. Admin Route — Neutral 404
`/admin/metrics` calls `notFound()` (not `redirect`) for all non-admin access. This prevents leaking that the route exists to non-admin users.

### 7. Rate Limiting (Upstash Redis)
`POST /api/itinerary` checks `ratelimit.limit(userId || ip)` before any AI or DB call. Returns `429` with `X-RateLimit-*` headers on exhaustion. Sliding window: 5 generations per user per hour.

### 8. AI JSON Self-Healing
Two-phase pipeline prevents raw malformed JSON from ever reaching the client: (1) `sanitizeJson()` regex sweep strips code fences and trailing commas; (2) fallback Anthropic `JSON_REPAIR_PROMPT` call if `JSON.parse()` still throws. Both failures → clean `500`.

### 9. `/api/trips` Auth Guard
`GET /api/trips` returns `401 Unauthorized` if Clerk `userId` is absent. All data in the response is scoped to `{ where: { userId } }` — a user can never receive another user's trips through this endpoint.

---

## PWA Infrastructure

- **`src/app/sw.ts`** — Serwist service worker. `CacheFirst` for Google Places photos (30-day TTL, 100-entry cap). `defaultCache` for Next.js static assets.
- **`src/app/manifest.ts`** — Next.js `MetadataRoute.Manifest`. Name: `"Seek Wander"` (no "AI"). Standalone display, `#F6F1EB` background, `#1B1817` theme color. Icons at `/icon-192x192.png` and `/icon-512x512.png`.
- **`src/app/layout.tsx`** — `appleWebApp: { capable: true, statusBarStyle: "default", title: "Seek Wander" }` in metadata.
- **`next.config.mjs`** — wrapped with `withSerwist({ swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development" })`.
- Icons must be placed manually in `/public/` — any square PNG works as placeholder.

---

## PDF / Print Export

Zero-dependency — `window.print()` + Tailwind `print:` modifiers. No libraries.

- **`<ExportPdfButton />`** — `window.print()` on click, `print:hidden` on itself.
- **`src/app/globals.css`** — `@media print` block: resets Framer Motion inline `opacity` (`[style*="opacity"] { opacity: 1 !important }`), resets transforms, forces color printing, `@page { margin: 1.5cm 2cm }`.
- **`src/app/trips/[id]/page.tsx`** — outer wrapper: `print:h-auto print:overflow-visible print:block` (breaks out of `h-screen overflow-hidden`). Branded dossier header (`hidden print:block`): Seek Wander wordmark, destination, date. Navbar + maps + header strip are `print:hidden`.
- **`ItineraryViewer.tsx`** — tab bar `print:hidden`, active day section `print:hidden`. `hidden print:block` section renders all days sequentially with `print:break-before-page` on days 2+. `bottomSection` is `print:hidden`.

---

## Public Sharing — `/shared/[id]`

- **`src/app/shared/[id]/page.tsx`** — Server component. Intentionally NO auth check — public by design.
- Fetches by ID only: `prisma.trip.findUnique({ where: { id: params.id } })`.
- `generateMetadata()` produces dynamic OG tags: `{destination} Itinerary | Seek Wander`.
- Ink acquisition banner: "Curated by Seek Wander — Create Your Own →".
- Mobile sticky CTA: `fixed bottom-0 z-40 bg-burnt-orange`.
- **`<ShareButton tripId={id} destination={name} />`** — on `/trips` card rows. Tries `navigator.share()` first (mobile native), falls back to `navigator.clipboard.writeText()`. AnimatePresence toast: "Link copied to clipboard".

---

## Monetization Layer — Booking.com Affiliate

### `src/lib/affiliate.ts`
```ts
export function createAffiliateUrl(hotelName: string, destination: string): string {
  const query = encodeURIComponent(`${hotelName} ${destination}`);
  return `https://www.booking.com/searchresults.html?ss=${query}&aid=4013143`;
}
```
AID `4013143` is the Seek Wander affiliate account. All hotel links must use this utility — never construct Booking.com URLs manually.

### `StayCard.tsx`
- `motion.a` pointing to `createAffiliateUrl()` result
- `target="_blank" rel="noopener noreferrer"` — always
- `whileHover={{ y: -2 }}` lift effect
- `ArrowUpRight` CTA icon with `group-hover:translate` nudge
- Rendered inside `ItineraryViewer` when `itinerary.recommendedStays?.length > 0`
- **Guard pattern:** `(itinerary.recommendedStays?.length ?? 0) > 0` — section is completely absent if the AI returns no stays
- Section is `print:hidden` — stays don't belong in the PDF dossier

### Accommodation Branching (`CurationForm` + API)
`CurationForm` collects `accommodationStatus: "needed" | "booked"` and an optional `hotelName` (revealed via `AnimatePresence` when status is "booked"). The API route reads these fields and branches the `SYSTEM_PROMPT` dynamically:
- `"needed"` → Claude generates `recommendedStays[]` with real hotel names + Booking.com search terms
- `"booked"` → Claude uses the provided `hotelName` as the base, skips hotel recommendations

---

## Offline & PWA Architecture

### Service Worker (`src/app/sw.ts` — Serwist)
- `CacheFirst` strategy for Google Places photo URLs — 30-day TTL, 100-entry cap
- `defaultCache` for Next.js static assets (JS chunks, fonts, CSS)
- Disabled in `development` (`process.env.NODE_ENV === "development"`) to prevent stale caches during iteration
- Service worker source: `src/app/sw.ts` → compiled to `public/sw.js` by `withSerwist()` in `next.config.mjs`

### Offline Trip Archive (`src/hooks/useOfflineTrips.ts`)
Client-side hook used by `TripsClient.tsx`. Two-phase data strategy:

```
Phase 1 — navigator.onLine check
  → false: load from localStorage immediately, set isOffline: true, skip fetch

Phase 2 — /api/trips fetch (Clerk-authed GET)
  → success: update state + persist to localStorage ("seek_wander_archive" key)
  → failure: load from localStorage fallback, set isOffline: true
```

**Cache key:** `seek_wander_archive` — stores `CachedTrip[]` as JSON. Includes `itineraryData` for editorial preview text.

**`TripsClient.tsx`** — the `"use client"` boundary for `/trips`. The server component (`trips/page.tsx`) handles auth + header rendering; `TripsClient` owns the data fetching, offline banner (`bg-ink text-paper WifiOff`), loading state, and trip grid.

> **Why not server-side fetch?** `getDestinationPhotoUrl()` uses `MAPS_SERVER_KEY` (server-only). The `/api/trips` route computes photo URLs server-side and serialises them into the response. `TripsClient` gets pre-resolved URLs — no client-side key exposure.

### `/api/trips` Route
```ts
// GET — Clerk auth required
const { userId } = await auth();
if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

const trips = await prisma.trip.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
const tripsWithPhotos = await Promise.all(
  trips.map(async (t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),   // serialise Date for JSON transport
    photoUrl: await getDestinationPhotoUrl(t.destination),
  }))
);
```

---

## UX & Polish Layer

### Sonner Notification System (`sonner@2`)
Configured globally in `src/app/layout.tsx`:
```tsx
<Toaster
  position="bottom-right"
  expand={false}
  richColors
  toastOptions={{
    style: {
      background: "#F5F0E8",           // brand paper
      color: "#0A0A0A",                // brand ink
      border: "1px solid rgba(10,10,10,0.1)",
      borderRadius: "0",               // design system: no rounding
      fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      fontSize: "0.8125rem",
    },
  }}
/>
```

**Generation lifecycle** — all three calls share `id: "curate-task"` so Sonner mutates the same toast in place:
```ts
toast.loading("Consulting the concierge…", { id: "curate-task" })   // fetch start
toast.success("Itinerary Prepared", { id: "curate-task", description: "…" }) // success
toast.error("Concierge Busy", { id: "curate-task", description: "…" })        // any error
```

**Save action** (no shared ID — independent toasts):
```ts
toast.success("Passport Updated", { description: "This journey has been saved to your archive." })
toast.error("Save Failed",        { description: "Unable to save this journey. Please try again." })
```

### `GenerationLoader.tsx` — "Concierge at Work"
- Thin ring: static `border-ink/10` track + rotating `border-t-ink/40` arc (`animationDuration: 2.4s linear`)
- `STEPS` array (5 items) cycles via `setInterval(3500ms)` + `useState(stepIndex)`
- `AnimatePresence mode="wait"` with `initial={{ opacity: 0, y: 10 }}` / `exit={{ opacity: 0, y: -10 }}` / `transition={{ duration: 0.8, ease: "easeInOut" }}`
- Persistent sub-label: `"This takes around 15–20 seconds"` (micro-copy)

### `UnauthenticatedState.tsx` — "The Velvet Rope"
Replaces the old `redirect("/")` on `/trips` for unauthenticated users. Instead of bouncing the user away, renders an editorial gate:
- `Lock` icon (Lucide, `strokeWidth={1}`)
- `"Private Access"` micro-copy kicker
- `"Your passport awaits."` serif headline
- `<SignInButton mode="modal">` styled as `bg-ink text-paper hover:bg-burnt-orange` primary button
- **Why `<SignInButton mode="modal">` instead of `<Link href="/sign-in">`?** No `/sign-in` page exists. Auth is modal-only throughout the app.

### `EmptyTripsState.tsx` — Inspiration Hub
Two-section editorial experience for users with zero saved trips:
- **Section A:** `Compass` icon, micro-copy kicker, `"Your passport is currently blank."` serif headline, `bg-ink text-paper hover:bg-burnt-orange` CTA to `/`
- **Section B:** 3-column `CARDS` grid (editorial destination teasers), staggered `delay: 0.3 + i * 0.08` — all link to `/` to start a curation

### Mobile Navigation — CSS Stacking Context Lesson
**Bug:** `MobileMenu.tsx` overlay appeared transparent — text camouflaged into background hero images.

**Root cause:** `Navbar.tsx` applies `backdrop-blur-sm` to its root `<motion.nav>`. `backdrop-filter` creates a new CSS stacking context. Any `fixed`-positioned descendant is anchored to that ancestor, not the viewport. The overlay only covered the ~64px navbar bar height.

**Fix:** `createPortal(overlay, document.body)` in `MobileMenu.tsx`. The portal moves the DOM node outside the Navbar tree entirely. `fixed inset-0` then covers the true viewport as intended. SSR guard: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`.

> **Rule for future overlays:** Any `fixed`-positioned full-screen overlay rendered inside a component that uses `backdrop-filter`, `transform`, `filter`, `will-change`, or `perspective` MUST use `createPortal(…, document.body)`.

---

## Rate Limiting (`src/lib/ratelimit.ts`)

```ts
import { Redis }     from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix:    "seek-wander:itinerary",
});
```

**Applied in `POST /api/itinerary`:**
- Key: Clerk `userId` (authenticated) or request IP (unauthenticated fallback)
- `{ success, limit, remaining, reset }` returned from `ratelimit.limit(key)`
- On failure: `429 Too Many Requests` with `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers
- Sonner surfaces this as `toast.error("Concierge Busy", { description: "Our desk is at capacity. Please try again in a moment." })`

---

## AI Resilience — JSON Self-Healing

The `POST /api/itinerary` route implements a two-phase JSON recovery pipeline:

**Phase 1 — `sanitizeJson(raw: string): string`**
Pre-parser regex sweep applied before `JSON.parse()`:
- Strips markdown code fences (`` ```json … ``` ``)
- Removes trailing commas before `}` and `]`
- Trims surrounding whitespace

**Phase 2 — Claude Repair Call (`JSON_REPAIR_PROMPT`)**
If `sanitizeJson()` + `JSON.parse()` still throws, a second Anthropic call is made with the malformed string and a strict repair instruction. The repair response is then parsed again. If both phases fail, a clean `500` is returned.

This means Claude's own output is never shown raw to users even if partially malformed — a second Claude call silently fixes it.

---

## Open Graph & Social Metadata

### Global defaults (`src/app/layout.tsx`)
```ts
title: {
  default: "Seek Wander | Bespoke AI Travel Curation",
  template: "%s | Seek Wander",   // subpages set only their unique part
},
openGraph: { type: "website", siteName: "Seek Wander", … },
twitter:   { card: "summary_large_image", … },
```

### Per-trip dynamic OG (`src/app/trips/[id]/page.tsx` — `generateMetadata()`)
- **Title:** `"{destination} | Curated by Seek Wander"` (full string — not `%s` template, because "Curated by" is trip-specific)
- **Description:** First sentence of `itinerary.editorial` extracted by `editorial.split(/\.\s+/)[0]?.trim()` — the Vogue opener becomes the social card tagline
- **og:image / twitter:image:** `getDestinationPhotoUrl(destination)` — gracefully omitted if null; `twitter:card` degrades to `"summary"` when no image available
- **No auth in `generateMetadata`:** Clerk session unavailable there. The page component enforces full auth + IDOR ownership check.

### Shared itinerary OG (`src/app/shared/[id]/page.tsx`)
Already has `generateMetadata()` — produces `{destination} Itinerary | Seek Wander`. Public route (intentional, no auth).

---

## Auth Architecture (Clerk v6)

### Middleware (`src/middleware.ts`)
```ts
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware()
// All routes are PUBLIC — no protect() calls
```

### Layout (`src/app/layout.tsx`)
```tsx
{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
  <ClerkProvider>{children}</ClerkProvider>
) : (
  children
)}
```

### Navbar Auth (`src/components/NavbarAuth.tsx`)
- Loaded via `next/dynamic(..., { ssr: false })` in `Navbar.tsx`
- Uses `<SignedOut>` / `<SignedIn>` (Clerk v6 API — NOT `<Show>`)
- `<SignInButton mode="modal">` — no redirect pages needed
- `<UserButton>` with `appearance.elements.avatarBox: "w-8 h-8"`

### Route Auth Model
- `/trips` — `auth()` + `redirect('/')` if no userId
- `/trips/[id]` — `auth()` + ownership check + `notFound()` if unauthorized
- `/admin/metrics` — `auth()` + `ADMIN_USER_ID` match + `notFound()` if unauthorized
- `saveTrip` server action — `auth()` + throws if no userId
- `/itinerary` — save button gated by `<SignedIn>`; page itself is public
- `/shared/[id]` — **intentionally public, no auth**

---

## AI Prompt Convention

Model: `claude-sonnet-4-6` | Max tokens: `8192`

The model receives a fixed `SYSTEM_PROMPT` (injection defence) plus a `buildPrompt()` user message. The system prompt locks the role, format, and schema. The user message contains the curated client profile.

Each response is a `timeline[]`-based JSON itinerary with:
- Vogue-style editorial opener (≤25 words)
- Days with poetic theme title + honest pace rating
- `timeline[]` items ordered by `startTime` — activities AND meals interwoven
- 1–2 real restaurant meals per day with real GPS coordinates
- 1 hidden gem per day (95% of tourists never find it)

Response is **always pure JSON** — no markdown, no preamble.

---

## CurationForm Fields (7 total)

Staged inline expansion — each stage unlocks after the previous is completed.

| # | Field | Type | Notes |
|---|-------|------|-------|
| 1 | Destination | Google Places Autocomplete | Unlocks Stage 1 |
| 2 | Dates | Departure + Return date pickers | `getLocalToday()` for timezone safety; duration badge computed |
| 3 | Travel Party | Solo / Couple / Family / Group pills | |
| 4 | Pace | Relaxed (3–4/day) / Moderate (4–5/day) / Packed (6–7/day) cards | |
| 5 | Budget Tier | Premium $$ / Luxury $$$ / Ultra-Luxury $$$$ cards | |
| 6 | Dietary | 7 options (None / Vegetarian / Vegan / Halal / Kosher / Gluten-Free / Dairy-Free) | Halal, Kosher, GF require detailed dietaryNote in prompt |
| 7 | Interests | 10 options, no max cap | |

---

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core Engine | **Complete** | UI + Google Maps + Anthropic AI, no auth |
| 2 — Concierge UX | **Complete** | 7-field intake form, split-screen results, Google enrichment, Haversine transit |
| 3 — Ultra-Luxury UI | **Complete** | Tabbed day nav, hoursOpen, cost badges, dashed transit connectors, day-centric map |
| 4 — Auth | **Complete** | Clerk v6 integration, conditional ClerkProvider, NavbarAuth, custom 404 |
| 5 — Persistence & Dynamic Routes | **Complete** | Prisma + Supabase, saveTrip server action, /trips archive, /trips/[id] viewer, ItineraryViewer composition, IDOR enforcement |
| 6 — PWA, Sharing & Export | **Complete** | @serwist/next PWA, manifest.ts, public /shared/[id] with OG tags & acquisition banners, ShareButton, PDF/print export |
| 7 — Chronological Timeline | **Complete** | timeline: TimelineItem[] canonical shape; normalizeDayPlan() backward-compat shim; isMealType() + computeMapPoints() in itineraryUtils.ts |
| 8 — Margin Protection & Observability | **Complete** | PlaceCache (Supabase) — 30-day TTL, cache-first enrichment; Distance Matrix removed → pure Haversine; parseOpenNow() local computation; CostLog Prisma model (Decimal(10,6)); /admin/metrics BI dashboard (ADMIN_USER_ID gated); Vercel Cron daily cleanup (CRON_SECRET); Zod validation; SYSTEM_PROMPT injection defence; HTTP security headers; Google API key split (NEXT_PUBLIC_ client / MAPS_SERVER_KEY server) |
| 9 — Affiliate Monetization | **Complete** | Booking.com AID 4013143 — createAffiliateUrl(), StayCard component, accommodation branching in CurationForm + API (needed/booked), recommendedStays[] in ItineraryResponse, print:hidden on StayCard section |
| 10 — UX & Polish | **Complete** | GenerationLoader "Concierge at Work" cycling steps; Sonner notification layer (loading → success → error lifecycle, brand tokens); UnauthenticatedState "Velvet Rope" (Clerk modal gate); EmptyTripsState Inspiration Hub; MobileMenu createPortal fix (backdrop-blur stacking context bug resolved) |
| 11 — Mobile, Offline & Resilience | **Complete** | useOfflineTrips hook + TripsClient (localStorage seek_wander_archive fallback); /api/trips GET route with Clerk auth + photo serialisation; Upstash Redis rate limiting (5/hr sliding window); AI JSON self-healing (sanitizeJson + repair Anthropic call); dynamic OG metadata (trips/[id] generateMetadata, editorial first-sentence description, getDestinationPhotoUrl og:image); global metadata template in layout.tsx |
| 12 — Stripe Paywall | **Next** | Stripe Checkout — $4.99 paywall for itinerary generation (free tier: 1 generation; paid: unlimited) |
