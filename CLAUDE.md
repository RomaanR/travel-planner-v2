# CLAUDE.md — Luxury AI Travel Curation Platform

> **Permanent project memory. Update this file whenever architecture decisions change.**

## Project Identity

**Vogue meets National Geographic.** Expensive, minimalist, editorial.
Every component must feel like it belongs in a high-end print magazine or luxury brand lookbook.
This is not a travel app — it is a digital concierge.

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
│   ├── globals.css             # Base styles, CSS custom properties
│   ├── manifest.ts             # Next.js PWA manifest — name, icons, standalone display, brand colors
│   ├── sw.ts                   # Serwist service worker — precache + Google Places photo CacheFirst (30d)
│   ├── api/
│   │   └── itinerary/
│   │       └── route.ts        # POST — AI generation + Google enrichment pipeline
│   ├── itinerary/
│   │   └── page.tsx            # Client component — split-screen live results (55% timeline + 45% map)
│   └── trips/
│       ├── page.tsx            # Server component — user archive dashboard (/trips)
│       └── [id]/
│           └── page.tsx        # Server component — dynamic saved trip viewer (/trips/[id])
├── components/
│   ├── Navbar.tsx              # Fixed nav — wordmark, MY TRIPS link, dynamic NavbarAuth
│   ├── NavbarAuth.tsx          # Clerk auth (ssr:false) — SignInButton modal + UserButton
│   ├── CurationForm.tsx        # 7-field concierge intake (staged inline expansion)
│   ├── SearchBar.tsx           # Google Places Autocomplete (legacy, not in main flow)
│   ├── BentoGrid.tsx           # 12-col editorial grid
│   ├── ItineraryMap.tsx        # Google Map — day-centric SVG markers + polyline + legend
│   └── ItineraryViewer.tsx     # Client component — reusable itinerary display (editorial, tabs, cards)
├── middleware.ts               # Clerk middleware — all routes public
├── hooks/
│   └── useItinerary.ts         # Client-side fetch + state for live itinerary generation
├── lib/
│   ├── db.ts                   # Prisma singleton — prevents multiple clients in dev hot-reload
│   └── getPlacePhoto.ts        # getDestinationPhotoUrl() — Google Places photo for /trips cards
├── app/actions/
│   └── saveTrip.ts             # Server action — auth-gated Prisma trip.create
└── types/
    └── itinerary.ts            # Shared TypeScript types (incl. enriched fields)
```

```
prisma/
└── schema.prisma               # Trip model — id, userId, destination, days, itineraryData (Json), createdAt
```

---

## Architecture & Patterns

### Server-to-Client Composition Pattern

`ItineraryViewer.tsx` is a shared `"use client"` component that owns all itinerary display logic: the editorial opener, tabbed day navigation (`activeDay` state), `AnimatePresence` day transitions, `LocationCard`, `DaySection`, and `TransitHeader`.

It accepts a `bottomSection?: ReactNode` slot that callers use to inject page-specific CTAs without duplicating display code or adding messy conditionals inside the component:

```tsx
// itinerary/page.tsx (client) — passes save button as bottomSection
<ItineraryViewer itinerary={itinerary} bottomSection={<SaveCta />} />

// trips/[id]/page.tsx (server) — passes back-to-archive links as bottomSection
<ItineraryViewer itinerary={itinerary} bottomSection={<BackToArchiveCta />} />
```

Next.js 14 supports passing server-rendered JSX (including `<Link>`) to client components via props — this is the standard composition pattern. The slot content is rendered server-side and streamed into the client component boundary.

**Do not** move page-specific CTAs, save buttons, or navigation inside `ItineraryViewer`. Keep the component display-only; callers own their actions.

### Security — Ownership Enforcement (IDOR Prevention)

All database queries for user-owned records **must** include both the record ID and the authenticated `userId`. Fetching by ID alone allows users to enumerate other users&apos; data by guessing UUIDs (an Insecure Direct Object Reference attack).

**Correct pattern:**
```ts
// Option A — findUnique + post-fetch ownership check (used in trips/[id])
const trip = await prisma.trip.findUnique({ where: { id: params.id } });
if (!trip || trip.userId !== userId) notFound();

