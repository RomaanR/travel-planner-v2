# CLAUDE.md — Seek Wander V1.0

> **Permanent project memory and engineering specification. This is the single source of truth for all future development. Update whenever architecture decisions change.**

---

## 1. Product Philosophy

### The Luxury Concierge

**Seek Wander — Curated Luxury Journeys.**

This is not a travel app. It is a **digital concierge** — the invisible hand of an expert who has already been everywhere, knows everyone, and has already called ahead. Every pixel, every word, and every interaction must feel like it belongs in a *Vogue* editorial or a National Geographic feature. Expensive, minimalist, unhurried.

> **Brand rule:** The word "AI" is intentionally absent from all user-facing copy, manifests, metadata, and UI text. The product is positioned around the luxury *outcome*, not the technology. Claude is the invisible engine — never the headline.

### The Zero-Latency Principle

> **The most important architectural rule in this codebase.**

We generate everything — activities, meals, hotel recommendations, map coordinates, transit estimates — **in a single upfront AI call**. The UI never makes a second AI request after the initial generation. This is a deliberate, non-negotiable product decision with three consequences:

1. **Offline capability** — A saved itinerary works perfectly with no network connection. There is nothing to "fetch" because all data is already in Supabase and mirrored in `localStorage`.
2. **Cost protection** — Each interaction costs money. A feature that requires a second API call (live activity swapping, on-demand alternatives, dynamic re-routing) is rejected by default.
3. **Geographical integrity** — Live activity swapping was evaluated and killed. Swapping a single activity without re-generating the spatial context of the entire day creates incoherent schedules and breaks map data. The AI must reason about the full day holistically, or not at all.

**Rejected features (do not re-introduce without full architectural review):**
- Live activity swap / alternatives — breaks spatial coherence, requires second AI call
- Distance Matrix API — replaced by pure Haversine (zero cost, zero latency)
- Real-time `openNow` from Google Places — replaced by `parseOpenNow()` local computation

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router, TypeScript) | `force-dynamic` on landing + archive pages |
| Styling | Tailwind CSS v3 | Custom design tokens, `rounded-none` everywhere |
| Animation | Framer Motion 12 | Required on all sections — no static renders |
| Icons | Lucide React | — |
| Maps | `@react-google-maps/api` | Places Autocomplete + GoogleMap + Marker + Polyline |
| AI | `@anthropic-ai/sdk` | Model: `claude-sonnet-4-6`, max_tokens: `8192` |
| Auth | **`@clerk/nextjs@6`** | **v6 only — v7 requires Next.js 15, incompatible** |
| ORM | **Prisma 7 + Supabase (PostgreSQL)** | Dual connection URLs (pooled + direct) |
| Validation | **Zod** | Schema on all API POST bodies; `z.infer<>` for types |
| PWA | **`@serwist/next` + `serwist`** | Service worker, offline caching, installable |
| Rate Limiting | **`@upstash/redis` + `@upstash/ratelimit`** | `slidingWindow(10, "1 h")` per userId |
| Notifications | **`sonner`** | Branded toast layer — loading → success → error |
| Affiliate | **Booking.com** | AID `4013143`, `createAffiliateUrl()` in `src/lib/affiliate.ts` |

> **Clerk version lock:** Always install `@clerk/nextjs@6`, never `@clerk/nextjs@7+`. Clerk v7 requires Next.js 15. The v6 API uses `<SignedIn>/<SignedOut>` — `<Show>` is v7-only and must **never** be used.

---

## 3. Design System — "The Million-Dollar Aesthetic"

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

### Map Marker — Semantic Activity Icons (`ItineraryMap.tsx`)

Each marker overlays a **semantic SVG icon** on top of the day-colored circle, keyed by `TimelineItem.type`. Implemented in `getIconSvg(type: string): string` — returns a 16×16 SVG element string rendered inside a 32×32 data URI marker.

| Type | Icon | SVG Description |
|------|------|----------------|
| `breakfast` | Coffee mug | Mug body + handle + steam lines |
| `lunch` | Fork + knife | Two parallel utensils |
| `dinner` / `drinks` | Wine glass | Funnel bowl + stem + base |
| `activity` | Camera | Body + lens circle + notch |
| `accommodation` / `hotel` | Bed | Headboard + mattress + pillow rectangle |
| default | Map pin | Teardrop shape + centre dot |

All icons use `stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"` for visibility on all day-color backgrounds.

**`buildSvgMarker(day: number, type: string): string`** — composes the 32×32 SVG:
```ts
// Circle background (day color) + semantic icon centered at (8,8)
<circle cx="16" cy="16" r="14" fill="{dayFill}" stroke="white" stroke-width="2"/>
<g transform="translate(8,8)">{getIconSvg(type)}</g>
```
Returns a `data:image/svg+xml;charset=UTF-8,...` URI. Used as `Marker icon.url` with `scaledSize: Size(32,32)`, `anchor: Point(16,16)`.

> **Critical:** `FootprintsIcon` does **not** exist in lucide-react — never reference it. Use `TrainFront` for the walking/transit selector in forms.

---

## 4. Environment Variables

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
ADMIN_USER_ID=                           # Clerk userId of the business owner
                                         # Must be trimmed — no trailing whitespace. Controls access to /admin/metrics.

# Cron Job Security
CRON_SECRET=                             # Random secret string — Vercel sends this as Authorization: Bearer <CRON_SECRET>
                                         # Generate with: openssl rand -hex 32

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=                  # Upstash Console → Redis → REST API → Endpoint
UPSTASH_REDIS_REST_TOKEN=                # Upstash Console → Redis → REST API → Token
```

> **Clerk keyless mode:** If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, `<ClerkProvider>` is skipped entirely (conditional in `layout.tsx`). The app renders and builds correctly without Clerk keys.

> **Supabase dual URLs:** `DATABASE_URL` uses PgBouncer (port 6543) for runtime queries. `DIRECT_URL` uses a direct connection (port 5432) required by Prisma for schema introspection and `db push`. Both must be set in `.env.local`.

> **Google key split:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is exposed to the browser — restrict it by HTTP referrer in Google Cloud Console. `MAPS_SERVER_KEY` is never sent to the client and has no referrer restriction (server-side fetch has no referrer header).

### Removed / Deprecated

The following Clerk redirect env vars are **not** needed (modal sign-in, no dedicated sign-in/sign-up pages):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL        ← not used
NEXT_PUBLIC_CLERK_SIGN_UP_URL        ← not used
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL  ← not used
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL  ← not used
```

