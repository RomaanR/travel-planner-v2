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
- Live activity swap / alternatives (breaks spatial coherence, requires second AI call)
- Distance Matrix API (replaced by pure Haversine — zero cost, zero latency)
- Real-time `openNow` from Google Places (replaced by `parseOpenNow()` local computation)

---

## 2. Design System — The Million-Dollar Aesthetic

### Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#F5F0E8` | Primary backgrounds — warm off-white |
| `paper-dark` | `#EDE8DC` | Card backgrounds, subtle depth |
| `ink` | `#0A0A0A` | Primary text, borders |
| `ink-light` | `#6B6B6B` | Secondary text, captions, placeholders |
| `emerald-accent` | `#059669` | Links, active states, OPEN status |
| `burnt-orange` | `#C2410C` | Primary CTA buttons, active tab indicator, CLOSED status |

### Typography

| Role | Font | Style |
|------|------|-------|
| Display headings | Cormorant Garamond (serif) | Massive, italic, tight leading |
| Body / UI | DM Sans (sans-serif) | Regular weight, comfortable spacing |
| Micro-copy / nav | DM Sans (sans-serif) | UPPERCASE, `tracking-widest`, bold |

### Non-Negotiable Component Rules

- **No border-radius anywhere** — `rounded-none` on every interactive element and card
- **Thin borders only** — `border border-black/5` or `border-b border-ink/20`
- **Framer Motion on all sections** — fade-in-up: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.6, ease: 'easeOut' }}`
- **Stagger children** — delay increments of `0.1s` per child
- **Active tab indicator** — `border-b-2 border-burnt-orange`; inactive tabs `border-b-2 border-transparent`
- **Images** — grayscale by default, full colour on hover (`filter: grayscale(100%)` → `grayscale(0%)`, `transition-all duration-700`)
- **HTML entities** — always `&apos;`, `&quot;`, `&hellip;`, `&middot;` in JSX, never raw special characters
- **Optional chaining** — always `?.` on all enriched / optional data fields

### Day-Centric Map Marker Palette

Markers are keyed by **day number**, not activity type.

| Day | Name | Fill | Stroke |
|-----|------|------|--------|
| 1 | Champagne | `#D4AF7A` | `#B8924A` |
| 2 | Slate | `#64748B` | `#475569` |
| 3 | Midnight | `#1E293B` | `#0F172A` |
| 4 | Emerald | `#059669` | `#047857` |
| 5 | Rose | `#E11D48` | `#BE123C` |

Polyline: `strokeColor: #0A0A0A`, `strokeOpacity: 0.08`, `strokeWeight: 1`

---

## 3. Tech Stack

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

> **Clerk version lock:** Always install `@clerk/nextjs@6`. Clerk v7 requires Next.js 15. The v6 API uses `<SignedIn>/<SignedOut>` — `<Show>` is v7-only and must **never** be used.

---

## 4. Security Fortress

The app has five independent security layers. Each must be preserved in all future development.

### 4a. Input Validation (Zod)

All `POST /api/itinerary` bodies are parsed through `ItinerarySchema.safeParse()` before any database or API call. Invalid requests return `400` with per-field `fieldErrors`. The `ItineraryRequest` type is `z.infer<typeof ItinerarySchema>` — the Zod schema is the **single source of truth**.

### 4b. Prompt Injection Defence

A `SYSTEM_PROMPT` constant is passed as the `system` parameter (not inside `messages[]`) to the Anthropic SDK. The model is instructed to ignore any instructions embedded in user-supplied fields (destination, interests, dietary). The `system` parameter is processed at higher trust than `messages[]` — malicious payloads are silently discarded and a standard itinerary is generated.

### 4c. Rate Limiting (Upstash Redis)

```ts
// src/lib/ratelimit.ts
Ratelimit.slidingWindow(10, "1 h")   // 10 generations per user per hour
prefix: "seek-wander:itinerary"       // namespaced Redis keyspace
```

Key: Clerk `userId` (authenticated) or request IP (fallback). Returns `429` with `X-RateLimit-*` headers on exhaustion. Applied before any AI or DB call — protects Anthropic wallet.

