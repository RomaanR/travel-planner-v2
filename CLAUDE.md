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
| PWA | **@serwist/next + serwist** — service worker, offline caching, installable |

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

# Google Maps (NEXT_PUBLIC_ required for client-side)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=         # Google Cloud Console → Maps JavaScript API + Places API
                                         # NOTE: Must have NO HTTP referrer restrictions for server-side use

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=       # dashboard.clerk.com → API Keys
CLERK_SECRET_KEY=                        # dashboard.clerk.com → API Keys

# Database (Supabase)
DATABASE_URL=                            # Supabase → Project Settings → Database → Connection string (port 6543, PgBouncer pooled)
DIRECT_URL=                              # Supabase → Project Settings → Database → Connection string (port 5432, direct — required by Prisma)
```

> **Clerk keyless mode:** If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, `<ClerkProvider>` is skipped entirely (conditional in `layout.tsx`). The app renders and builds correctly without Clerk keys.

> **Supabase dual URLs:** `DATABASE_URL` uses PgBouncer (port 6543) for runtime queries. `DIRECT_URL` uses a direct connection (port 5432) required by Prisma for schema introspection and `db push`. Both must be set in `.env.local`.

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
│   │   └── itinerary/
│   │       └── route.ts        # POST — AI generation + Google enrichment pipeline (timeline schema)
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
│   ├── CurationForm.tsx        # 7-field concierge intake (staged inline expansion)
│   ├── SearchBar.tsx           # Google Places Autocomplete (legacy, not in main flow)
│   ├── BentoGrid.tsx           # 12-col editorial grid
│   ├── ItineraryMap.tsx        # Google Map — day-centric SVG markers + polyline + legend (unchanged by timeline refactor)
│   └── ItineraryViewer.tsx     # Client component — editorial opener, tabbed days, TimelineCard, DaySection, TransitHeader, print all-days section
├── middleware.ts               # Clerk middleware — all routes public
├── hooks/
│   └── useItinerary.ts         # Client-side fetch + state for live itinerary generation
├── lib/
│   ├── db.ts                   # Prisma singleton — prevents multiple clients in dev hot-reload
│   ├── getPlacePhoto.ts        # getDestinationPhotoUrl() — Google Places photo for /trips cards
│   └── itineraryUtils.ts       # Shared runtime helpers: normalizeDayPlan(), isMealType(), computeMapPoints()
├── app/actions/
│   └── saveTrip.ts             # Server action — auth-gated Prisma trip.create
└── types/
    └── itinerary.ts            # Shared TypeScript types ONLY — no runtime functions
```

```
prisma/
└── schema.prisma               # Trip model — id, userId, destination, days, itineraryData (Json), createdAt
```

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

Three exported functions:

1. **`normalizeDayPlan(day: DayPlan): DayPlan`** — Backward-compat shim. Checks `Array.isArray(day.timeline)` — if false, synthesizes `timeline[]` from the legacy `morning`/`afternoon`/`evening`/`dining` fields. Old DB records render correctly with zero migration. Called at the top of `DaySection` in `ItineraryViewer`.

2. **`isMealType(type: TimelineItemType): boolean`** — Returns `true` for breakfast/lunch/dinner/snack/drinks.

3. **`computeMapPoints(days: DayPlan[]): MapPoint[]`** — Converts itinerary days to `MapPoint[]`. Calls `normalizeDayPlan()` internally, handles both old and new records. Used server-side in `trips/[id]` and `shared/[id]`, and client-side via `useMemo` in `itinerary/page.tsx`.

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

### Prisma — Trip Model
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
```

> **Vercel Deployment:** `package.json` includes `"postinstall": "prisma generate"` so Vercel regenerates the Prisma client with the correct Linux binary after `npm install`. This is the only Vercel-specific Prisma config needed.

### ItineraryRequest (POST body)
```ts
type ItineraryRequest = {
  destination: string    // "Kyoto, Japan"
  placeId: string        // Google Place ID
  lat: number
  lng: number
  departureDate: string  // ISO "YYYY-MM-DD"
  returnDate: string     // ISO "YYYY-MM-DD"
  duration: number       // computed from date diff, clamped 1–5
  travelParty: 'solo' | 'couple' | 'family' | 'group'
  pace: 'relaxed' | 'moderate' | 'packed'
  budgetTier: 'premium' | 'luxury' | 'ultra-luxury'
  dietary: DietaryOption[]
  interests: Interest[]
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
1. **AI generation** — `claude-sonnet-4-6` produces pure JSON with `timeline[]` per day
2. **Place enrichment** — `enrichPlace()` called for each `timeline` item in parallel
3. **Transit calculation** — `getDayTransits()` called per day across all timeline stops

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

### `enrichPlace()` — Two-step Google API chain
```
Step 1: Places Text Search (textsearch/json)
  → Returns: photoUrl, rating, reviewCount, openNow, priceLevel, place_id

Step 2: Place Details (details/json?fields=opening_hours)  ← only if place_id found
  → Returns: weekday_text → extracts today's hours
  → todayIdx = (new Date().getDay() + 6) % 7  (Monday=0)
  → strips "Monday: " prefix → "9:00 AM – 9:00 PM"
```
Both steps wrapped in `AbortSignal.timeout()` (5000ms / 4000ms). All errors return `null` gracefully.

> **Critical:** The photo URL query parameter is `photoreference` (no underscore). Using `photo_reference` silently returns a broken redirect.

### Transit Calculation — Haversine + Distance Matrix
```
Haversine baseline (always computed, guarantees transit UI renders):
  walkingMinutes  = round((km / 5)  * 60)   // 5 km/h walking
  drivingMinutes  = round((km / 25) * 60)   // 25 km/h city driving

Distance Matrix override (best-effort, replaces Haversine if API succeeds):
  mode=walking + mode=driving via Promise.allSettled
```

### `getDestinationPhotoUrl()` — `/trips` Dashboard Photos (`src/lib/getPlacePhoto.ts`)
```
Step 1: findplacefromtext (fields=photos)
Step 2: Constructs Places Photo URL → photoreference (no underscore)
```
Cache: `next: { revalidate: 86400 }`. Timeout: `AbortSignal.timeout(4000)`. Returns `null` on error → typographic placeholder fallback.

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
- `saveTrip` server action — `auth()` + throws if no userId
- `/itinerary` — save button gated by `<SignedIn>`; page itself is public
- `/shared/[id]` — **intentionally public, no auth**

---

## AI Prompt Convention

Model: `claude-sonnet-4-6` | Max tokens: `8192`

The model is instructed to act as an elite luxury travel curator (Condé Nast Traveller × private concierge). Each response is a `timeline[]`-based JSON itinerary with:
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
| 6 — PWA, Sharing & Export | **Complete** | @serwist/next PWA, manifest.ts (brand "Seek Wander", no AI), public /shared/[id] with OG tags & acquisition banners, ShareButton, PDF/print export with Tailwind print: modifiers |
| 7 — Chronological Timeline | **Complete** | timeline: TimelineItem[] canonical shape; normalizeDayPlan() backward-compat shim in itineraryUtils.ts; isMealType() + computeMapPoints() co-located in itineraryUtils.ts; no DB migration needed |
| 8 — Monetization & Cost Optimisation | **Next** | **Option A:** Supabase `PlaceCache` table — cache Google Places API responses by place name + city, eliminating repeat enrichment API calls (saves ~$0.64/itinerary on repeat destinations). **Option B:** Stripe Checkout — $4.99 paywall for itinerary generation (free tier: 1 generation; paid: unlimited). Both can be pursued sequentially. |