---

## 5. File Architecture

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
│   │   │   └── route.ts        # POST — Zod validation → Rate limit → AI generation → PlaceCache enrichment → Haversine transit → CostLog
│   │   ├── trips/
│   │   │   └── route.ts        # GET — Clerk auth → prisma.trip.findMany → photoUrl serialisation
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
│   ├── MobileMenu.tsx          # Mobile nav overlay — createPortal(…, document.body) escapes Navbar backdrop-blur stacking context
│   ├── ShareButton.tsx         # Client component — navigator.share() + clipboard fallback + AnimatePresence toast
│   ├── ExportPdfButton.tsx     # Client component — window.print() trigger, print:hidden in output
│   ├── CurationForm.tsx        # 7-field concierge intake (staged inline expansion) + accommodation branching
│   ├── GenerationLoader.tsx    # "Concierge at Work" loader — thin spinning ring + AnimatePresence cycling editorial steps
│   ├── EmptyTripsState.tsx     # Editorial inspiration hub — shown when /trips archive is empty
│   ├── UnauthenticatedState.tsx # "Velvet Rope" gate — Lock icon + Clerk modal SignInButton
│   ├── TripsClient.tsx         # "use client" for /trips — useOfflineTrips hook, offline banner, trip grid
│   ├── ItineraryViewer.tsx     # "use client" — editorial opener, tabbed days, TimelineCard, InteractiveStays, print all-days
│   ├── TimelineCard.tsx        # Pure display card — activity + meal unified, photo + enriched data
│   ├── InteractiveStays.tsx    # "use client" — hotel tier slider, AnimatePresence cross-fade, offline-capable
│   ├── StayCard.tsx            # Booking.com affiliate card — motion.a, whileHover y:-2, AID 4013143
│   ├── ItineraryMap.tsx        # Google Map — day-centric SVG markers with semantic activity type icons (getIconSvg/buildSvgMarker) + polyline + legend
│   ├── SearchBar.tsx           # Google Places Autocomplete (legacy, not in main flow)
│   └── BentoGrid.tsx           # 12-col editorial grid
├── middleware.ts               # Clerk middleware — all routes public
├── hooks/
│   ├── useItinerary.ts         # Client-side fetch + state + Sonner toast lifecycle (loading → success → error)
│   └── useOfflineTrips.ts      # localStorage cache + /api/trips fetch; falls back to seek_wander_archive key when offline
├── lib/
│   ├── db.ts                   # Prisma singleton — prevents multiple clients in dev hot-reload
│   ├── affiliate.ts            # createAffiliateUrl(hotelName, destination) → Booking.com AID 4013143 URL
│   ├── ratelimit.ts            # Upstash Redis ratelimit — slidingWindow(10, "1 h"), prefix: "seek-wander:itinerary"
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

**API routes:**

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/itinerary` | Rate-limited per userId | Main generation pipeline |
| `GET /api/trips` | Clerk userId required | Returns user's trips with photoUrls serialised (for `useOfflineTrips`) |
| `GET /api/cron/cleanup` | CRON_SECRET bearer | Deletes PlaceCache rows older than 14 days |

> **Rule:** `src/types/itinerary.ts` exports **types and interfaces only** — no runtime functions. All executable helpers live in `src/lib/itineraryUtils.ts`.

---

## 6. Architecture & Patterns

### Chronological Timeline Data Shape (Critical)

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

**`DayPlan`:**
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

### `src/lib/itineraryUtils.ts` — Shared Runtime Helpers

Four exported functions:

1. **`normalizeDayPlan(day: DayPlan): DayPlan`** — Backward-compat shim. Checks `Array.isArray(day.timeline)` — if false, synthesizes `timeline[]` from legacy `morning`/`afternoon`/`evening`/`dining` fields. Old DB records render correctly with zero migration.

2. **`isMealType(type: TimelineItemType): boolean`** — Returns `true` for breakfast/lunch/dinner/snack/drinks.

3. **`computeMapPoints(days: DayPlan[]): MapPoint[]`** — Converts itinerary days to `MapPoint[]`. Calls `normalizeDayPlan()` internally.

4. **`parseOpenNow(hoursOpen: string, lng: number): boolean | undefined`** — Computes open/closed status locally from a cached `hoursOpen` string and destination longitude (UTC offset estimate). Zero API calls on cache hits. Handles: `"Open 24 hours"` → `true`, `"Closed"` → `false`, `"9:00 AM – 9:00 PM"` ranges, overnight spans. Uses `Math.round(lng / 15)` hours as UTC offset (±30 min accuracy, sufficient for a planning app).

### `ItineraryViewer.tsx` + `TimelineCard.tsx`

`TimelineCard` is extracted to `src/components/TimelineCard.tsx` — a pure display component (no `"use client"` needed, no state). `ItineraryViewer.tsx` imports it. The card:
- Meal items: `Utensils` icon placeholder, `type.toUpperCase()` badge, reservation/pricePoint cost badge
- Activity items: `ImageOff` placeholder, `category` badge, priceLevel cost badge
- Both share the same layout: photo column left, content column right
- `DaySection` calls `normalizeDayPlan(rawDay)` at its top
- **No separate dining section** — all items render in a single `items.map()` loop with `TransitHeader` connectors

### Server-to-Client Composition Pattern

`ItineraryViewer.tsx` is `"use client"` with a `bottomSection?: ReactNode` slot:

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
const trip = await prisma.trip.findUnique({ where: { id: params.id } });
if (!trip || trip.userId !== userId) notFound();
```

Both missing and wrong-owner records return the same neutral `notFound()`. **`/shared/[id]` is the intentional exception** — public route, NO auth check.

### Admin Dashboard Auth Pattern

```ts
const { userId } = await auth();
const adminId    = process.env.ADMIN_USER_ID?.trim(); // .trim() — Vercel env vars can have trailing newline
if (!adminId || userId !== adminId) notFound();       // neutral 404 for all non-admin access
```

`notFound()` not `redirect()` — route existence must not be leaked.

### Server Component Auth Pattern (Clerk v6)

```ts
const { userId } = await auth();   // MUST be awaited — auth() returns a Promise in Clerk v6.39+
if (!userId) redirect("/");
```