### 4d. Google API Key Split

| Key | Env Var | Restriction | Used In |
|-----|---------|-------------|---------|
| Client key | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | HTTP referrers: Vercel domain + localhost | Maps JS SDK, Places Autocomplete (browser) |
| Server key | `MAPS_SERVER_KEY` | API restriction: Places API only; no referrer | `route.ts` enrichment, `getPlacePhoto.ts` |

### 4e. IDOR Prevention

`/trips/[id]` fetches by ID then checks `trip.userId === userId`. Both missing and wrong-owner records return a neutral `notFound()`. Never expose ownership information in error responses.

### 4f. HTTP Security Headers (`next.config.mjs`)

```
X-Frame-Options:        DENY
X-Content-Type-Options: nosniff
Referrer-Policy:        strict-origin-when-cross-origin
Permissions-Policy:     camera=(), microphone=(), payment=(), usb=(), geolocation=(self)
```

---

## 5. The AI Engine & Prompt Architecture

### Overview

Model: `claude-sonnet-4-6` | Max tokens: `8192`

The model receives a fixed `SYSTEM_PROMPT` (injection defence) plus a `buildPrompt()` user message. The system prompt locks role, format, and schema. The user message contains the curated client profile.

### Canonical JSON Output Shape

Every response is a `timeline[]`-based itinerary with `TimelineItem[]` per day — activities and meals interwoven chronologically by `startTime`. The old `morning`/`afternoon`/`evening` + `dining[]` shape is deprecated but still handled by `normalizeDayPlan()` for backward compat with old DB records.

**`TimelineItemType`** = `"activity" | "breakfast" | "lunch" | "dinner" | "snack" | "drinks"`

### Spatial Awareness Rules (Hardcoded in `buildPrompt()`)

These rules are a permanent part of `buildPrompt()` and exist to prevent a class of AI failure modes where the model generates geographically incoherent schedules.

| Rule | Purpose |
|------|---------|
| **11. ANTI-TELEPORTATION** | Consecutive activities must be geographically proximate. Morning stops cluster in one neighbourhood; afternoon stops in a neighbouring area. Never cross the entire city without a meal break. |
| **12. TRANSIT REALITY** | If any activity is >15km from the previous location, the `startTime` gap must reflect real travel time. A 09:00 breakfast and a 09:30 activity an hour away is a hard failure. |
| **13. CURATED PACING** | 3–4 deeply curated, geographically clustered stops per day. Every stop must be exceptional and worthy of a dedicated visit. Raw quantity is penalised. |

> **Why these are hardcoded and not configurable:** These are not stylistic preferences. They are guardrails against factual incoherence that would break the map, destroy the transit display, and undermine user trust. They must not be removed or made optional.

### Two-Phase JSON Self-Healing

The route implements a two-phase recovery pipeline before ever returning a 500:

**Phase 1 — `sanitizeJson(raw: string)`**
- Strips markdown code fences
- Removes trailing commas before `}` and `]`
- Trims surrounding whitespace

**Phase 2 — `JSON_REPAIR_PROMPT` (second Anthropic call)**
If `sanitizeJson()` + `JSON.parse()` still throws, a repair call is made with the malformed string and a strict repair instruction. If both phases fail, a clean `500` is returned with no raw content exposed.

### Accommodation Branching

`CurationForm` collects `accommodationStatus: "needed" | "booked"`. The API route branches:

- **`"needed"`** → Claude generates `recommendedStays[]` — exactly **6 hotels** (two 5★, two 4★, two 3★)
- **`"booked"`** → Claude uses the provided `hotelName`, skips hotel recommendations entirely

---

## 6. Monetization — Interactive Affiliate Stays

### Strategy

We generate the full hotel pool **upfront in the single AI call** — no second generation, no live filtering. This is consistent with the Zero-Latency Principle.

The AI is instructed to produce **exactly 6 `recommendedStays`** entries:

| Tier | Count | `rating` | `priceTier` |
|------|-------|----------|-------------|
| Ultra-luxury | 2 | `5` | `"$$$$$"` |
| Premium | 2 | `4` | `"$$$$"` |
| Boutique | 2 | `3` | `"$$$"` |