// Option B — findFirst with compound where (equivalent, slightly more explicit)
const trip = await prisma.trip.findFirst({ where: { id: params.id, userId } });
if (!trip) notFound();
```

Both options return a neutral `notFound()` for missing records AND wrong-owner records — the same 404 surface prevents leaking whether a resource exists.

**Never** fetch by ID alone when the resource belongs to a user: `prisma.trip.findUnique({ where: { id } })` without a `userId` check is a vulnerability.

### Server Component Auth Pattern (Clerk v6)

`/trips`, `/trips/[id]`, and `saveTrip.ts` authenticate with Clerk using `await auth()`:

```ts
// At the top of any auth-gated server component or server action:
const { userId } = await auth();   // MUST be awaited — auth() returns a Promise in Clerk v6.39+
if (!userId) redirect("/");
```

Key rules:
- **`auth()` is async and must be `await`ed** — verified against Clerk v6.39.0. The function returns a `Promise<Auth>`. Calling `auth()` without `await` destructures the Promise object itself, giving `userId = undefined` and triggering false "Unauthorized" errors.
- This applies to **all** server-side auth calls: server components, server actions, and route handlers.
- Both `/trips` and `/trips/[id]` carry `export const dynamic = "force-dynamic"` to prevent static pre-rendering of auth-gated routes.

### Prisma JSON Cast Pattern

`itineraryData` is stored as `Json` in Prisma and read back as `Prisma.JsonValue`. Cast it to the application type with a double-cast through `unknown`:

```ts
const itinerary = trip.itineraryData as unknown as ItineraryResponse;
```

Always use optional chaining when accessing fields from the cast result — the JSON may have been written by an older schema version.

### Map Points — Server-Side Computation

When rendering a saved itinerary (`trips/[id]/page.tsx`), `mapPoints` and `mapCenter` are computed in the server component from `itinerary.days` and passed directly as props to `<ItineraryMap>`. No client-side `useMemo` is needed — the computation is pure data transformation.

In the live itinerary page (`itinerary/page.tsx`), `mapPoints` is computed client-side with `useMemo` because the itinerary arrives asynchronously after the API call completes.

---

## Data Schemas

### Prisma — Trip Model
```prisma
generator client {
  provider = "prisma-client-js"
  // No explicit binaryTargets — Prisma 5 auto-detects the correct platform binary
  // via the postinstall script. Pinning targets (e.g. rhel-openssl-1.0.x) breaks
  // Vercel which now runs Amazon Linux 2023 (OpenSSL 3.x), not AL2 (OpenSSL 1.0.x).
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

> **Vercel Deployment:** Do NOT set `binaryTargets` explicitly — Vercel&apos;s serverless runtime uses Amazon Linux 2023 (OpenSSL 3.x) and pinning to `rhel-openssl-1.0.x` causes runtime crashes. Instead, Prisma 5 auto-detects the correct binary when `prisma generate` runs.
>
> `package.json` includes `"postinstall": "prisma generate"` so Vercel regenerates the Prisma client with the correct Linux binary after `npm install`. This is the only Vercel-specific Prisma config needed.

### ItineraryRequest (POST body)
```ts
type ItineraryRequest = {
  destination: string    // "Kyoto, Japan"
  placeId: string        // Google Place ID
  lat: number
  lng: number
  departureDate?: string
  returnDate?: string
  travelParty?: 'solo' | 'couple' | 'family' | 'group'
  pace?: 'relaxed' | 'moderate' | 'packed'
  budgetTier?: 'premium' | 'luxury' | 'ultra'
  dietary?: string[]
  interests?: string[]
}
```

### ItineraryResponse (AI output + enriched fields)
```ts
type Coordinate = { lat: number; lng: number }
type TransitInfo = { walkingMinutes?: number; drivingMinutes?: number }
type MapPoint = { day: number; type: MapPointType; label: string; lat: number; lng: number }

type Activity = {
  title: string
  description: string
  duration: string
  coordinates?: Coordinate
  // Enriched by Google APIs:
  photoUrl?: string
  rating?: number
  userRatingsTotal?: number
  openNow?: boolean
  hoursOpen?: string          // Today's hours, e.g. "9:00 AM – 9:00 PM"
  priceLevel?: number         // Google price_level 0–4
  transitFromPrevious?: TransitInfo
}

type DiningRec = {
  name: string
  cuisine: string
  pricePoint: string
  reservation: boolean
  coordinates?: Coordinate
  // Enriched by Google APIs:
  photoUrl?: string
  rating?: number
  userRatingsTotal?: number
  openNow?: boolean
  hoursOpen?: string
  transitFromPrevious?: TransitInfo
}

type DayPlan = {
  day: number
  theme: string
  pace: 'slow' | 'moderate' | 'immersive'
  morning: Activity
  afternoon: Activity
  evening: Activity
  hiddenGem: string
  hiddenGemCoordinates?: Coordinate
  dining: DiningRec[]
}

type ItineraryResponse = {
  destination: string
  editorial: string
  days: DayPlan[]
  mapPoints: MapPoint[]
}
```

---

## Data Pipeline (`src/app/api/itinerary/route.ts`)

### Overview
1. **AI generation** — Claude claude-sonnet-4-6 produces pure JSON itinerary
2. **Place enrichment** — `enrichPlace()` called per activity/dining rec
3. **Transit calculation** — `getDayTransits()` called per day

### `enrichPlace()` — Two-step Google API chain
```
Step 1: Places Text Search (textsearch/json)
  → Returns: photoUrl, rating, reviewCount, openNow, priceLevel, place_id

Step 2: Place Details (details/json?fields=opening_hours)  ← only if place_id found
  → Returns: weekday_text → extracts today's hours
  → todayIdx = (new Date().getDay() + 6) % 7  (Monday=0)
  → strips "Monday: " prefix, trims to "9:00 AM – 9:00 PM"
```
Both steps wrapped in `AbortSignal.timeout()` (5000ms / 4000ms). All errors return `null` gracefully — enrichment is always additive, never blocking.

### Transit Calculation — Haversine + Distance Matrix
```
Haversine baseline (always computed, guarantees transit UI renders):
  walkingMinutes  = round((km / 5)  * 60)   // 5 km/h walking speed
  drivingMinutes  = round((km / 25) * 60)   // 25 km/h city driving speed
  minimum 1 min for both

Distance Matrix override (best-effort, replaces Haversine if API succeeds):
  mode=walking  → overrides walkingMinutes
  mode=driving  → overrides drivingMinutes
  Promise.allSettled — partial success accepted
```
Transit connector between cards always renders because Haversine ensures `walkingMinutes` and `drivingMinutes` are always defined.

### `getDestinationPhotoUrl()` — `/trips` Dashboard Photos (`src/lib/getPlacePhoto.ts`)

Fetches a representative destination photo for the `/trips` archive cards. Called server-side in `trips/page.tsx` via `Promise.all`.

```
Step 1: findplacefromtext (fields=photos)
  → Extracts: candidates[0].photos[0].photo_reference

Step 2: Constructs Places Photo URL
  → https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=REF&key=KEY
```

> **Critical:** The query parameter is `photoreference` (no underscore). Using `photo_reference` (with underscore) silently returns a broken redirect. Both `enrichPlace()` in `route.ts` and `getDestinationPhotoUrl()` in `getPlacePhoto.ts` must use `photoreference`.

Caching: `next: { revalidate: 86400 }` — 24-hour cache per destination (photos rarely change).
Timeout: `AbortSignal.timeout(4000)`. Returns `null` on any error — falls back to typographic placeholder.

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
// ClerkProvider is conditional — app builds/runs without Clerk keys
{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
  <ClerkProvider>{children}</ClerkProvider>
) : (
  children
)}
```

### Navbar Auth (`src/components/NavbarAuth.tsx`)
- Loaded via `next/dynamic(..., { ssr: false })` in `Navbar.tsx`
- SSR skip prevents Clerk context errors during Next.js prerendering
- Uses `<SignedOut>` / `<SignedIn>` (Clerk v6 API — NOT `<Show>`)
- `<SignInButton mode="modal">` — no redirect pages needed
- `<UserButton>` with `appearance.elements.avatarBox: "w-8 h-8"`

### Route Auth Model
All middleware routes are public. Auth is enforced at the component/action level:
- `/trips` — server component calls `auth()` + `redirect('/')` if no userId
- `/trips/[id]` — server component calls `auth()` + ownership check + `notFound()` if unauthorized
- `saveTrip` server action — calls `auth()` + throws if no userId
- `/itinerary` — client component, save button gated by `<SignedIn>`; page itself is publicly accessible

---

## AI Prompt Convention

Model: `claude-sonnet-4-6` | Max tokens: `8192`

The AI is instructed to roleplay as an elite luxury travel curator (Condé Nast Traveller × private concierge). Each itinerary response includes:
- Vogue-style editorial opener (1 sentence capturing the soul of the destination)
- 3–5 days (scaled to trip duration), each with a poetic theme title
- Honest pace rating: `slow` (restorative) | `moderate` (balanced) | `immersive` (culturally dense)
- Morning / Afternoon / Evening activities with unique titles + coordinates
- 1 hidden gem per day (95% of tourists never find it)
- 1–2 dining recommendations per day + coordinates
- `mapPoints` array of all coordinates keyed by day number

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
| 7 | Interests | 10 options, no max cap | Replaces "Vibes" |

---

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core Engine | **Complete** | UI + Google Maps + Anthropic AI, no auth |
| 2 — Concierge UX | **Complete** | 7-field intake form, split-screen results, Google enrichment, Haversine transit |
| 3 — Ultra-Luxury UI | **Complete** | Tabbed day nav, hoursOpen, cost badges, dashed transit connectors, day-centric map |
| 4 — Auth | **Complete** | Clerk v6 integration, conditional ClerkProvider, NavbarAuth, custom 404 |
| 5 — Persistence & Dynamic Routes | **Complete** | Prisma + Supabase, saveTrip server action, /trips archive dashboard, /trips/[id] viewer, ItineraryViewer composition pattern, IDOR ownership enforcement |
| 6 — PWA & Brand | **Complete** | @serwist/next service worker, web app manifest, Apple PWA metadata, logo in navbar |
| 7 — Monetization & Growth | **Next** | PDF export, itinerary sharing (public links), booking integrations, email notifications |