Without `await`, destructuring gives `userId = undefined` — causes false Unauthorized on every request. Both `/trips` and `/trips/[id]` carry `export const dynamic = "force-dynamic"`.

### Prisma JSON Cast Pattern

```ts
const itinerary = trip.itineraryData as unknown as ItineraryResponse;
```

Always double-cast through `unknown`. Always use optional chaining on the result — JSON may have been written by an older schema version.

### Map Points — Computation Pattern

- **Server-side** (`trips/[id]`, `shared/[id]`): `const mapPoints = computeMapPoints(itinerary.days ?? [])` directly in the server component
- **Client-side** (`itinerary/page.tsx`): `useMemo(() => computeMapPoints(itinerary.days), [itinerary])`

---

## 7. Data Schemas

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
  duration: number       // int, 1–5 (enforced by Zod)
  travelParty: 'solo' | 'couple' | 'family' | 'group'
  pace: 'relaxed' | 'moderate' | 'packed'
  budgetTier: 'premium' | 'luxury' | 'ultra-luxury'
  dietary: DietaryOption[]   // max 7 items
  interests: Interest[]      // max 10 items
  // Accommodation & transport (optional — sent when user fills accommodation stage)
  accommodationStatus?: 'needed' | 'booked'
  hotelName?: string           // place name from Google Places (e.g. "The Ritz-Carlton")
  exactHotelAddress?: string   // Places-verified formatted_address — used as spatial anchor in prompt
  transportMode?: 'walking-transit' | 'car-driver'  // controls Neighbourhood Lock strictness
}
```

### RecommendedStay

```ts
type RecommendedStay = {
  name:         string;
  description:  string;
  neighborhood: string;
  rating?:      number;    // 3 | 4 | 5 — present on new generations only
  priceTier?:   string;    // "$$$" | "$$$$" | "$$$$$" — present on new generations only
};
```

### PlaceCache — `photoReference` Migration (2026-03-18)

The `photoUrl` column is deprecated. A new `photoReference String?` column stores the raw `photo_reference` token from Google Places instead of a full constructed URL. The photo URL is rebuilt at serve time using the current `MAPS_SERVER_KEY`, making all cached photo data resilient to API key rotation.

Old-format records (where `photoUrl` is set and `photoReference` is null) are detected via an `isOldFormat` flag and treated as expired — they self-refresh on the next cache miss with no manual data migration required.

A database index has been added to `PlaceCache.updatedAt` to optimise the nightly cron cleanup query:

```prisma
@@index([updatedAt]) // deleteMany({ where: { updatedAt: { lt: 14daysAgo } } }) — O(log n) not O(n)
```

Schema synced to Supabase production via `npx prisma db push` (Prisma v5.22.0).

---

## 8. Data Pipeline (`src/app/api/itinerary/route.ts`)

### Overview

```
1. Zod validation     → ItinerarySchema.safeParse(raw) — 400 on failure with fieldErrors
2. Rate limit check   → Upstash Redis — 429 on exhaustion
3. AI generation      → claude-sonnet-4-6 + SYSTEM_PROMPT (injection defence) → pure JSON
4. JSON self-healing  → sanitizeJson() → JSON.parse() → repair Anthropic call if needed
5. Place enrichment   → enrichPlace() per timeline item in parallel (PlaceCache-first)
6. Transit calc       → pure Haversine (zero API calls)
7. Cost tracking      → prisma.costLog.create() — AWAITED before response
8. Return             → Response.json(itinerary)
```

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
  dietary:             z.array(z.enum([...])).max(7),
  interests:           z.array(z.enum([...])).max(10),
  accommodationStatus: z.enum(["needed", "booked"]).optional(),
  hotelName:           z.string().max(200).optional(),
  exactHotelAddress:   z.string().max(300).optional(),
  transportMode:       z.enum(["walking-transit", "car-driver"]).optional(),
  walkingTolerance:    z.enum(["strict", "relaxed"]).optional(),
});
type ItineraryRequest = z.infer<typeof ItinerarySchema>; // local to route.ts
```

`safeParse` is used — never `parse` — so errors are handled gracefully without try/catch.

> **`walkingTolerance` behaviour:** Only injected into the prompt when `transportMode !== "car-driver"`. `undefined` and `"strict"` are treated identically — safe-by-default. Rule 11 (Neighbourhood Lock — city boundary) is unchanged in both modes; only Rule 12 (consecutive stop distance) is affected.

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

### Spatial Awareness Rules (Hardcoded in `buildPrompt()`)

These rules exist to prevent geographically incoherent schedules. They are **non-negotiable** — not stylistic preferences, but guardrails against factual incoherence that breaks the map and destroys user trust.

| Rule | Behaviour Enforced |
|------|-------------------|
| **11. THE NEIGHBOURHOOD LOCK** | Branches on `transportMode`. **Walking/transit:** ALL activities for the ENTIRE TRIP must stay within the exact same city. Named counter-examples prevent hallucination (e.g. "central Antalya → do NOT suggest Aspendos, Perge, Side"). **Car/driver:** Regional day trips allowed, but consecutive stops within a day must be ≤40km apart. |
| **12. TRANSIT TIME REALITY** | Branches on `transportMode`. **Walking:** No two consecutive stops more than 20 min walk apart — replace, don't schedule. **Car:** Consecutive stops within a day must be reachable in ≤30 min by car; widen `startTime` gap if not. |
| **13. CURATED PACING** | 3–4 deeply curated, geographically clustered stops per day over raw quantity. Every stop must be exceptional and worthy of a dedicated visit. |

### `buildPrompt()` — Accommodation & Transport Injection

The prompt's CLIENT PROFILE block includes two additional lines when `accommodationStatus === "booked"`:

```
- Base Camp: {exactHotelAddress || hotelName} — use this as the geographic anchor for all activity clustering
- Mobility: {mobilityLabel}  // "Walking & Public Transit" | "Private Car / Driver"
```

Variables constructed before the prompt string:
- `baseCamp` = `exactHotelAddress ?? hotelName ?? ""` — prefers the Places-verified address over the raw name
- `mobilityLabel` = `transportMode === "car-driver" ? "Private Car / Driver" : "Walking & Public Transit"`
- `neighborhoodLockRule` — ternary string injected at Rule 11 (walking vs car wording, see table above)
- `transitTimeRule` — ternary string injected at Rule 12 (20-min walk vs 30-min car wording, see table above)

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