### `<InteractiveStays>` Component

`src/components/InteractiveStays.tsx` is a `"use client"` component. It receives all 6 hotels as props and filters **locally in the browser** using `useState` — zero network calls, works offline.

```tsx
// Backward-compat: old saved trips have no `rating` field — skip slider, show first 2
const hasRatings = stays.some(s => s.rating !== undefined);
const filtered   = hasRatings
  ? stays.filter(s => s.rating === minRating).slice(0, 2)
  : stays.slice(0, 2);
```

**Slider** — `<input type="range" min={3} max={5} step={1}>` — cross-fades hotel cards via `AnimatePresence mode="wait"` keyed by `minRating`. Section is `print:hidden` (stays don't belong in the PDF dossier).

### `createAffiliateUrl()`

```ts
// src/lib/affiliate.ts
export function createAffiliateUrl(hotelName: string, destination: string): string {
  const query = encodeURIComponent(`${hotelName} ${destination}`);
  return `https://www.booking.com/searchresults.html?ss=${query}&aid=4013143`;
}
```

**AID `4013143`** is the Seek Wander affiliate account. All hotel links must use this utility — never construct Booking.com URLs manually.

---

## 7. Data Pipeline (`src/app/api/itinerary/route.ts`)

```
1. Zod validation     → ItinerarySchema.safeParse() — 400 on failure
2. Rate limit check   → Upstash Redis — 429 on exhaustion
3. AI generation      → claude-sonnet-4-6 + SYSTEM_PROMPT → pure JSON
4. JSON self-healing  → sanitizeJson() → JSON.parse() → repair call if needed
5. Place enrichment   → enrichPlace() per timeline item (PlaceCache-first)
6. Transit calc       → pure Haversine (zero API calls)
7. Cost tracking      → prisma.costLog.create() — AWAITED before response
8. Return             → Response.json(itinerary)
```

### `enrichPlace()` — PlaceCache-First

```
Cache HIT  (< 30 days): return cached data + parseOpenNow(hoursOpen, lng) — ZERO Google API calls
Cache MISS: Google Places Text Search → photoUrl, rating, userRatingsTotal, priceLevel, place_id
           → Google Place Details (opening_hours) — skipped for NATURE/ADVENTURE categories
           → upsert PlaceCache (fire-and-forget)
```

### Transit — Pure Haversine

```ts
walkingMinutes  = max(1, round((km / 5)  * 60))   // 5 km/h walking
drivingMinutes  = max(1, round((km / 25) * 60))   // 25 km/h city driving
```

No Distance Matrix API. No async. No cost. Applied per-day across all timeline stop coordinates.

### Cost Tracking

```ts
CLAUDE_INPUT_COST  = $3  / 1_000_000 tokens
CLAUDE_OUTPUT_COST = $15 / 1_000_000 tokens
GOOGLE_TEXT_SEARCH = $0.032 / call
GOOGLE_DETAILS     = $0.017 / call
```

`GenerationMeta` is server-console only — **never transmitted to the client** (margin protection). `prisma.costLog.create()` is **awaited** before `Response.json()` — Vercel freezes the serverless function the instant the response returns, killing fire-and-forget promises.

---

## 8. PWA & Offline Strategy

### Service Worker (`src/app/sw.ts` — Serwist)

| Strategy | Applied To | TTL / Cap |
|----------|-----------|-----------|
| `CacheFirst` | Google Places photo URLs | 30 days, 100-entry cap |
| `defaultCache` | Next.js static assets (JS, CSS, fonts) | — |

Disabled in `development` to prevent stale caches during iteration. Source: `src/app/sw.ts` → compiled to `public/sw.js` by `withSerwist()` in `next.config.mjs`.

### The `seek_wander_archive` — Offline Vault

`src/hooks/useOfflineTrips.ts` — two-phase data strategy used by `TripsClient.tsx`:

```
Phase 1 — navigator.onLine check
  → false: load from localStorage("seek_wander_archive") immediately, set isOffline: true