### Cost Tracking — `GenerationMeta` + `CostLog`

```ts
CLAUDE_INPUT_COST  = $3  / 1_000_000 tokens
CLAUDE_OUTPUT_COST = $15 / 1_000_000 tokens
GOOGLE_TEXT_SEARCH = $0.032 / call
GOOGLE_DETAILS     = $0.017 / call
```

`GenerationMeta` is **logged to server console only** — never transmitted to the client (margin protection). `prisma.costLog.create()` is **awaited** before `Response.json()`.

> **Why awaited (not fire-and-forget)?** Vercel freezes the serverless function the instant the HTTP response is returned, killing any background promise mid-flight. Awaiting guarantees financial data integrity at the cost of ~50ms (negligible vs. 10+ second generation time).

### `getDestinationPhotoUrl()` — `/trips` Dashboard Photos

```
Step 1: findplacefromtext (fields=photos) — uses MAPS_SERVER_KEY
Step 2: Constructs Places Photo URL → photoreference (no underscore)
```

Cache: `next: { revalidate: 86400 }`. Timeout: `AbortSignal.timeout(4000)`. Returns `null` on error → typographic placeholder fallback.

### AI Resilience — JSON Self-Healing

**Phase 1 — `sanitizeJson(raw: string)`** — strips markdown code fences, removes trailing commas before `}` and `]`, trims whitespace.

**Phase 2 — `JSON_REPAIR_PROMPT`** — if `sanitizeJson()` + `JSON.parse()` still throws, a second Anthropic call repairs the malformed string. If both phases fail → clean `500`. Claude's own output is never shown raw to users even if partially malformed.

### `exactHotelAddress` — Prompt Injection Hardening (2026-03-18)

`exactHotelAddress` is injected directly into the AI prompt as the spatial anchor (`baseCamp` variable). It now carries the same blocklist regex as `hotelName` in `ItinerarySchema`:

```ts
exactHotelAddress: z.string().max(300).regex(/^[^<>{}`$;\\|]+$/, "Invalid address").optional(),
```

The blocklist strategy is intentional — a whitelist approach would break valid international address characters (CJK, Arabic script, accented Latin characters, e.g. `Árpád fejedelem útja 1`).

### Transit Display — UI Mode-Aware (2026-03-18)

`TransitHeader` (inside `ItineraryViewer.tsx`) now accepts a `transportMode` prop threaded from `sessionStorage` → `ItineraryViewer` → `DaySection` → `TransitHeader`. It renders only the contextually relevant time:

- `walking-transit` → walking minutes displayed only
- `car-driver` → driving minutes displayed only

Both values are always computed by the Haversine function — only the display is filtered by mode. This fixed a UX issue where car-centric cities (e.g. Dubai) displayed 300+ minute walk times between stops that were designed to be reached by car.

---

## 9. Security Architecture

| Layer | Mechanism | Protection |
|-------|-----------|-----------|
| **Input Validation** | Zod `safeParse()` | Rejects malformed POST bodies before any AI/DB call |
| **Prompt Injection** | `SYSTEM_PROMPT` as `system` parameter | Model ignores instructions embedded in user-supplied fields |
| **Rate Limiting** | Upstash `slidingWindow(10, "1 h")` | Protects Anthropic wallet — 429 with `X-RateLimit-*` headers |
| **API Key Split** | `NEXT_PUBLIC_` vs `MAPS_SERVER_KEY` | Server key never reaches browser |
| **IDOR Prevention** | `findUnique` + `userId` ownership check | Neutral `notFound()` for missing AND unauthorized |
| **Admin Route** | `notFound()` (not `redirect`) | Route existence not leaked to non-admin users |
| **HTTP Headers** | `next.config.mjs` `headers()` | `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy |
| **Cron Security** | `Authorization: Bearer <CRON_SECRET>` | Cleanup route returns 401 for all other callers |
| **`/api/trips` Guard** | Clerk `userId` required | `401` if absent; data always scoped to `{ where: { userId } }` |

> No `Content-Security-Policy` — would break Google Maps JS SDK + Clerk. No `Strict-Transport-Security` — Vercel enforces HTTPS at the edge.

### Security Audit Baseline — 2026-03-18

A 33-point system audit was completed confirming all 9 security fixes are intact. Additional hardening applied in the same session:

| Layer | Mechanism | Protection |
|-------|-----------|-----------|
| **Delete Ownership** | `findUnique` + `deleteMany({ id, userId })` | Neutral 404 for missing AND wrong-owner; atomic DB-level enforcement eliminates TOCTOU window between read-check and delete |
| **Address Injection** | Blocklist regex on `exactHotelAddress` | Prevents prompt injection via Google Places-sourced address strings injected into AI prompt |
| **Duplicate Logging** | Consolidated outer `catch` discriminator | Single structured log per error event; removed unconditional pre-discriminator `console.error` |

All 9 original findings verified as resolved across 33 audited feature points. No regressions introduced by subsequent changes.

---

## 10. Monetization — Interactive Affiliate Stays

### Strategy

Hotel data is generated **upfront in the single AI call** — consistent with the Zero-Latency Principle. The AI produces exactly **6 `recommendedStays`** entries:

| Tier | Count | `rating` | `priceTier` |
|------|-------|----------|-------------|
| Ultra-luxury | 2 | `5` | `"$$$$$"` |
| Premium | 2 | `4` | `"$$$$"` |
| Boutique | 2 | `3` | `"$$$"` |

### `<InteractiveStays>` Component

`src/components/InteractiveStays.tsx` — `"use client"`. Receives all 6 hotels as props and filters locally using `useState` — zero network calls, works offline.

```tsx
// Backward-compat: old saved trips have no `rating` field — skip slider, show first 2
const hasRatings = stays.some(s => s.rating !== undefined);
const filtered   = hasRatings
  ? stays.filter(s => s.rating === minRating).slice(0, 2)
  : stays.slice(0, 2);
```

Slider: `<input type="range" min={3} max={5} step={1}>`. Cards cross-fade via `AnimatePresence mode="wait"` keyed by `minRating`. Section is `print:hidden`.

### `createAffiliateUrl()`

```ts
// src/lib/affiliate.ts — AID 4013143 is the Seek Wander affiliate account
export function createAffiliateUrl(hotelName: string, destination: string): string {
  const query = encodeURIComponent(`${hotelName} ${destination}`);
  return `https://www.booking.com/searchresults.html?ss=${query}&aid=4013143`;
}
```

All hotel links must use this utility — **never construct Booking.com URLs manually.**

### `StayCard.tsx`

- `motion.a` pointing to `createAffiliateUrl()` result
- `target="_blank" rel="noopener noreferrer"` — always
- `whileHover={{ y: -2 }}` lift effect, `ArrowUpRight` CTA icon with `group-hover:translate` nudge

### Accommodation Branching

`CurationForm` collects `accommodationStatus: "needed" | "booked"`, `hotelName`, `exactHotelAddress`, and `transportMode`:

- **`"needed"`** → Claude generates `recommendedStays[]` (6 hotels across 3 tiers). No hotel anchor injected into prompt.
- **`"booked"`** → Hotel input (Google Places Autocomplete, `types: ["lodging"]`) captures two values:
  - `hotelName` — the place name (e.g. "The Ritz-Carlton, Tokyo")
  - `exactHotelAddress` — Places-verified `formatted_address` (e.g. "1-9-1 Akasaka, Minato City, Tokyo") — used as the geographic spatial anchor in the AI prompt (`baseCamp` variable)

**"Getting Around" selector** (shown only when `accommodationStatus === "booked"`):
- `TrainFront` icon → `"walking-transit"` — triggers strict Neighbourhood Lock (city boundary only, 20-min walk max between stops)
- `Car` icon → `"car-driver"` — allows regional day trips; consecutive stops within a day must be ≤40km / ≤30 min drive

> **Icon note:** `FootprintsIcon` does **not** exist in lucide-react. Always use `TrainFront` for the walking option — using any other icon name will cause a compile error.

---

## 11. PWA & Offline Architecture

### Service Worker (`src/app/sw.ts` — Serwist)

| Strategy | Applied To | TTL / Cap |
|----------|-----------|-----------|
| `CacheFirst` | Google Places photo URLs | 30-day TTL, 100-entry cap |
| `defaultCache` | Next.js static assets (JS, CSS, fonts) | — |

Disabled in `development` to prevent stale caches. Source: `src/app/sw.ts` → compiled to `public/sw.js` by `withSerwist()` in `next.config.mjs`.

**`src/app/manifest.ts`** — Name: `"Seek Wander"` (no "AI"). Standalone display, `#F6F1EB` background, `#1B1817` theme color. Icons at `/icon-192x192.png` and `/icon-512x512.png`.

**`src/app/layout.tsx`** — `appleWebApp: { capable: true, statusBarStyle: "default", title: "Seek Wander" }`.

### The `seek_wander_archive` — Offline Vault

`src/hooks/useOfflineTrips.ts` — two-phase data strategy used by `TripsClient.tsx`:

```
Phase 1 — navigator.onLine check
  → false: load from localStorage("seek_wander_archive") immediately, set isOffline: true, skip fetch

Phase 2 — /api/trips fetch (Clerk-authed GET)
  → success: update state + persist to localStorage
  → failure: load from localStorage fallback, set isOffline: true
```

**Cache key:** `seek_wander_archive` — stores `CachedTrip[]` as JSON including `itineraryData` for editorial preview text.

**`TripsClient.tsx`** — the `"use client"` boundary for `/trips`. Owns data fetching, offline banner (`bg-ink text-paper WifiOff`), loading state, and trip grid.

### `/api/trips` Route

```ts
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

> **Why client-side fetch (not server-side)?** `getDestinationPhotoUrl()` uses `MAPS_SERVER_KEY` (server-only). The `/api/trips` route resolves photo URLs server-side and serialises them. `TripsClient` gets pre-resolved URLs — no client-side key exposure.

---

## 12. Admin Dashboard (`/admin/metrics`)

Internal BI page — access controlled by `ADMIN_USER_ID` env var.

**KPI cards:** Total Spent · Total Generations · Avg Cost / Trip · Cache Hit Rate (`cacheHits / (cacheHits + cacheMisses)`)

**Cost split section:** Claude vs Google with per-trip averages.

**Generation log table:** Last 200 rows, newest first. Cost colour-coding: green < $0.15, amber > $0.50. Cache column: `{hits}/{hits+misses}`.

---

## 13. Automated Garbage Collection — Vercel Cron

**Route:** `GET /api/cron/cleanup` | **Schedule:** `"0 0 * * *"` (daily midnight UTC) — `vercel.json`

```ts
const fourteenDaysAgo = new Date();
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
await prisma.placeCache.deleteMany({ where: { updatedAt: { lt: fourteenDaysAgo } } });
```

`PlaceCache.updatedAt` uses Prisma `@updatedAt` — auto-refreshed on every upsert. Recently accessed records (cache hits) stay alive.

> **Performance (2026-03-18):** `@@index([updatedAt])` has been added to `PlaceCache` in `schema.prisma` and synced to Supabase. The nightly `deleteMany` query is now an indexed range scan — O(log n) — rather than a sequential full-table scan — O(n).

---

## 14. UX & Polish Layer

### Sonner Notification System

```tsx
<Toaster
  position="bottom-right"
  expand={false}
  richColors
  toastOptions={{
    style: {
      background: "#F5F0E8",  border: "1px solid rgba(10,10,10,0.1)",
      color: "#0A0A0A",       borderRadius: "0",
      fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      fontSize: "0.8125rem",
    },
  }}