Phase 2 — /api/trips fetch (Clerk-authed GET)
  → success: update state + persist to localStorage
  → failure: load from localStorage fallback, set isOffline: true
```

**Cache key:** `seek_wander_archive` — stores `CachedTrip[]` as JSON, includes `itineraryData` for editorial preview text.

> **Why client-side fetch (not server-side)?** `getDestinationPhotoUrl()` uses `MAPS_SERVER_KEY` (server-only). The `/api/trips` route resolves photo URLs server-side and serialises them into the response. `TripsClient` gets pre-resolved URLs — no client-side key exposure.

---

## 9. UI/UX Polish

### Sonner Toast System

Configured in `src/app/layout.tsx` with brand tokens:

```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background:   "#F5F0E8",   // paper
      color:        "#0A0A0A",   // ink
      border:       "1px solid rgba(10,10,10,0.1)",
      borderRadius: "0",         // design system: no rounding
      fontFamily:   "var(--font-dm-sans), system-ui, sans-serif",
      fontSize:     "0.8125rem",
    },
  }}
/>
```

**Generation lifecycle** — all three share `id: "curate-task"` so Sonner mutates the same toast in place:

| Event | Call |
|-------|------|
| Fetch start | `toast.loading("Consulting the concierge…", { id: "curate-task" })` |
| Success | `toast.success("Itinerary Prepared", { id: "curate-task" })` |
| Any error | `toast.error("Concierge Busy", { id: "curate-task" })` |

### Mobile Menu — CSS Stacking Context Fix

**The bug:** `MobileMenu.tsx` overlay appeared transparent — text camouflaged into background hero images.

**Root cause:** `Navbar.tsx` applies `backdrop-blur-sm`. `backdrop-filter` creates a new CSS stacking context. Any `fixed`-positioned descendant is anchored to that ancestor, not the viewport — covering only the ~64px navbar bar.

**Fix:** `createPortal(overlay, document.body)` in `MobileMenu.tsx`. The portal moves the DOM node outside the Navbar tree entirely. `fixed inset-0` then covers the true viewport.

**Critical implementation detail:** The overlay animation must use `initial={{ opacity: 1 }}` (not `0`) with an **inline hex background fallback** on the root element:

```tsx
// MobileMenu.tsx — SSR guard + portal
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;