/>
```

**Generation lifecycle** — all three share `id: "curate-task"` so Sonner mutates the same toast in place:

```ts
toast.loading("Consulting the concierge…",  { id: "curate-task" })
toast.success("Itinerary Prepared",          { id: "curate-task", description: "…" })
toast.error("Concierge Busy",               { id: "curate-task", description: "…" })
```

**Save action** (independent toasts — no shared ID):
```ts
toast.success("Passport Updated", { description: "This journey has been saved to your archive." })
toast.error("Save Failed",        { description: "Unable to save this journey. Please try again." })
```

### `GenerationLoader.tsx` — "Concierge at Work"

- Thin ring: static `border-ink/10` track + rotating `border-t-ink/40` arc (`animationDuration: 2.4s linear`)
- `STEPS` array (5 items) cycles via `setInterval(3500ms)` + `useState(stepIndex)`
- `AnimatePresence mode="wait"` — `initial={{ opacity: 0, y: 10 }}` / `exit={{ opacity: 0, y: -10 }}` / `transition={{ duration: 0.8, ease: "easeInOut" }}`
- Persistent sub-label: `"This takes around 15–20 seconds"`

### `UnauthenticatedState.tsx` — "The Velvet Rope"

Replaces `redirect("/")` on `/trips` for unauthenticated users:
- `Lock` icon (`strokeWidth={1}`), `"Private Access"` micro-copy kicker, `"Your passport awaits."` serif headline
- `<SignInButton mode="modal">` styled as `bg-ink text-paper hover:bg-burnt-orange`
- **Why modal?** No `/sign-in` page exists. Auth is modal-only throughout the app.

### `EmptyTripsState.tsx` — Inspiration Hub

- **Section A:** `Compass` icon, `"Your passport is currently blank."` serif headline, CTA to `/`
- **Section B:** 3-column `CARDS` grid (editorial destination teasers), staggered `delay: 0.3 + i * 0.08`

### Mobile Navigation — CSS Stacking Context Fix

**Bug:** `MobileMenu.tsx` overlay appeared transparent — text camouflaged into background hero images.

**Root cause:** `Navbar.tsx` applies `backdrop-blur-sm`. `backdrop-filter` creates a new CSS stacking context. Any `fixed`-positioned descendant is anchored to that ancestor (~64px navbar height), not the viewport.

**Fix:** `createPortal(overlay, document.body)` in `MobileMenu.tsx`. SSR guard: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`.

**Critical implementation detail:** The overlay must use `initial={{ opacity: 1 }}` (not `0`) and an **inline hex background fallback** to prevent a transparent flash before Tailwind paints:

```tsx
return createPortal(
  <motion.div
    initial={{ opacity: 1 }}                     // ← NOT 0 — prevents transparent flash over hero images
    style={{ backgroundColor: "#F5F0E8" }}        // ← inline hex fallback — Tailwind class may not apply before paint
    className="fixed inset-0 z-50 bg-paper flex flex-col"
  >
    {/* ... */}
  </motion.div>,
  document.body
);
```

> **Rule for all future overlays:** Any `fixed`-positioned full-screen overlay inside a component using `backdrop-filter`, `transform`, `filter`, `will-change`, or `perspective` **must** use `createPortal(…, document.body)`.

---

## 15. PDF / Print Export

Zero-dependency — `window.print()` + Tailwind `print:` modifiers. No libraries.

- **`<ExportPdfButton />`** — `window.print()` on click, `print:hidden` on itself
- **`globals.css`** — `@media print`: resets Framer Motion inline `opacity` (`[style*="opacity"] { opacity: 1 !important }`), resets transforms, forces color printing, `@page { margin: 1.5cm 2cm }`
- **`trips/[id]/page.tsx`** — outer wrapper: `print:h-auto print:overflow-visible print:block`. Branded dossier header (`hidden print:block`): Seek Wander wordmark, destination, date. Navbar + maps + header strip are `print:hidden`
- **`ItineraryViewer.tsx`** — tab bar `print:hidden`. `hidden print:block` section renders all days sequentially with `print:break-before-page` on days 2+. `bottomSection` is `print:hidden`
- **`InteractiveStays`** — `print:hidden` (affiliate section excluded from PDF)

---

## 16. Public Sharing — `/shared/[id]`

- Server component. **Intentionally NO auth check** — public by design. Fetches by ID only.
- `generateMetadata()` → dynamic OG tags: `{destination} Itinerary | Seek Wander`
- Ink acquisition banner: "Curated by Seek Wander — Create Your Own →"
- Mobile sticky CTA: `fixed bottom-0 z-40 bg-burnt-orange`
- **`<ShareButton>`** — `navigator.share()` first (mobile native), falls back to `navigator.clipboard.writeText()`. AnimatePresence toast: "Link copied to clipboard"

---

## 17. Open Graph & Social Metadata

### Global defaults (`src/app/layout.tsx`)

```ts
title: {
  default:  "Seek Wander | Bespoke AI Travel Curation",
  template: "%s | Seek Wander",
},
openGraph: { type: "website", siteName: "Seek Wander", … },
twitter:   { card: "summary_large_image", … },
```

### Per-trip dynamic OG (`trips/[id]/page.tsx` — `generateMetadata()`)

- **Title:** `"{destination} | Curated by Seek Wander"` (full string — not `%s` template)
- **Description:** `editorial.split(/\.\s+/)[0]?.trim()` — Vogue opener becomes the social card tagline
- **og:image:** `getDestinationPhotoUrl(destination)` — gracefully omitted if null; `twitter:card` degrades to `"summary"` when no image
- **No auth in `generateMetadata`** — Clerk session unavailable there. The page component enforces full auth + IDOR ownership check separately.

---

## 18. Auth Architecture (Clerk v6)

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
  children    // keyless mode — app builds and renders without Clerk keys
)}
```

### Navbar Auth (`src/components/NavbarAuth.tsx`)

- Loaded via `next/dynamic(..., { ssr: false })` in `Navbar.tsx`
- Uses `<SignedOut>` / `<SignedIn>` (Clerk v6 API — **NOT `<Show>`**)
- `<SignInButton mode="modal">` — no redirect pages needed
- `<UserButton>` with `appearance.elements.avatarBox: "w-8 h-8"`

### Route Auth Model

| Route | Auth Model |
|-------|-----------|
| `/trips` | `auth()` + `redirect('/')` if no userId |
| `/trips/[id]` | `auth()` + ownership check + `notFound()` if unauthorized |
| `/admin/metrics` | `auth()` + `ADMIN_USER_ID` match + `notFound()` if unauthorized |
| `saveTrip` server action | `auth()` + throws if no userId |
| `/itinerary` | Save button gated by `<SignedIn>`; page itself is public |
| `/shared/[id]` | **Intentionally public — no auth** |
| `DELETE /api/trips/[id]` | `auth()` + neutral-404 ownership check + `deleteMany({ id, userId })` | `401` if unauthenticated; `404` (identical for missing AND wrong-owner, no info leak); `200 { success: true }` on confirmed deletion |

### `DELETE /api/trips/[id]` — Ownership Enforcement Detail (2026-03-18)

**File:** `src/app/api/trips/[id]/route.ts`

Three-layer security model enforced in sequence:

1. `await auth()` → 401 if no `userId`
2. `prisma.trip.findUnique({ where: { id } })` → neutral `404` if missing OR `trip.userId !== userId` (identical response — no existence leak)
3. `prisma.trip.deleteMany({ where: { id, userId } })` → atomic DB-enforced ownership; a compound constraint means ownership is verified at the database layer even if the read in step 2 were somehow stale (eliminates TOCTOU race window)

**Client-side state sync:** `useOfflineTrips.deleteTrip(id)` filters the trip from React state and writes the updated array to `localStorage("seek_wander_archive")` atomically inside the `setTrips` callback — no divergence window between in-memory state and the cache.

**Detail-page deletion (`DeleteTripButton.tsx`):** After confirmed deletion, proactively prunes the localStorage archive, then calls `router.push("/trips")` — preventing a server-side `notFound()` if the user stays on the now-deleted route.

---

## 19. AI Prompt Convention

Model: `claude-sonnet-4-6` | Max tokens: `8192`

The model receives a fixed `SYSTEM_PROMPT` (injection defence) plus a `buildPrompt()` user message. The system prompt locks role, format, and schema. The user message contains the curated client profile.

Each response is a `timeline[]`-based JSON itinerary with:
- Vogue-style editorial opener (≤25 words)
- Days with poetic theme title + honest pace rating
- `timeline[]` items ordered by `startTime` — activities AND meals interwoven
- 1–2 real restaurant meals per day with real GPS coordinates
- 1 hidden gem per day (95% of tourists never find it)

Response is **always pure JSON** — no markdown, no preamble. Never mention AI in output copy.

---

## 20. CurationForm Fields (10 total)

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
| 8 | Accommodation Status | "Need a hotel" / "Already booked" pills | Unlocks fields 9 & 10 when "booked" |
| 9 | Hotel Name | Google Places Autocomplete (`types: ["lodging"]`) | Captures `hotelName` (place name) + `exactHotelAddress` (Places-verified `formatted_address`) |
| 10 | Getting Around | `TrainFront` icon = walking-transit / `Car` icon = car-driver | Controls Neighbourhood Lock strictness in AI prompt; `FootprintsIcon` does **not** exist in lucide-react |
| 10a | Walking Tolerance | Two pills: "Short walks" / "Explorer pace" — visible only when walking-transit is selected | `AnimatePresence` fade-in below Field 10; resets to `"strict"` when user switches to Car; omitted from POST body when `transportMode === "car-driver"` |

---

## 21. Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core Engine | ✅ Complete | UI + Google Maps + Anthropic AI, no auth |
| 2 — Concierge UX | ✅ Complete | 7-field intake form, split-screen results, Google enrichment, Haversine transit |
| 3 — Ultra-Luxury UI | ✅ Complete | Tabbed day nav, hoursOpen, cost badges, dashed transit connectors, day-centric map |
| 4 — Auth | ✅ Complete | Clerk v6 integration, conditional ClerkProvider, NavbarAuth, custom 404 |
| 5 — Persistence & Dynamic Routes | ✅ Complete | Prisma + Supabase, saveTrip server action, /trips archive, /trips/[id] viewer, ItineraryViewer composition, IDOR enforcement |
| 6 — PWA, Sharing & Export | ✅ Complete | @serwist/next PWA, manifest.ts, public /shared/[id] with OG tags & acquisition banners, ShareButton, PDF/print export |
| 7 — Chronological Timeline | ✅ Complete | timeline: TimelineItem[] canonical shape; normalizeDayPlan() backward-compat shim; isMealType() + computeMapPoints() in itineraryUtils.ts |
| 8 — Margin Protection & Observability | ✅ Complete | PlaceCache 30-day TTL cache-first enrichment; Haversine transit; parseOpenNow() local; CostLog Decimal(10,6); /admin/metrics (ADMIN_USER_ID gated); Vercel Cron daily cleanup; Zod; SYSTEM_PROMPT injection defence; HTTP security headers; Google API key split |
| 9 — Affiliate Monetization | ✅ Complete | Booking.com AID 4013143; createAffiliateUrl(); StayCard; accommodation branching (needed/booked); recommendedStays[] in ItineraryResponse |
| 10 — UX & Polish | ✅ Complete | GenerationLoader; Sonner toast layer; UnauthenticatedState "Velvet Rope"; EmptyTripsState Inspiration Hub; MobileMenu createPortal fix |
| 11 — Mobile, Offline & Resilience | ✅ Complete | useOfflineTrips + TripsClient (localStorage seek_wander_archive); /api/trips GET; Upstash rate limiting (10/hr); AI JSON self-healing; dynamic OG metadata |
| 12 — Interactive Stays + Spatial AI | ✅ Complete | InteractiveStays slider (6-hotel pool, 3 tiers, offline-capable); Neighbourhood Lock / Transit Reality / Curated Pacing rules (transport-mode branching) in buildPrompt(); semantic SVG activity icons in ItineraryMap (getIconSvg/buildSvgMarker); hotel Places Autocomplete + exactHotelAddress spatial anchor; transportMode selector (TrainFront/Car); TimelineCard extracted to dedicated component |
| 13 — Stripe Paywall | 🔜 Next | $4.99 paywall — free tier: 1 generation; paid: unlimited |
| 14 — Security Hardening & Trip Deletion | ✅ Complete | 33-point security audit (all 9 findings resolved); PlaceCache `photoReference` migration (API key rotation resilience); `exactHotelAddress` blocklist regex (prompt injection hardening); `DELETE /api/trips/[id]` with neutral-404 IDOR guard and atomic `deleteMany({ id, userId })`; `DeleteDialog` Framer Motion portal with Escape/backdrop dismiss; `useOfflineTrips.deleteTrip()` with atomic localStorage sync; transit `TransitHeader` UI mode-aware display (fixes car-centric cities e.g. Dubai); `PlaceCache @@index([updatedAt])` for O(log n) cron cleanup; duplicate logging consolidated |

---

## 22. Engineering Changelog

### 2026-03-18 — Security Hardening & Trip Deletion

**Commit:** `b93b421` · **Branch:** `main`

---

#### Security Audit — 33-Point Baseline

A comprehensive line-by-line audit of all 33 codebase features was completed. All 9 security findings (CRITICAL through LOW) confirmed resolved. The full audit is documented in `SeekWander_SecurityAudit_2026-03-19.pdf` (architect handover).

---

#### PlaceCache — `photoReference` Architecture

**Problem:** `PlaceCache.photoUrl` stored full Google Places photo URLs including `key=<MAPS_SERVER_KEY>`. API key rotation immediately invalidated all cached images, causing 403 errors site-wide.

**Fix:**
- New `photoReference String?` column stores the raw `photo_reference` token (key-independent).
- Photo URL is constructed fresh at serve time: `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${ref}&key=${currentKey}`.
- Old-format detection: `isOldFormat = !cached?.photoReference && !!cached?.photoUrl` — stale records expire naturally on next cache miss; no manual migration.
- `@@index([updatedAt])` added — nightly cron `deleteMany` is now an indexed range scan.
- Schema synced: `export $(grep -v '^#' .env.local | xargs) && npx prisma db push` (Prisma v5.22.0, Supabase PostgreSQL).

---

#### Input Validation Hardening

- `exactHotelAddress` validated with blocklist regex `/^[^<>{}`$;\\|]+$/` in `ItinerarySchema` — identical strategy to `hotelName`. Blocks shell metacharacters and prompt-injection control chars; permits all valid international address characters.
- Whitelist approach tested and rejected: `\w` is ASCII-only, breaking Arabic script, accented Latin characters, and curly quotes returned by Google Places.

---

#### Destination Name Fix

`CurationForm.onPlaceChanged` priority changed from `formatted_address || name` to `name || formatted_address`. Google Places `formatted_address` returns bilingual strings for non-Latin cities (e.g. `"Istanbul, İstanbul, Türkiye"`). Using `name` returns the clean, unambiguous city name.

---

#### Transit Display — UI Mode-Aware

`TransitHeader` component updated to accept `transportMode?: "walking-transit" | "car-driver"` prop, threaded through the component tree: `sessionStorage` → `itinerary/page.tsx` → `ItineraryViewer` → `DaySection` → `TransitHeader`.

- `walking-transit`: walking minutes displayed, driving minutes hidden.
- `car-driver`: driving minutes displayed, walking minutes hidden.

Root cause: Dubai itineraries displayed 300+ minute walk times between stops deliberately planned for private car travel. Both time values are always Haversine-computed — only the display is mode-filtered.

---

#### Logging Consolidation

Removed unconditional `console.error("[itinerary/route]", e)` from the outer `catch` block in `api/itinerary/route.ts`. Every error was being logged twice — once raw at line 634, then again with a structured label at lines 637 or 639. The discriminated `if (e instanceof SyntaxError)` block now handles all logging with a single, structured event per error.

---

#### Secure Trip Deletion — Full Stack

**New file:** `src/app/api/trips/[id]/route.ts`

Security model (three layers):
1. `await auth()` → 401 if unauthenticated
2. `findUnique` + `trip.userId !== userId` → neutral 404 (identical for missing and wrong-owner — no existence leak)
3. `deleteMany({ where: { id, userId } })` → DB-level ownership enforcement, eliminates TOCTOU window

**`useOfflineTrips` hook:**
- `readCache()` / `writeCache()` promoted from closure scope to module scope — required for `deleteTrip` to access them outside `useEffect`.
- `deleteTrip(id: string): Promise<void>` — calls `DELETE /api/trips/${id}`, filters state via `setTrips(prev => prev.filter(...))`, writes updated array to localStorage atomically inside the `setTrips` callback (prevents cache/state divergence race).

**`TripsClient.tsx`:**
- Each trip card gains a `Trash2` "Remove" action alongside "View Itinerary" and "Share".
- `DeleteDialog` — `createPortal(…, document.body)` Framer Motion overlay. Features: Escape key close, backdrop click dismiss, `disabled` button during in-flight request, `Loader2` spinner, `AnimatePresence` enter/exit animations.
- Trip cards upgraded to `motion.article` with `exit={{ opacity: 0, scale: 0.98 }}` for smooth removal from the grid.

**`DeleteTripButton.tsx` (new standalone component):**
- Used on `/trips/[id]` detail page header strip, alongside `ExportPdfButton`.
- Shares the same `DeleteDialog` design pattern.
- On success: proactively prunes `seek_wander_archive` from localStorage, then `router.push("/trips")` — prevents the user landing on a server-side `notFound()` after deletion.
- `print:hidden` — excluded from PDF export.

---

### 2026-03-19 — `walkingTolerance` Field

**Commit:** pending · **Branch:** `main`

#### Problem

The Neighbourhood Lock applied a single hard-coded 20-minute walking rule to all walking-transit users. Urban explorers who are happy to cover more ground within the city had no way to express that preference, leading to itineraries that were artificially compressed into a single neighbourhood.

#### Solution

A new optional enum field `walkingTolerance: "strict" | "relaxed"` branches Rule 12 (Transit Time Reality) in `buildPrompt()`. Rule 11 (city boundary) is unchanged in both modes.

| Value | Rule 12 injected into prompt | Default? |
|-------|------------------------------|----------|
| `"strict"` (or `undefined`) | Max 1.5km / 20-min walk between consecutive stops | ✅ Yes |
| `"relaxed"` | Up to 4km / 45-min walk; adjacent-neighbourhood exploration permitted | No |

#### Files changed

| File | Change |
|------|--------|
| `src/types/itinerary.ts` | Added `walkingTolerance?: "strict" \| "relaxed"` to `ItineraryRequest` |
| `src/app/api/itinerary/route.ts` | Added `walkingTolerance` to `ItinerarySchema`; updated `transitTimeRule` ternary in `buildPrompt()` |
| `src/app/itinerary/page.tsx` | Added `walkingTolerance` to `StoredRequestSchema` (client-side re-validation) |
| `src/components/CurationForm.tsx` | Added `walkingTolerance` state (default `"strict"`); added `AnimatePresence` sub-option below Field 10; Car button resets tolerance to `"strict"`; field omitted from POST when `transportMode === "car-driver"` |

#### Security

- Validated by Zod enum before reaching `buildPrompt()` — invalid values return `400` before any AI call.
- Field is an enum, not free-text — prompt injection impossible.
- Security fixes #1–#9 unaffected — no changes to auth, ownership, rate limiting, or PlaceCache.