return createPortal(
  <motion.div
    initial={{ opacity: 1 }}     // ← NOT 0 — prevents transparent flash over hero images
    style={{ backgroundColor: "#F5F0E8" }}  // ← inline hex fallback — Tailwind class may not apply before paint
    className="fixed inset-0 z-50 bg-paper flex flex-col"
  >
    {/* ... */}
  </motion.div>,
  document.body
);
```

> **Rule for all future overlays:** Any `fixed`-positioned full-screen overlay inside a component using `backdrop-filter`, `transform`, `filter`, `will-change`, or `perspective` **must** use `createPortal(…, document.body)`.

### `GenerationLoader` — "Concierge at Work"

- Thin ring: static `border-ink/10` track + rotating `border-t-ink/40` arc (`animationDuration: 2.4s linear`)
- `STEPS` array (5 items) cycles via `setInterval(3500ms)`
- `AnimatePresence mode="wait"` — `initial={{ opacity: 0, y: 10 }}` / `exit={{ opacity: 0, y: -10 }}` / `transition={{ duration: 0.8, ease: "easeInOut" }}`
- Persistent sub-label: `"This takes around 15–20 seconds"`

---

## 10. File Architecture

```
src/
├── app/
│   ├── layout.tsx                # Root layout — fonts, conditional ClerkProvider, Sonner, appleWebApp metadata
│   ├── page.tsx                  # Landing page (CurationForm) — force-dynamic
│   ├── not-found.tsx             # Custom 404 — Seek Wander aesthetic — force-dynamic
│   ├── globals.css               # Base styles, @media print resets
│   ├── manifest.ts               # PWA manifest — "Seek Wander", standalone display, brand colors
│   ├── sw.ts                     # Serwist service worker — CacheFirst Google Photos + defaultCache
│   ├── api/
│   │   ├── itinerary/route.ts    # POST — Zod → Rate limit → AI → Enrich → Haversine → CostLog
│   │   ├── trips/route.ts        # GET — Clerk auth → prisma.trip.findMany → photoUrl serialisation
│   │   └── cron/cleanup/route.ts # GET — Vercel Cron (daily) → deletes PlaceCache > 14 days
│   ├── admin/metrics/page.tsx    # Server component — BI dashboard (ADMIN_USER_ID gated)
│   ├── itinerary/page.tsx        # Client — split-screen live results (55% timeline + 45% map)
│   ├── shared/[id]/page.tsx      # Server — public read-only shared itinerary, NO auth
│   └── trips/
│       ├── page.tsx              # Server — user archive dashboard
│       └── [id]/page.tsx         # Server — saved trip viewer + PDF export
├── components/
│   ├── Navbar.tsx                # Fixed nav — wordmark + logo, MY TRIPS, NavbarAuth (ssr:false)
│   ├── NavbarAuth.tsx            # Clerk v6 — SignedIn/SignedOut, modal sign-in, UserButton
│   ├── MobileMenu.tsx            # Mobile overlay — createPortal(body), inline hex bg, initial={{ opacity: 1 }}
│   ├── CurationForm.tsx          # 7-field concierge intake — staged inline expansion
│   ├── ItineraryViewer.tsx       # "use client" — editorial, tabbed days, TimelineCard, InteractiveStays, print all-days
│   ├── TimelineCard.tsx          # Pure display card — activity + meal unified, photo + enriched data
│   ├── InteractiveStays.tsx      # "use client" — hotel slider, AnimatePresence cross-fade, offline-capable
│   ├── StayCard.tsx              # motion.a affiliate card — Booking.com AID 4013143
│   ├── ItineraryMap.tsx          # Google Map — day-centric SVG markers + polyline + legend
│   ├── GenerationLoader.tsx      # "Concierge at Work" — cycling editorial steps
│   ├── ShareButton.tsx           # navigator.share() + clipboard fallback + AnimatePresence toast
│   ├── ExportPdfButton.tsx       # window.print() — print:hidden on itself
│   ├── TripsClient.tsx           # "use client" — useOfflineTrips, offline banner, trip grid
│   ├── UnauthenticatedState.tsx  # "Velvet Rope" — Lock icon + Clerk modal SignInButton
│   └── EmptyTripsState.tsx       # Inspiration hub — editorial destination teasers
├── hooks/
│   ├── useItinerary.ts           # Client fetch + state + Sonner toast lifecycle
│   └── useOfflineTrips.ts        # localStorage seek_wander_archive + /api/trips fetch
├── lib/
│   ├── db.ts                     # Prisma singleton (globalForPrisma pattern)
│   ├── affiliate.ts              # createAffiliateUrl(name, destination) → Booking.com AID 4013143
│   ├── ratelimit.ts              # Upstash Redis — slidingWindow(10, "1 h")
│   ├── getPlacePhoto.ts          # getDestinationPhotoUrl() — MAPS_SERVER_KEY, revalidate 86400
│   └── itineraryUtils.ts         # normalizeDayPlan(), isMealType(), computeMapPoints(), parseOpenNow()
├── app/actions/saveTrip.ts       # Server action — auth() + prisma.trip.create
└── types/
    └── itinerary.ts              # TypeScript types ONLY — no runtime functions
```

> **Rule:** `src/types/itinerary.ts` exports **types and interfaces only**. All executable helpers live in `src/lib/itineraryUtils.ts`.

---

## 11. Critical Architecture Patterns

### Server-to-Client Composition (`ItineraryViewer`)

`ItineraryViewer.tsx` is `"use client"` and accepts `bottomSection?: ReactNode`. Page-specific CTAs are injected from the server — never hardcoded inside the viewer.

```tsx
// itinerary/page.tsx — save button
<ItineraryViewer itinerary={itinerary} bottomSection={<SaveCta />} />

// trips/[id]/page.tsx — back-to-archive
<ItineraryViewer itinerary={itinerary} bottomSection={<BackToArchiveCta />} />

// shared/[id]/page.tsx — acquisition CTA
<ItineraryViewer itinerary={itinerary} bottomSection={<AcquisitionCta />} />
```

### Clerk v6 Server Auth

```ts
const { userId } = await auth();   // MUST be awaited — returns Promise in Clerk v6.39+
if (!userId) redirect("/");
```

Without `await`, destructuring gives `userId = undefined` (always falsy) — causes false Unauthorized errors on every request.

### Prisma JSON Cast

```ts
const itinerary = trip.itineraryData as unknown as ItineraryResponse;
```

Always double-cast through `unknown` when reading `Json` fields from Prisma.

### Backward-Compatible `normalizeDayPlan()`

Old DB records use `morning`/`afternoon`/`evening` + `dining[]`. New records use `timeline[]`. `normalizeDayPlan()` in `itineraryUtils.ts` synthesises a `timeline[]` from legacy fields if `Array.isArray(day.timeline)` is false — zero migration required.

### Map Points

- **Server-side** (`trips/[id]`, `shared/[id]`): `const mapPoints = computeMapPoints(itinerary.days ?? [])` in the server component
- **Client-side** (`itinerary/page.tsx`): `useMemo(() => computeMapPoints(itinerary.days), [itinerary])`

---

## 12. Data Schemas

### Prisma

```prisma
model Trip {
  id            String   @id @default(uuid())
  userId        String
  destination   String
  days          Int
  itineraryData Json     // Full ItineraryResponse blob
  createdAt     DateTime @default(now())
}

model PlaceCache {
  id               String   @id @default(uuid())
  cacheKey         String   @unique   // "{normalized-name}|{normalized-city}"
  photoUrl         String?
  rating           Float?
  userRatingsTotal Int?
  hoursOpen        String?            // "9:00 AM – 9:00 PM" (today's hours, day prefix stripped)
  priceLevel       Int?
  fetchedAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
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

### Key TypeScript Types

```ts
type TimelineItem = {
  type:                TimelineItemType;   // "activity" | "breakfast" | "lunch" | "dinner" | "snack" | "drinks"
  title:               string;
  description:         string;
  duration:            string;
  startTime?:          string;             // HH:MM
  category?:           string;             // activities only
  coordinates:         Coordinate;
  cuisine?:            string;             // meals only
  pricePoint?:         string;             // meals only
  reservation?:        boolean;            // meals only
  dietaryNote?:        string;             // meals only
  photoUrl?:           string;             // Google Places enriched
  rating?:             number;
  userRatingsTotal?:   number;
  openNow?:            boolean;
  hoursOpen?:          string;
  priceLevel?:         number;
  transitFromPrevious?: TransitInfo;
};

type RecommendedStay = {
  name:         string;
  description:  string;
  neighborhood: string;
  rating?:      number;    // 3 | 4 | 5 — present on new generations only
  priceTier?:   string;    // "$$$" | "$$$$" | "$$$$$" — present on new generations only
};
```

---

## 13. Environment Variables

```env
# AI
ANTHROPIC_API_KEY=

# Google Maps — CLIENT (restricted to HTTP referrers)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Google Maps — SERVER (no referrer restriction — server has no referrer header)
MAPS_SERVER_KEY=

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database (Supabase)
DATABASE_URL=       # port 6543 — PgBouncer pooled (runtime queries)
DIRECT_URL=         # port 5432 — direct connection (Prisma schema push / migrations)

# Admin Dashboard
ADMIN_USER_ID=      # Clerk userId — must be trimmed (Vercel env vars can have trailing newline)

# Cron Security
CRON_SECRET=        # openssl rand -hex 32 — Vercel sends as Authorization: Bearer <CRON_SECRET>

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> **Clerk keyless mode:** If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, `<ClerkProvider>` is skipped entirely (conditional in `layout.tsx`). The app renders and builds correctly without Clerk keys.

---

## 14. PDF / Print Export

Zero-dependency — `window.print()` + Tailwind `print:` modifiers.

- `<ExportPdfButton>` — `window.print()` on click, `print:hidden` on itself
- `globals.css` — `@media print`: resets Framer Motion inline opacity (`[style*="opacity"] { opacity: 1 !important }`), resets transforms, forces colour printing, `@page { margin: 1.5cm 2cm }`
- `trips/[id]/page.tsx` — branded dossier header (`hidden print:block`): Seek Wander wordmark, destination, date; outer wrapper `print:h-auto print:overflow-visible print:block`
- `ItineraryViewer` — tab bar `print:hidden`; `hidden print:block` section renders all days sequentially with `print:break-before-page` on days 2+; `bottomSection` is `print:hidden`
- `InteractiveStays` — `print:hidden` (affiliate section excluded from PDF)

---

## 15. Auth Architecture (Clerk v6)

### Route Auth Model

| Route | Auth Model |
|-------|-----------|
| `/trips` | `auth()` + `redirect('/')` if no userId |
| `/trips/[id]` | `auth()` + ownership check + `notFound()` if unauthorized |
| `/admin/metrics` | `auth()` + `ADMIN_USER_ID` match + `notFound()` if unauthorized |
| `saveTrip` server action | `auth()` + throws if no userId |
| `/itinerary` | Save button gated by `<SignedIn>`; page itself is public |
| `/shared/[id]` | **Intentionally public — no auth** |

### Admin Route — Neutral 404

```ts
const adminId = process.env.ADMIN_USER_ID?.trim();  // .trim() — Vercel env vars can have trailing newline
if (!adminId || userId !== adminId) notFound();      // neutral 404 — never leaks route existence
```

---

## 16. Automated Garbage Collection

**Route:** `GET /api/cron/cleanup`
**Schedule:** `"0 0 * * *"` (daily midnight UTC) — `vercel.json`
**Security:** `Authorization: Bearer <CRON_SECRET>` — returns `401` for any other caller

```ts
await prisma.placeCache.deleteMany({
  where: { updatedAt: { lt: fourteenDaysAgo } },
});
```

`PlaceCache.updatedAt` uses Prisma `@updatedAt` — auto-refreshed on every upsert. Recently accessed records (cache hits) stay alive.

---

## 17. Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core Engine | ✅ Complete | UI + Google Maps + Anthropic AI |
| 2 — Concierge UX | ✅ Complete | 7-field intake, split-screen results, Google enrichment, Haversine transit |
| 3 — Ultra-Luxury UI | ✅ Complete | Tabbed day nav, hoursOpen, cost badges, dashed transit connectors, day-centric map |
| 4 — Auth | ✅ Complete | Clerk v6, conditional ClerkProvider, NavbarAuth, custom 404 |
| 5 — Persistence | ✅ Complete | Prisma + Supabase, saveTrip, /trips archive, /trips/[id], IDOR enforcement |
| 6 — PWA & Sharing | ✅ Complete | Serwist PWA, manifest.ts, /shared/[id] with OG tags, ShareButton, PDF print |
| 7 — Chronological Timeline | ✅ Complete | `timeline: TimelineItem[]` canonical shape, normalizeDayPlan() shim |
| 8 — Margin Protection | ✅ Complete | PlaceCache, pure Haversine, parseOpenNow(), CostLog, /admin/metrics, Cron cleanup, Zod, SYSTEM_PROMPT, HTTP headers, key split |
| 9 — Affiliate Monetization | ✅ Complete | Booking.com AID 4013143, StayCard, accommodation branching, recommendedStays[] |
| 10 — UX & Polish | ✅ Complete | GenerationLoader, Sonner, UnauthenticatedState, EmptyTripsState, MobileMenu portal fix |
| 11 — Mobile, Offline & Resilience | ✅ Complete | useOfflineTrips, /api/trips GET, Upstash rate limiting, JSON self-healing, dynamic OG metadata |
| 12 — Interactive Stays + Spatial AI | ✅ Complete | InteractiveStays slider (6-hotel pool, 3 tiers), Anti-Teleportation / Transit Reality / Curated Pacing rules in buildPrompt() |
| 13 — Stripe Paywall | 🔜 Next | $4.99 paywall — free tier: 1 generation; paid: unlimited |
