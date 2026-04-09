# CLAUDE.md — Curated Roam V1.0

> **Permanent project memory and engineering specification. This is the single source of truth for all future development. Update whenever architecture decisions change.**

---

## 1. Product Philosophy

### The Luxury Concierge

**Curated Roam — Curated Luxury Journeys.**

This is not a travel app. It is a **digital concierge** — the invisible hand of an expert who has already been everywhere, knows everyone, and has already called ahead. Every pixel, every word, and every interaction must feel like it belongs in a *Vogue* editorial or a National Geographic feature. Expensive, minimalist, unhurried.

> **Brand rule:** The word "AI" is intentionally absent from all user-facing copy, manifests, metadata, and UI text. The product is positioned around the luxury *outcome*, not the technology. Claude is the invisible engine — never the headline.

> **Rebrand (2026-03-27):** The application was officially rebranded from **"Curated Roam"** to **"TravalBee"**. All user-facing copy, metadata titles, PWA manifest `name`/`short_name`, Upstash Redis key prefixes (`travalbee:*`), affiliate JSDoc, email addresses (`travalbee.com`), Navbar/MobileMenu wordmarks, and OG/Twitter titles have been updated. The `seek_wander_archive` localStorage key is intentionally preserved to avoid breaking existing offline caches.

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
| Rate Limiting | **`@upstash/redis` + `@upstash/ratelimit`** | `slidingWindow(5, "1 h")` per userId |
| Notifications | **`sonner`** | Branded toast layer — loading → success → error |
| Affiliate | **Booking.com** | AID `4013143`, `createAffiliateUrl()` in `src/lib/affiliate.ts` |
| Payments | **`stripe`** | One-time credit purchases — `mode: "payment"`, `checkout.session.completed` webhook |
| Observability | **`@sentry/nextjs`** | Wizard-installed; `withSentryConfig` in `next.config.mjs`; `sentry.server.config.ts` + `sentry.edge.config.ts` + `src/instrumentation.ts` + `src/instrumentation-client.ts` + `src/app/global-error.tsx` |

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

# Stripe (Phase 13 — Credit System)
STRIPE_SECRET_KEY=                       # Stripe Dashboard → Developers → API Keys → Secret key (sk_live_...)
STRIPE_PRICE_ID=                         # Stripe Dashboard → Products → one-time $4.99 credit → Price ID (price_...)
STRIPE_WEBHOOK_SECRET=                   # Stripe Dashboard → Webhooks → endpoint signing secret (whsec_...)
NEXT_PUBLIC_APP_URL=                     # Full deployment URL, no trailing slash (e.g. https://travel-planner-v2-pearl.vercel.app)
                                         # Used by Stripe checkout for success_url and cancel_url construction
```

> **Clerk keyless mode:** If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, `<ClerkProvider>` is skipped entirely (conditional in `layout.tsx`). The app renders and builds correctly without Clerk keys.

> **Supabase dual URLs:** `DATABASE_URL` uses PgBouncer (port 6543) for runtime queries. `DIRECT_URL` uses a direct connection (port 5432) required by Prisma for schema introspection and `db push`. Both must be set in `.env.local`.

> **Google key split:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is exposed to the browser — restrict it by HTTP referrer in Google Cloud Console. `MAPS_SERVER_KEY` is never sent to the client and has no referrer restriction (server-side fetch has no referrer header).

> **Stripe webhook local testing:** Use `stripe listen --forward-to localhost:3000/api/stripe/webhook` to forward events in dev. The `STRIPE_WEBHOOK_SECRET` for local testing differs from the production secret — use the one printed by `stripe listen`.

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
│   ├── page.tsx                # Landing page (CurationForm) — force-dynamic; fixed hero bg (z-0); "View Sample Itinerary" frosted-glass CTA
│   ├── not-found.tsx           # Custom 404 — Curated Roam aesthetic — force-dynamic
│   ├── globals.css             # Base styles, CSS custom properties, @media print resets
│   ├── manifest.ts             # Next.js PWA manifest — "Curated Roam", standalone display, brand colors (no "AI" in name)
│   ├── sw.ts                   # Serwist service worker — precache + Google Places photo CacheFirst (30d)
│   ├── api/
│   │   ├── itinerary/
│   │   │   └── route.ts        # POST — Zod validation → Rate limit → Credit check → AI generation → PlaceCache enrichment → Haversine transit → CostLog → Credit decrement
│   │   ├── trips/
│   │   │   └── route.ts        # GET — Clerk auth → prisma.trip.findMany → photoUrl serialisation
│   │   ├── trips/
│   │   │   └── [id]/
│   │   │       └── route.ts    # DELETE — auth + IDOR ownership check + atomic deleteMany({ id, userId })
│   │   ├── photo/
│   │   │   └── route.ts        # GET — server-side photo proxy; reconstructs Places photo URL from photoReference token + MAPS_SERVER_KEY
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   │   └── route.ts    # POST — Clerk auth → Stripe checkout.sessions.create (mode: "payment") → return { url }
│   │   │   └── webhook/
│   │   │       └── route.ts    # POST — HMAC signature verify → checkout.session.completed → prisma.userProfile.upsert (availableCredits++)
│   │   └── cron/
│   │       └── cleanup/
│   │           └── route.ts    # GET — Vercel Cron: deletes PlaceCache rows with updatedAt > 14 days (CRON_SECRET auth)
│   ├── admin/
│   │   └── metrics/
│   │       └── page.tsx        # Server component — internal BI dashboard (/admin/metrics), ADMIN_USER_ID gated
│   │                           # Sections: Cost KPIs, Revenue KPIs (Stripe), User Metrics (UserProfile), Generation Log, Recent Purchases
│   ├── dashboard/
│   │   └── page.tsx            # Server component — user dashboard (/dashboard); credits widget, trip stats, WorldMap, recent trips
│   ├── itinerary/
│   │   └── page.tsx            # Client component — split-screen live results (55% timeline + 45% map)
│   ├── sample/
│   │   └── page.tsx            # Server component — public acquisition funnel (/sample); NO auth; fetches single hardcoded UUID trip from DB
│   ├── shared/
│   │   └── [id]/
│   │       └── page.tsx        # Server component — public read-only shared itinerary (/shared/[id]), NO auth
│   ├── pricing/
│   │   └── page.tsx            # Static page — credit pricing ($4.99 one-time), Stripe checkout CTA, 4-item FAQ strip
│   ├── faq/
│   │   └── page.tsx            # Static page — 4 sections, collapsible Framer Motion accordion
│   ├── privacy/
│   │   └── page.tsx            # Static page — Privacy Policy; Anthropic sub-processor disclosure; 30-day deletion SLA
│   ├── terms/
│   │   └── page.tsx            # Static page — Terms of Service; NJ governing law; 16+/13+ age; AI disclaimer
│   ├── cookies/
│   │   └── page.tsx            # Static page — Cookie Policy; no ad/retargeting cookies; Vercel Analytics GDPR note
│   ├── refunds/
│   │   └── page.tsx            # Static page — Refund Policy; 7-day guarantee; hello@curatedroam.com
│   └── trips/
│       ├── page.tsx            # Server component — user archive dashboard (/trips)
│       └── [id]/
│           └── page.tsx        # Server component — dynamic saved trip viewer (/trips/[id]) + PDF export
├── components/
│   ├── Navbar.tsx              # Fixed nav — wordmark + logo, PRICING / MY TRIPS / DASHBOARD links + Home icon, dynamic NavbarAuth
│   ├── NavbarAuth.tsx          # Clerk auth (ssr:false) — SignInButton modal + UserButton
│   ├── MobileMenu.tsx          # Mobile nav overlay — createPortal(…, document.body) escapes Navbar backdrop-blur stacking context
│   ├── BackButton.tsx          # Reusable "← HOME" nav link — ChevronLeft icon + micro-copy label; used on all secondary pages
│   ├── ShareButton.tsx         # Client component — navigator.share() + clipboard fallback + AnimatePresence toast
│   ├── ExportPdfButton.tsx     # Client component — window.print() trigger, print:hidden in output
│   ├── DeleteTripButton.tsx    # Client component — Trash2 icon, DeleteDialog portal, calls DELETE /api/trips/[id], prunes localStorage
│   ├── CurationForm.tsx        # 10-field concierge intake (staged inline expansion) + accommodation branching
│   ├── GenerationLoader.tsx    # "Concierge at Work" loader — thin spinning ring + AnimatePresence cycling editorial steps
│   ├── EmptyTripsState.tsx     # Editorial inspiration hub — shown when /trips archive is empty
│   ├── UnauthenticatedState.tsx # "Velvet Rope" gate — Lock icon + Clerk modal SignInButton
│   ├── TripsClient.tsx         # "use client" for /trips — useOfflineTrips hook, offline banner, trip grid, DeleteDialog
│   ├── ItineraryViewer.tsx     # "use client" — editorial opener (print:hidden), tabbed days, TimelineCard, InteractiveStays, PrintItinerary
│   ├── PrintItinerary.tsx      # Print-only magazine dossier — hidden print:block; cover page + day pages; CSS Grid layout; eager-loaded images
│   ├── TimelineCard.tsx        # Pure display card — activity + meal unified, photo + enriched data
│   ├── InteractiveStays.tsx    # "use client" — hotel tier slider, AnimatePresence cross-fade, offline-capable
│   ├── StayCard.tsx            # Booking.com affiliate card — motion.a, whileHover y:-2, AID 4013143
│   ├── ItineraryMap.tsx        # Google Map — day-centric SVG markers with semantic activity type icons (getIconSvg/buildSvgMarker) + polyline + legend
│   ├── WorldMap.tsx            # "use client" — editorial Google Map showing all curated destinations as burnt-orange pins; used on /dashboard
│   ├── SearchBar.tsx           # Google Places Autocomplete (legacy, not in main flow)
│   └── BentoGrid.tsx           # 12-col editorial grid
├── middleware.ts               # Clerk middleware — all routes public
├── hooks/
│   ├── useItinerary.ts         # Client-side fetch + state + Sonner toast lifecycle; 402 → setPaywalled(true)
│   └── useOfflineTrips.ts      # localStorage cache + /api/trips fetch; deleteTrip(); falls back to seek_wander_archive key when offline
├── lib/
│   ├── db.ts                   # Prisma singleton — prevents multiple clients in dev hot-reload
│   ├── stripe.ts               # Stripe lazy singleton (Proxy pattern) — defers init until first use; apiVersion: "2026-02-25.clover"
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
└── schema.prisma               # Trip, PlaceCache, UserProfile, CostLog models

vercel.json                     # Cron job schedule: /api/cron/cleanup at "0 0 * * *"
```

**API routes:**

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/itinerary` | Rate-limited per userId | Main generation pipeline; credit check + decrement |
| `GET /api/trips` | Clerk userId required | Returns user's trips with photoUrls serialised (for `useOfflineTrips`) |
| `DELETE /api/trips/[id]` | Clerk userId + ownership | IDOR-safe deletion with atomic `deleteMany({ id, userId })` |
| `GET /api/photo` | None | Server-side proxy: reconstructs Google Places photo URL from raw `photoReference` token |
| `POST /api/stripe/checkout` | Clerk userId required | Creates Stripe checkout session; returns `{ url }` |
| `POST /api/stripe/webhook` | STRIPE_WEBHOOK_SECRET HMAC | Handles `checkout.session.completed`; upserts `UserProfile.availableCredits` |
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
  photoReference?: string; // raw photo_reference token — used by /api/photo proxy
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

`ItineraryViewer` also renders `<PrintItinerary>` (hidden by default, `hidden print:block`) and suppresses its own editorial opener in print (`print:hidden`) to prevent duplicate quotes in the PDF.

### Server-to-Client Composition Pattern

`ItineraryViewer.tsx` is `"use client"` with a `bottomSection?: ReactNode` slot:

```tsx
// itinerary/page.tsx — save button
<ItineraryViewer itinerary={itinerary} bottomSection={<SaveCta />} />

// trips/[id]/page.tsx — back-to-archive links
<ItineraryViewer itinerary={itinerary} bottomSection={<BackToArchiveCta />} />

// shared/[id]/page.tsx — acquisition CTA
<ItineraryViewer itinerary={itinerary} bottomSection={<AcquisitionCta />} />

// sample/page.tsx — pricing CTA
<ItineraryViewer itinerary={itinerary} departureDate="…" returnDate="…" bottomSection={<PricingCta />} />
```

**Do not** move page-specific CTAs, save buttons, or navigation inside `ItineraryViewer`. Keep it display-only.

### Security — Ownership Enforcement (IDOR Prevention)

```ts
const trip = await prisma.trip.findUnique({ where: { id: params.id } });
if (!trip || trip.userId !== userId) notFound();
```

Both missing and wrong-owner records return the same neutral `notFound()`. **`/shared/[id]` and `/sample` are the intentional exceptions** — public routes, NO auth check.

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

- **Server-side** (`trips/[id]`, `shared/[id]`, `sample`): `const mapPoints = computeMapPoints(itinerary.days ?? [])` directly in the server component
- **Client-side** (`itinerary/page.tsx`): `useMemo(() => computeMapPoints(itinerary.days), [itinerary])`

### `/sample` — Public Acquisition Funnel Pattern

`/sample` is a server component that fetches ONE hardcoded "golden" trip from the production DB — no auth, no user data, just a curated showcase. Pattern mirrors `/shared/[id]`:

```ts
// src/app/sample/page.tsx
const SAMPLE_TRIP_ID = "7d88a6f1-fef5-4145-bee1-cc165b178d2a"; // hardcoded UUID — swap to update sample
export const dynamic = "force-dynamic";

const trip = await prisma.trip.findUnique({ where: { id: SAMPLE_TRIP_ID } });
if (!trip) notFound(); // protects against misconfiguration
const itinerary = trip.itineraryData as unknown as ItineraryResponse;
```

- `departureDate` and `returnDate` are passed as hardcoded dummy strings (`"2025-09-12"` / `"2025-09-14"`) so the `PrintItinerary` cover page renders complete dates.
- Bottom CTA: "Curate My Itinerary" (burnt-orange) + "View Pricing" (outlined).
- Hero: "View Sample Itinerary" frosted-glass button (`bg-white/15 border-white/60 backdrop-blur-sm`) below `<CurationForm>`.
- No Supabase SDK needed — Prisma uses the `DATABASE_URL` connection string (service-level access), bypassing RLS entirely.

---

## 7. Data Schemas

### Prisma — Full Schema

```prisma
generator client {
  provider = "prisma-client-js"
  // No explicit binaryTargets — Prisma auto-detects the correct platform binary.
  // Pinning targets (e.g. rhel-openssl-1.0.x) breaks Vercel (Amazon Linux 2023, OpenSSL 3.x).
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
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
  photoUrl         String?                      // DEPRECATED — kept for backward compat; natural expiry via isOldFormat detection
  photoReference   String?                      // raw photo_reference token (key-independent); URL reconstructed fresh at serve time
  rating           Float?
  userRatingsTotal Int?
  hoursOpen        String?                      // e.g. "9:00 AM – 9:00 PM" (today's hours, stripped of day prefix)
  priceLevel       Int?
  fetchedAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt          // auto-updated on every write — used by cron cleanup

  @@index([updatedAt])                          // deleteMany({ where: { updatedAt: { lt: 14daysAgo } } }) — O(log n) not O(n)
}

model UserProfile {
  id               String   @id                // Clerk userId — no FK constraint
  availableCredits Int      @default(1)         // 1 free credit on creation; +1 per Stripe purchase
  stripeCustomerId String?  @unique             // kept for refund/audit purposes
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
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
  walkingTolerance?: 'strict' | 'relaxed'           // only sent when transportMode === "walking-transit"
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
3. Credit check       → prisma.userProfile.findUnique → 402 { error: "no_credits" } if credits ≤ 0
4. AI generation      → claude-sonnet-4-6 + SYSTEM_PROMPT (injection defence) → pure JSON
5. JSON self-healing  → sanitizeJson() → JSON.parse() → repair Anthropic call if needed
6. Place enrichment   → enrichPlace() per timeline item in parallel (PlaceCache-first)
7. Transit calc       → pure Haversine (zero API calls)
8. Cost tracking      → prisma.costLog.create() — AWAITED before response
9. Credit decrement   → prisma.userProfile.upsert (fire-and-forget) — non-fatal
10. Return            → Response.json(itinerary)
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
  exactHotelAddress:   z.string().max(300).regex(/^[^<>{}`$;\\|]+$/, "Invalid address").optional(),
  transportMode:       z.enum(["walking-transit", "car-driver"]).optional(),
  walkingTolerance:    z.enum(["strict", "relaxed"]).optional(),
});
type ItineraryRequest = z.infer<typeof ItinerarySchema>; // local to route.ts
```

`safeParse` is used — never `parse` — so errors are handled gracefully without try/catch.

> **`walkingTolerance` behaviour:** Only injected into the prompt when `transportMode !== "car-driver"`. `undefined` and `"strict"` are treated identically — safe-by-default. Rule 11 (Neighbourhood Lock — city boundary) is unchanged in both modes; only Rule 12 (consecutive stop distance) is affected.

### Credit Check (Step 3)

```ts
if (userId) {
  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  // CRITICAL: `profile ? profile.availableCredits : 1` — NOT `?? 0`
  // A brand-new user has no DB row yet but is entitled to 1 free credit (Prisma default(1)).
  // Using `?? 0` would incorrectly block them on their very first generation.
  const credits = profile ? profile.availableCredits : 1;
  if (credits <= 0) {
    return Response.json(
      { error: "no_credits", message: "…", upgradeUrl: "/pricing" },
      { status: 402 }
    );
  }
}
```

Frontend (`useItinerary.ts`) checks `res.status === 402` (not error string) → `setPaywalled(true)`.

### Credit Decrement (Step 9)

```ts
// Fire-and-forget — a missed decrement gives the user one extra generation rather than blocking them.
// `create` branch handles the rare edge case where the row doesn't exist yet.
if (userId) {
  prisma.userProfile.upsert({
    where:  { id: userId },
    create: { id: userId, availableCredits: 0 }, // used their implicit free credit
    update: { availableCredits: { decrement: 1 } },
  }).catch(() => console.error("[itinerary] UserProfile decrement failed"));
}
```

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
| **11. THE NEIGHBOURHOOD LOCK** | Now **3-way** branch on `isRegion` → `transportMode`. **Region mode:** Each day anchored in one distinct town within the region; days sequenced geographically to minimise backtracking. **Car/driver (city):** Regional day trips allowed, consecutive stops ≤40km. **Walking/transit (city):** ALL activities must stay within the exact same city; named counter-examples prevent hallucination. |
| **12. TRANSIT TIME REALITY** | Now **3-way** branch on `isRegion` → `transportMode`. **Region mode:** Within each day's anchor city keep stops ≤30 min walk/taxi; inter-day travel between towns expected — widen `startTime` gap on heavy travel days. **Car (city):** ≤30 min drive between stops. **Walking (city):** strict ≤20 min / relaxed ≤45 min (see `walkingTolerance`). |
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
- `neighborhoodLockRule` — **3-way** string injected at Rule 11: `isRegion` (Regional Flow) → `car-driver` → walking city lock
- `transitTimeRule` — **3-way** string injected at Rule 12: `isRegion` (anchor-city transit) → `car-driver` → walking strict/relaxed

### `enrichPlace()` — PlaceCache-First Enrichment

```
1. Check prisma.placeCache (cacheKey = "{normalized-name}|{normalized-city}")
   HIT  (< 30 days old, has photoReference): return cached data + parseOpenNow(hoursOpen, lng) — ZERO Google API calls
   HIT  (isOldFormat: photoUrl set, photoReference null): treat as expired → fall through to Google
   MISS: continue to Google Places

2. Google Places Text Search (textsearch/json) using MAPS_SERVER_KEY
   → photoReference (raw token), rating, userRatingsTotal, openNow, priceLevel, place_id

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

> **Exact token tracking (2026-03-27):** `CostLog` now stores `inputTokens Int`, `outputTokens Int`, and `thinkingTokens Int` from the raw Anthropic API response. Cost is computed from real token counts rather than estimates. The `/admin/metrics` dashboard sums `aiCost` directly from the DB column instead of using a hardcoded multiplier.

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

`exactHotelAddress` is injected directly into the AI prompt as the spatial anchor (`baseCamp` variable). It carries the same blocklist regex as `hotelName` in `ItinerarySchema`:

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
| **Rate Limiting** | Upstash `slidingWindow(5, "1 h")` | Protects Anthropic wallet — 429 with `X-RateLimit-*` headers |
| **API Key Split** | `NEXT_PUBLIC_` vs `MAPS_SERVER_KEY` | Server key never reaches browser |
| **IDOR Prevention** | `findUnique` + `userId` ownership check | Neutral `notFound()` for missing AND unauthorized |
| **Admin Route** | `notFound()` (not `redirect`) | Route existence not leaked to non-admin users |
| **HTTP Headers** | `next.config.mjs` `headers()` | `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy |
| **Cron Security** | `Authorization: Bearer <CRON_SECRET>` | Cleanup route returns 401 for all other callers |
| **`/api/trips` Guard** | Clerk `userId` required | `401` if absent; data always scoped to `{ where: { userId } }` |
| **Stripe Webhook** | HMAC signature via `stripe.webhooks.constructEvent()` | Rejects any unsigned or tampered webhook payload |
| **Credit Check** | `profile ? profile.availableCredits : 1` | New users (no DB row) correctly get 1 implicit free credit; `?? 0` would block them |

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
// src/lib/affiliate.ts — AID 4013143 is the Curated Roam affiliate account
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

## 11. Stripe Credit System

### Business Model

- **Free tier:** Every new user receives 1 complimentary generation. This credit is implicit — no `UserProfile` DB row is created until they generate or purchase.
- **Paid:** $4.99 per credit (one-time charge). 1 credit = 1 generation. Credits never expire. No subscription, no recurring billing.
- **Purchase flow:** `/pricing` → "Buy a Credit" → `POST /api/stripe/checkout` → Stripe Checkout redirect → `success_url: /itinerary?credited=1` → webhook credits the user.

### `src/lib/stripe.ts` — Lazy Singleton

```ts
// Proxy pattern defers instantiation until first use — build phase runs without env vars
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
```

### `POST /api/stripe/checkout`

```ts
const session = await stripe.checkout.sessions.create({
  mode:                  "payment",         // one-time, not subscription
  payment_method_types:  ["card"],
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url:           `${baseUrl}/itinerary?credited=1`,
  cancel_url:            `${baseUrl}/pricing?cancelled=1`,
  metadata:              { clerkUserId: userId }, // sole user identifier — no Stripe customer record needed
  allow_promotion_codes: true,
});
return NextResponse.json({ url: session.url });
```

### `POST /api/stripe/webhook` — Credit Upsert Logic

```ts
case "checkout.session.completed": {
  const clerkUserId = session.metadata?.clerkUserId;
  await prisma.userProfile.upsert({
    where:  { id: clerkUserId },
    // create: user bought BEFORE their first free generation created a DB row.
    // Give them 2: the 1 free they never used + the 1 they just bought.
    create: { id: clerkUserId, availableCredits: 2 },
    // update: normal case — increment by 1.
    update: { availableCredits: { increment: 1 } },
  });
}
```

Webhook only listens to `checkout.session.completed` — all subscription/invoice events removed (no recurring billing). `export const runtime = "nodejs"` required — Stripe HMAC verification needs raw body, which Next.js would parse as JSON otherwise.

### `/pricing` Page

- Free tier card ($0) + Credit card ($4.99 / itinerary) side by side
- "One-Time" badge (not "Most Popular")
- "Buy a Credit — $4.99" CTA → `POST /api/stripe/checkout` → redirect
- Footer: "One-time charge · No subscription · Credits never expire"
- 4-item inline FAQ strip (satisfaction guarantee, expiration, security, refunds)
- `BackButton` component at top for navigation

---

## 12. Admin Dashboard (`/admin/metrics`)

Internal BI page — access controlled by `ADMIN_USER_ID` env var.

### Cost & Generation KPIs (existing)
**KPI cards:** Total Spent · Total Generations · Avg Cost / Trip · Cache Hit Rate (`cacheHits / (cacheHits + cacheMisses)`)

**Cost split section:** Claude vs Google with per-trip averages.

**Generation log table:** Last 200 rows, newest first. Cost colour-coding: green < $0.15, amber > $0.50. Cache column: `{hits}/{hits+misses}`.

### Revenue KPIs (added Phase 13)

Queries `stripe.checkout.sessions.list({ limit: 100, expand: ["data.payment_intent"] })`, filters `payment_status === "paid" && mode === "payment"`:

- **Total Revenue** — sum of `session.amount_total / 100`
- **Credits Sold** — count of paid sessions
- **Gross Profit** — revenue minus estimated AI + Google costs
- **Profit Margin** — gross profit / revenue

### User Metrics (added Phase 13)

Queries `prisma.userProfile.aggregate({ _sum: { availableCredits }, _avg: { availableCredits }, _count: true })`:

- **Total Users** — profile row count
- **Zero-Credit Users** — users with `availableCredits <= 0` (conversion targets)
- **Avg Credits Remaining** — health metric

### Recent Purchases Table (added Phase 13)

Last 20 paid Stripe sessions with: timestamp, Clerk userId (from metadata), amount paid, payment status.

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
- Persistent sub-label: `"This will take about 2 minutes"`

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

### Hero Background — Fixed Positioning Fix

The hero background image uses `fixed inset-0 z-0` so it doesn't rescale when the `<CurationForm>` expands inline. All content below the hero (Stats Strip, How It Works, BentoGrid, Footer) must be wrapped in `<div className="relative z-10 bg-paper">` to cover the fixed background layer — without this wrapper, below-fold sections are transparent.

### Mobile Scroll Fixes — CurationForm

**Destination input:** `onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "start" })}` + `className="… scroll-mt-32"`. The `scroll-mt-32` prevents the input from sliding under the fixed Navbar when `scrollIntoView` triggers.

**Date inputs:** `onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" })}` — `"center"` gives more viewport space for the date picker dropdown without fighting the fixed navbar.

### `BackButton.tsx` — Reusable Navigation

```tsx
// src/components/BackButton.tsx — "use client"
export default function BackButton({ href = "/", label = "HOME" }: BackButtonProps) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 micro-copy text-ink-light hover:text-ink transition-colors mb-8">
      <ChevronLeft size={13} strokeWidth={1.5} />
      {label}
    </Link>
  );
}
```

Used on: `/dashboard`, `/pricing`, `/faq`, `/privacy`, `/terms`, `/cookies`, `/refunds`.

---

## 15. PDF / Print Export

### `window.print()` + Tailwind `print:` — Zero Library Approach

- **`<ExportPdfButton />`** — `window.print()` on click, `print:hidden` on itself
- **`globals.css`** — `@media print`: resets Framer Motion inline `opacity` (`[style*="opacity"] { opacity: 1 !important }`), resets transforms, forces color printing, `@page { margin: 1.5cm 2cm }`
- **`trips/[id]/page.tsx`** — outer wrapper: `print:h-auto print:overflow-visible print:block`. Navbar + maps + header strip are `print:hidden`
- **`ItineraryViewer.tsx`** — tab bar `print:hidden`. Editorial opener `print:hidden` (prevents duplicate quote — `PrintItinerary` renders the editorial on the cover page). `bottomSection` is `print:hidden`
- **`InteractiveStays`** — `print:hidden` (affiliate section excluded from PDF)

### `PrintItinerary.tsx` — Editorial Magazine Dossier

`src/components/PrintItinerary.tsx` — rendered inside `ItineraryViewer` as `<PrintItinerary itinerary={…} departureDate={…} returnDate={…} />`. Visibility: `hidden print:block`.

**Browser chrome removal:**
```tsx
<style>{`
  @media print {
    @page { margin: 0; }
    body  { margin: 1.5cm; }
  }
`}</style>
```
Overrides browser default headers/footers (URLs, dates, page numbers).

**Cover page** (`print:break-after-page`):
- Wordmark + "Curated Luxury Itinerary" top bar
- Destination name: `text-8xl font-serif italic leading-none` — massive editorial headline
- Dates + day count
- Editorial quote (`blockquote font-serif italic text-2xl`)
- Footer: `curatedroam.com`

**Day pages** (`print:break-before-page` on days 2+, `p-16` for internal page margins):
- Day header: `"DAY 1"` in `text-xs tracking-widest uppercase text-black/30`; theme in `text-5xl font-serif italic`
- Activity rows: **CSS Grid** `grid-cols-[80px_1fr_80px]` with `gap-x-6` — NOT flexbox (flexbox wraps in PDF renderers)
  - Column 1: `startTime` in `font-mono text-[10px] text-black/40`
  - Column 2: title (`font-serif italic text-2xl`) + description + meta tags (`flex-row flex-wrap gap-3`)
  - Column 3: `<img loading="eager">` — standard HTML img (not Next.js `<Image>`) to prevent lazy-loading blank squares in PDF
- **Transit connectors** between activity rows: dashed vertical line in time column + italic text (`text-[9px] text-black/40 italic`) — rendered as a separate grid row matching `grid-cols-[80px_1fr_80px]`
- `break-inside-avoid` on every activity row to prevent mid-card page splits
- Hidden gem at bottom of each day

**`getFallbackImage(type)`** — guaranteed non-empty image column:
| Type | Unsplash URL |
|------|-------------|
| Meals / food | `photo-1414235077428-338989a2e8c0` (high-end dining) |
| Culture / museums | `photo-1518998053401-878c7356cecb` (architecture) |
| Nature / parks | `photo-1469474968028-56623f02e42e` (landscape) |
| Default | `photo-1488646953014-85cb84e24328` (travel aesthetic) |

---

## 16. Public Sharing — `/shared/[id]`

- Server component. **Intentionally NO auth check** — public by design. Fetches by ID only.
- `generateMetadata()` → dynamic OG tags: `{destination} Itinerary | Curated Roam`
- Ink acquisition banner: "Curated by Curated Roam — Create Your Own →"
- Mobile sticky CTA: `fixed bottom-0 z-40 bg-burnt-orange`
- **`<ShareButton>`** — `navigator.share()` first (mobile native), falls back to `navigator.clipboard.writeText()`. AnimatePresence toast: "Link copied to clipboard"

---

## 17. Open Graph & Social Metadata

### Global defaults (`src/app/layout.tsx`)

```ts
title: {
  default:  "Curated Roam | Bespoke AI Travel Curation",
  template: "%s | Curated Roam",
},
openGraph: { type: "website", siteName: "Curated Roam", … },
twitter:   { card: "summary_large_image", … },
```

### Per-trip dynamic OG (`trips/[id]/page.tsx` — `generateMetadata()`)

- **Title:** `"{destination} | Curated by Curated Roam"` (full string — not `%s` template)
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
| `/trips` | `auth()` + `UnauthenticatedState` (velvet rope) if no userId — no redirect |
| `/trips/[id]` | `auth()` + ownership check + `notFound()` if unauthorized |
| `/dashboard` | `auth()` + `UnauthenticatedState` if no userId — no redirect |
| `/admin/metrics` | `auth()` + `ADMIN_USER_ID` match + `notFound()` if unauthorized |
| `saveTrip` server action | `auth()` + throws if no userId |
| `POST /api/stripe/checkout` | `auth()` + `401` if no userId |
| `/itinerary` | Save button gated by `<SignedIn>`; page itself is public |
| `/shared/[id]` | **Intentionally public — no auth** |
| `/sample` | **Intentionally public — no auth** |
| `DELETE /api/trips/[id]` | `auth()` + neutral-404 ownership check + `deleteMany({ id, userId })` |

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

> **Model selection is non-negotiable.** Tested `claude-haiku` as a lower-cost alternative — confirmed that complex spatial reasoning tasks (Neighbourhood Lock, negative constraint handling, consecutive stop constraints) produced incoherent or rule-violating output at Haiku tier. `claude-sonnet-4-6` is the minimum viable model for geographic integrity.

---

## 20. CurationForm Fields (10 total)

Staged inline expansion — each stage unlocks after the previous is completed.

| # | Field | Type | Notes |
|---|-------|------|-------|
| 1 | Destination | Google Places Autocomplete | `onFocus` → `scrollIntoView({ block: "start" })` + `scroll-mt-32` to clear fixed navbar |
| 2 | Dates | Departure + Return date pickers | `getLocalToday()` for timezone safety; `onFocus` → `scrollIntoView({ block: "center" })`; duration badge computed |
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

## 21. User Dashboard (`/dashboard`)

Server component — `force-dynamic`. Auth: shows `<UnauthenticatedState>` (velvet rope) if no `userId` — no redirect, consistent with the `/trips` pattern.

### Data fetching (parallel)

```ts
const [profile, recentTrips, allTrips] = await Promise.all([
  prisma.userProfile.findUnique({ where: { id: userId } }),
  prisma.trip.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }),
  prisma.trip.findMany({ where: { userId }, select: { id: true, destination: true, itineraryData: true } }),
]);
```

### Sections

**Credits widget** — full-width dark (`bg-ink text-paper`) card: `availableCredits` count, "Buy More Credits" link → `/pricing`.

> `profile ? profile.availableCredits : 1` — same implicit-free-credit logic as the itinerary route. New users with no DB row see 1 credit remaining.

**Stats row** — Trips Generated · Unique Destinations · Total Days planned.

**World Map** — `<WorldMap pins={destinationPins} />` (dynamically imported, `ssr: false`). Coordinates extracted from `itineraryData.days[0].timeline[0].coordinates` — zero extra API calls. Type:
```ts
type DestinationPin = { id: string; destination: string; lat: number; lng: number; days: number };
```

**Recent journeys grid** — last 3 trips with destination, date, and "View" link.

**Quick actions** — "Curate a New Journey" + "View Full Archive".

### `WorldMap.tsx`

`src/components/WorldMap.tsx` — `"use client"`. Uses `@react-google-maps/api` with `libraries: ["places"]` (must match `ItineraryMap.tsx` — same singleton loader instance).

- Map style: `#EDE8DC` land, `#D6D0C4` water, `#C8C2B6`/`#B8B2A6` borders — editorial paper tones
- All labels, roads, transit, POI hidden
- Pins: burnt-orange SVG data URI built at **module scope** (safe — it's a static string, not a `google.maps.*` constructor). `google.maps.Icon` object built inside the component body after `isLoaded: true`

> **Singleton loader constraint:** `useJsApiLoader` must be called with identical `libraries` array across all components in the app. `WorldMap` uses `["places"]` to match `ItineraryMap`. Mismatched arrays throw a runtime error.

---

## 22. Legal & Content Pages

All pages use `<BackButton href="/" label="HOME" />` for navigation. All are statically rendered (no `force-dynamic`).

| Route | Content |
|-------|---------|
| `/pricing` | Credit pricing ($0 free / $4.99 one-time), Stripe checkout CTA, 4-item FAQ strip |
| `/faq` | 4 sections (The Service, Features, Account & Billing, Privacy & Data), 21 Q&As, Framer Motion collapsible accordion |
| `/privacy` | 10-section Privacy Policy; Anthropic as sub-processor; 30-day deletion SLA on request; `seek_wander_archive` localStorage disclosed |
| `/terms` | 10-section ToS; NJ governing law; 16+ (EEA: 13+) age requirement; AI output disclaimer; itineraries for personal non-commercial use only |
| `/cookies` | 7-section Cookie Policy; Clerk session cookies (necessary); localStorage/sessionStorage disclosed; no ad/retargeting cookies; Vercel Analytics (GDPR/CCPA compliant, no consent banner required) |
| `/refunds` | 7-day no-questions satisfaction guarantee; after 7 days: case-by-case for technical failures; no refunds after 30 days; EU 14-day withdrawal right acknowledged; contact: hello@curatedroam.com |

---

## 23. PWA & Offline Architecture

### Service Worker (`src/app/sw.ts` — Serwist)

| Strategy | Applied To | TTL / Cap |
|----------|-----------|-----------|
| `CacheFirst` | Google Places photo URLs | 30-day TTL, 100-entry cap |
| `defaultCache` | Next.js static assets (JS, CSS, fonts) | — |

Disabled in `development` to prevent stale caches. Source: `src/app/sw.ts` → compiled to `public/sw.js` by `withSerwist()` in `next.config.mjs`.

**`src/app/manifest.ts`** — Name: `"Curated Roam"` (no "AI"). Standalone display, `#F6F1EB` background, `#1B1817` theme color. Icons at `/icon-192x192.png` and `/icon-512x512.png`.

**`src/app/layout.tsx`** — `appleWebApp: { capable: true, statusBarStyle: "default", title: "Curated Roam" }`.

### The `seek_wander_archive` — Offline Vault

> **Note:** `seek_wander_archive` is a localStorage key (a code string literal). It has not been renamed to match the Curated Roam brand to avoid breaking existing cached data for users who have already saved itineraries. A future migration would use `localStorage.removeItem("seek_wander_archive")` + re-write to a new key.

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

## 24. Phase Roadmap

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
| 11 — Mobile, Offline & Resilience | ✅ Complete | useOfflineTrips + TripsClient (localStorage seek_wander_archive); /api/trips GET; Upstash rate limiting (5/hr); AI JSON self-healing; dynamic OG metadata |
| 12 — Interactive Stays + Spatial AI | ✅ Complete | InteractiveStays slider (6-hotel pool, 3 tiers, offline-capable); Neighbourhood Lock / Transit Reality / Curated Pacing rules (transport-mode branching) in buildPrompt(); semantic SVG activity icons in ItineraryMap (getIconSvg/buildSvgMarker); hotel Places Autocomplete + exactHotelAddress spatial anchor; transportMode selector (TrainFront/Car); TimelineCard extracted to dedicated component |
| 13 — Stripe Credit System | ✅ Complete | $4.99 per-itinerary credit (one-time, no subscription); UserProfile model (availableCredits); lazy Stripe singleton; checkout + webhook routes; credit check + fire-and-forget decrement in itinerary route; /pricing page; /dashboard with credits widget + WorldMap; /sample public acquisition funnel; PrintItinerary editorial PDF dossier; BackButton component; legal pages (/faq, /privacy, /terms, /cookies, /refunds); admin revenue + user KPIs |
| 14 — Security Hardening & Trip Deletion | ✅ Complete | 33-point security audit (all 9 findings resolved); PlaceCache `photoReference` migration (API key rotation resilience); `exactHotelAddress` blocklist regex (prompt injection hardening); `DELETE /api/trips/[id]` with neutral-404 IDOR guard and atomic `deleteMany({ id, userId })`; `DeleteDialog` Framer Motion portal with Escape/backdrop dismiss; `useOfflineTrips.deleteTrip()` with atomic localStorage sync; transit `TransitHeader` UI mode-aware display (fixes car-centric cities e.g. Dubai); `PlaceCache @@index([updatedAt])` for O(log n) cron cleanup; duplicate logging consolidated |
| 15 — Next | 🔜 Next | Sentry error monitoring; Next.js 15 + Clerk v7 upgrade (coordinated — Clerk v7 requires Next.js 15) |

---

## 25. Engineering Changelog

### 2026-03-18 — Security Hardening & Trip Deletion

**Commit:** `b93b421` · **Branch:** `main`

#### Security Audit — 33-Point Baseline

A comprehensive line-by-line audit of all 33 codebase features was completed. All 9 security findings (CRITICAL through LOW) confirmed resolved. The full audit is documented in `CuratedRoam_SecurityAudit_2026-03-19.pdf` (architect handover).

#### PlaceCache — `photoReference` Architecture

**Problem:** `PlaceCache.photoUrl` stored full Google Places photo URLs including `key=<MAPS_SERVER_KEY>`. API key rotation immediately invalidated all cached images, causing 403 errors site-wide.

**Fix:**
- New `photoReference String?` column stores the raw `photo_reference` token (key-independent).
- Photo URL is constructed fresh at serve time: `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${ref}&key=${currentKey}`.
- Old-format detection: `isOldFormat = !cached?.photoReference && !!cached?.photoUrl` — stale records expire naturally on next cache miss; no manual migration.
- `@@index([updatedAt])` added — nightly cron `deleteMany` is now an indexed range scan.
- Schema synced: `export $(grep -v '^#' .env.local | xargs) && npx prisma db push` (Prisma v5.22.0, Supabase PostgreSQL).

#### Input Validation Hardening

- `exactHotelAddress` validated with blocklist regex `/^[^<>{}`$;\\|]+$/` in `ItinerarySchema` — identical strategy to `hotelName`. Blocks shell metacharacters and prompt-injection control chars; permits all valid international address characters.
- Whitelist approach tested and rejected: `\w` is ASCII-only, breaking Arabic script, accented Latin characters, and curly quotes returned by Google Places.

#### Destination Name Fix

`CurationForm.onPlaceChanged` priority changed from `formatted_address || name` to `name || formatted_address`. Google Places `formatted_address` returns bilingual strings for non-Latin cities (e.g. `"Istanbul, İstanbul, Türkiye"`). Using `name` returns the clean, unambiguous city name.

#### Transit Display — UI Mode-Aware

`TransitHeader` component updated to accept `transportMode?: "walking-transit" | "car-driver"` prop, threaded through the component tree: `sessionStorage` → `itinerary/page.tsx` → `ItineraryViewer` → `DaySection` → `TransitHeader`.

- `walking-transit`: walking minutes displayed, driving minutes hidden.
- `car-driver`: driving minutes displayed, walking minutes hidden.

Root cause: Dubai itineraries displayed 300+ minute walk times between stops deliberately planned for private car travel.

#### Logging Consolidation

Removed unconditional `console.error("[itinerary/route]", e)` from the outer `catch` block in `api/itinerary/route.ts`. Every error was being logged twice. The discriminated `if (e instanceof SyntaxError)` block now handles all logging with a single, structured event per error.

#### Secure Trip Deletion — Full Stack

**New file:** `src/app/api/trips/[id]/route.ts`

Security model (three layers):
1. `await auth()` → 401 if unauthenticated
2. `findUnique` + `trip.userId !== userId` → neutral 404 (identical for missing and wrong-owner — no existence leak)
3. `deleteMany({ where: { id, userId } })` → DB-level ownership enforcement, eliminates TOCTOU window

**`useOfflineTrips` hook:**
- `readCache()` / `writeCache()` promoted from closure scope to module scope — required for `deleteTrip` to access them outside `useEffect`.
- `deleteTrip(id: string): Promise<void>` — calls `DELETE /api/trips/${id}`, filters state via `setTrips(prev => prev.filter(...))`, writes updated array to localStorage atomically inside the `setTrips` callback.

**`TripsClient.tsx`:**
- Each trip card gains a `Trash2` "Remove" action.
- `DeleteDialog` — `createPortal(…, document.body)` Framer Motion overlay. Features: Escape key close, backdrop click dismiss, `disabled` button during in-flight request, `Loader2` spinner.
- Trip cards upgraded to `motion.article` with `exit={{ opacity: 0, scale: 0.98 }}`.

**`DeleteTripButton.tsx` (new standalone component):**
- Used on `/trips/[id]` detail page header strip.
- On success: proactively prunes `seek_wander_archive` from localStorage, then `router.push("/trips")`.
- `print:hidden` — excluded from PDF export.

---

### 2026-03-19 — `walkingTolerance` Field

**Commit:** `main`

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

---

### 2026-03-21 — Security, Legal & Model Architecture

**Commit:** `main`

#### AI Model Architecture

Tested Claude Haiku as a lower-cost alternative for JSON itinerary generation. Confirmed that `claude-sonnet-4-6` intelligence level is strictly required. Complex spatial reasoning tasks — specifically the Neighbourhood Lock (city boundary enforcement), Haversine-aware consecutive stop constraints, and negative constraint handling (e.g. "do NOT suggest Aspendos when in central Antalya") — produced incoherent or rule-violating output at Haiku tier. Model selection is non-negotiable for geographic integrity.

#### Legal Infrastructure

Finalized and deployed production-ready Privacy Policy and Terms of Service pages. Key additions beyond boilerplate:
- Explicit AI provider disclosure (Anthropic as sub-processor) with data handling clauses
- Data retention policy aligned with PlaceCache 14-day TTL and Trip storage model
- User content restrictions protecting against API key abuse via prompt injection
- Cookie and localStorage disclosure covering `seek_wander_archive` offline vault

#### API Security — Google Maps Key Hardening

Browser-facing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` locked down in Google Cloud Console with two independent restriction layers:
- **HTTP Referrer (Domain) restrictions:** Key only accepts requests from `https://travel-planner-v2-pearl.vercel.app/*` and `http://localhost:3000/*`. Any other origin receives a 403.
- **API scope restrictions:** Key restricted to Maps JavaScript API and Places API only.

Server-side `MAPS_SERVER_KEY` confirmed separate, with no HTTP referrer restriction and Places API scope only.

#### Security Hardening (Session)

- Rate limit tightened from 20 to **5 requests per hour per user**.
- Confirmed anonymous rate limit fallback uses `x-forwarded-for` IP with hard `400` rejection when neither `userId` nor IP is available. No shared `"anonymous"` Redis bucket exists.
- `npm audit` run: `flatted` prototype pollution + DoS vulnerability patched. Remaining 4 Next.js 14.x CVEs tracked; resolution blocked on Clerk v7 + Next.js 15 coordinated upgrade.
- Full 8-test security verification suite run manually and passed.

#### Security Documentation

Generated `CuratedRoam_Security_Architecture.pdf` — an 8-page security architecture document covering all implemented defences (IDOR prevention, rate limiting, header security, API key split, prompt injection hardening, cron auth, dependency audit) and the upcoming roadmap (Sentry integration, Next.js 15 upgrade). Suitable for investor review, technical due diligence, and internal architecture handover.

---

### 2026-03-22 — Stripe Credit System, Dashboard, Sample Funnel & PDF Dossier

**Branch:** `main`

#### Monetization Pivot: Per-Itinerary Credits (Not Subscription)

Replaced monthly subscription model with one-time $4.99 credit system:

- `prisma/schema.prisma`: removed `plan String`, `generationCount Int`; added `UserProfile` model with `availableCredits Int @default(1)`
- `src/lib/stripe.ts`: lazy singleton Proxy pattern; `apiVersion: "2026-02-25.clover"`
- `POST /api/stripe/checkout`: `mode: "payment"`, `metadata: { clerkUserId }`, no Stripe customer record needed
- `POST /api/stripe/webhook`: `checkout.session.completed` only; upsert `{ create: { availableCredits: 2 }, update: { increment: 1 } }` — handles both first-time buyers (never used free credit) and returning users
- `POST /api/itinerary`: credit check `profile ? profile.availableCredits : 1` (not `?? 0`); fire-and-forget decrement after successful generation
- `useItinerary.ts`: `res.status === 402` (not error string) triggers paywall modal
- `/pricing` page: one-time language, "Buy a Credit — $4.99" CTA, credits-never-expire FAQ

#### User Dashboard (`/dashboard`)

New server component with: credits widget, trip stats, WorldMap, recent journeys, quick actions. `WorldMap.tsx` uses `libraries: ["places"]` to match the `ItineraryMap` singleton loader constraint.

#### Sample Acquisition Funnel (`/sample`)

Replaced hardcoded `sampleItinerary.ts` (broken Unsplash images) with a server component that fetches a single hardcoded-UUID `Trip` from the production DB — no auth, Prisma direct access bypasses Supabase RLS. Acquisition CTA bottom section. Hero "View Sample Itinerary" button: frosted glass (`bg-white/15 border-white/60 backdrop-blur-sm`).

#### Editorial PDF Dossier (`PrintItinerary.tsx`)

New print-only component (`hidden print:block`) injected into `ItineraryViewer`. Features: `@page { margin: 0 }` browser chrome removal, cover page with massive `text-8xl` destination title, CSS Grid `80px|1fr|80px` activity layout (replaces flexbox which wraps in PDF renderers), transit connectors between rows, `<img loading="eager">` for guaranteed image loading, `getFallbackImage()` Unsplash fallbacks keyed by activity type. Editorial opener in `ItineraryViewer` marked `print:hidden` to prevent duplicate quote.

#### Admin Dashboard Expansion

Added Revenue KPIs (Stripe sessions list), User Metrics (UserProfile aggregates), and Recent Purchases table (last 20 paid sessions) to `/admin/metrics`.

#### Legal Pages

Deployed: `/pricing`, `/faq`, `/privacy`, `/terms`, `/cookies`, `/refunds`. All use `<BackButton>` for navigation.

#### UI/UX Polish

- Hero background: `fixed inset-0 z-0`; below-hero sections wrapped in `relative z-10 bg-paper`
- Destination input: `onFocus` scroll + `scroll-mt-32` navbar clearance
- Date inputs: `onFocus` scroll to `"center"`
- DASHBOARD link added to Navbar desktop nav
- Home icon (`<Home size={16}>`) in Navbar wordmark
- `cursor-pointer` on all CurationForm card-style buttons

---

### 2026-03-23 — Forked Path Regional Search Architecture

**Commit:** `df70643` · **Branch:** `main`

#### Problem

Destination autocomplete was locked to `types: ["(cities)"]`, rejecting valid regional searches like "Kansai", "Tuscany", or "Patagonia". The existing Neighbourhood Lock assumed a single-city context and produced incoherent schedules when a region was selected.

#### Solution

A `isRegion?: boolean` flag flows from the frontend through Zod validation into `buildPrompt()`, where it gates a third branch on both `neighborhoodLockRule` and `transitTimeRule`.

**`src/types/itinerary.ts`**
- Added `isRegion?: boolean` to `ItineraryRequest`

**`src/components/CurationForm.tsx`**
- Destination autocomplete: `types: ["(cities)"]` → `types: ["(regions)"]`
- `isRegion` state added (default `false`); resets to `false` on manual retype
- Region detection in `onPlaceChanged` via two `Set` lookups:
  - `CITY_TYPES`: `locality`, `sublocality`, `neighborhood`, `postal_town`, `sublocality_level_1`
  - `REGION_TYPES`: `administrative_area_level_1`, `administrative_area_level_2`, `natural_feature`, `colloquial_area`
  - Logic: `!hasCity && hasRegion` → `true`. `country` excluded (too broad)
- `<AnimatePresence>` + `<motion.p>` warning fades in (`opacity: 0→1, y: -5→0`, burnt-orange, `tracking-widest uppercase`) when region detected
- `isRegion` included in `handleSubmit()` payload

**`src/app/api/itinerary/route.ts`**
- `isRegion: z.boolean().optional()` added to `ItinerarySchema`
- `isRegion` destructured in `buildPrompt()`
- `neighborhoodLockRule`: 2-way → **3-way** (region → car → walking); region takes precedence
- `transitTimeRule`: 2-way → **3-way** (region → car → walking/tolerance); region takes precedence

**Region Mode rules injected:**
- Rule 11: Anchor each day in ONE specific city/town; days arranged in logical geographical sequence; no same-day cross-town mixing
- Rule 12: Within day's anchor city keep stops ≤30 min walk/taxi; inter-day travel expected; widen `startTime` on heavy travel days

**Security:** `isRegion` is `z.boolean().optional()` — Zod rejects non-boolean values before `buildPrompt()`. Rules are hardcoded strings, not user-interpolated — no injection surface.

---

### 2026-03-23 — Architecture Pivot: Dedicated Curation Page + Hero Refactor

**Commit:** `e2a4c9b` · **Branch:** `main`

#### Dedicated `/curate` Route

`src/app/curate/page.tsx` created as a clean, distraction-free form page:
- `bg-paper` layout with `Navbar`, `BackButton` (ChevronLeft, `micro-copy` style), and staggered Framer Motion fade-ins
- `CurationForm` and its `handleGenerate` routing logic moved here from `page.tsx`
- `sessionStorage.setItem("itineraryRequest", JSON.stringify(data))` then `router.push("/itinerary")`

#### Homepage Hero — Pure Editorial

`src/app/page.tsx` hero section refactored to editorial-only:
- `CurationForm` removed entirely from the landing page
- "BEGIN YOUR JOURNEY" primary CTA button added — `bg-burnt-orange text-white micro-copy`, links to `/curate`
- "View Sample Itinerary" ghost button retained below it — `bg-white/15 border-white/60 backdrop-blur-sm`
- CTAs positioned `absolute bottom-16 right-10 md:right-20` with `flex flex-col items-end gap-6`
- Scroll indicator moved to `absolute bottom-10 left-1/2 -translate-x-1/2`; Framer Motion float animation: `initial={{ y: 0, opacity: 0.4 }} animate={{ y: 10, opacity: 1 }} transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}`

---

### 2026-03-23 — Dynamic Day Filter on ItineraryMap

**Commit:** `fe41abf` · **Branch:** `main`

**`src/components/ItineraryMap.tsx`**
- `activeDay` state: `useState<number | "all">("all")`
- `filteredPoints` via `useMemo` — when `activeDay` is a number, shows only `point.day === activeDay`; `"all"` shows everything
- Polyline and Markers both render `filteredPoints` (not full `mapPoints`)
- `useEffect` on `activeDay` change: single point → `map.setZoom(14)`, multiple → `map.fitBounds(bounds)` re-centers automatically; `setActiveMarker(null)` closes stale InfoWindows
- Floating pill UI: `absolute top-4 left-1/2 -translate-x-1/2 z-10`, frosted glass `bg-white/80 backdrop-blur-md border border-white/20 rounded-full px-2 py-1`
- Active pill button: `bg-ink text-paper rounded-full px-4 py-1`; inactive: `text-ink/40 hover:text-ink/60 px-3 py-1`
- `motion.div` fade-in on load (`opacity 0→1, y -8→0`)
- Pill hidden when `visibleDays.length <= 1` (single-day itineraries)

---

### 2026-03-23 — Client Support Form

**Commits:** `3926215`, `ffb249b`, `4d7aefe`, `b32334d` · **Branch:** `main`

#### New Model — `SupportTicket`

Added to `prisma/schema.prisma` and synced to Supabase:
```prisma
model SupportTicket {
  id        String   @id @default(uuid())
  email     String
  message   String
  status    String   @default("open")
  createdAt DateTime @default(now())
}
```

#### Rate Limiting — `src/lib/ratelimit.ts`

New `supportRatelimit` export: `slidingWindow(3, "1 h")`, prefix `"seek-wander:support"`. IP-keyed. Dev fallback: `"127.0.0.1"` when `NODE_ENV === "development"` (no `x-forwarded-for` on localhost).

#### `src/app/api/support/route.ts` — New File

POST endpoint security model: IP rate limit (3/hr) → Zod safeParse → `prisma.supportTicket.create()` → fire-and-forget Resend email → `{ success: true }`.
- `new Resend()` instantiated lazily inside the handler (not module-level) — prevents 500 if `RESEND_API_KEY` is absent
- Zod field errors flattened to a single string before returning 400 (prevents "Something went wrong" fallback in UI)
- Message `min(1)` — no artificial length floor on support submissions
- Resend `from: "onboarding@resend.dev"`, `replyTo: email`, `to: "zenithai003@gmail.com"`

#### `src/app/support/page.tsx` — New File

Mirrors `/curate` layout exactly. `idle → sending → success → error` state machine. `AnimatePresence` swaps form for confirmation on success. Inline burnt-orange error copy on failure. Reuses `BackButton` component.

#### Footer Update — `src/app/page.tsx`

`mailto:hello@seekwander.com` Contact anchor → `<Link href="/support">Support</Link>`.

#### Environment Variable Added

`RESEND_API_KEY` — add to Vercel env vars. Free tier: 3,000 emails/month via `onboarding@resend.dev`. Future: change `from` to `support@seekwander.com` once custom domain verified.

---

### 2026-03-23 — Dynamic Dashboard Metrics

**Commit:** `aa4b98a` · **Branch:** `main`

#### Problem

Dashboard "TRIPS GENERATED" stat was displaying `allTrips.length` (saved trips count) — wrong metric. Users who generate but don't save saw incorrect numbers.

#### Solution

**`prisma/schema.prisma`** — `totalGenerations Int @default(0)` added to `UserProfile`. Existing rows default to `0`; no backfill needed.

**`src/app/api/itinerary/route.ts`** — fire-and-forget `upsert` at Step 7 now increments both fields atomically:
```ts
create: { id: userId, availableCredits: 0, totalGenerations: 1 },
update: { availableCredits: { decrement: 1 }, totalGenerations: { increment: 1 } },
```
Anonymous users (no `userId`) unaffected — block is guarded by `if (userId)`.

**`src/app/dashboard/page.tsx`**:
- `generatedCount = profile?.totalGenerations ?? 0` — real AI call count
- `savedCount = allTrips.length` — persisted Trip rows
- Stats grid: `grid-cols-1 md:grid-cols-3` → `grid-cols-2 md:grid-cols-4`
- New `Bookmark` icon import; "TRIPS SAVED" StatCard added
- Icon reassignment: `Zap` → Generated, `Bookmark` → Saved, `MapPin` → Destinations, `Calendar` → Days Planned

---

### 2026-03-27 — TravalBee Rebrand, Sentry Observability & Freemium Launch State

#### Global Brand Rename
All instances of "Seek Wander" / "Curated Roam" → "TravalBee" across 23+ `src/` files. Mapping: `"Seek Wander"` / `"Curated Roam"` → `"TravalBee"`, `"seek-wander"` Redis prefix → `"travalbee"`, `seekwander.com` → `travalbee.com`. `seek_wander_archive` localStorage key intentionally preserved — renaming it would break all existing offline caches for users who have already generated itineraries.

#### Sentry Observability
`@sentry/nextjs` installed via wizard and all generated files committed: `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/app/global-error.tsx`. `next.config.mjs` wrapped with `withSentryConfig`. `layout.tsx` converted from `export const metadata` → `export function generateMetadata()` so `Sentry.getTraceData()` runs per-request (not once at build time). `POST /api/itinerary` outer catch instruments both `SyntaxError` and generic error branches with `Sentry.withScope({ destination })` — `AbortError` (client navigated away) intentionally excluded to avoid noise.

#### Freemium Launch State
Premium tier checkout button locked: text → "Coming Soon", `opacity-50 cursor-not-allowed pointer-events-none` applied, `handleUpgrade` / `onClick` removed. Free tier: 5 itineraries/month, max 3 days/trip. Premium features listed but locked: 10 itineraries/month, 14 days/trip, advanced transit (car/regional), premium PDF with maps, priority AI processing, 1-click calendar sync, 1-click restaurant & tour booking links.

#### Exact Token Cost Tracking
`CostLog` Prisma model updated with `inputTokens Int`, `outputTokens Int`, `thinkingTokens Int` columns. `POST /api/itinerary` extracts real token counts from the Anthropic SDK response (`usage.input_tokens`, `usage.output_tokens`). `/admin/metrics` sums `aiCost` directly from the DB column rather than estimating from a hardcoded multiplier.

---

### 2026-04-05 — Icon Pack, Navbar Polish, Hero Slideshow & UX Hardening

**Commits:** `a8623eb`–`8f7b348` · **Branch:** `main`

---

#### TravalBee Icon Pack — Full Replacement

All app icons replaced with the official TravalBee icon pack:

- **`src/app/favicon.ico`** — removed; Next.js now serves the browser tab icon from `src/app/icon.png` (512×512) for sharper rendering at all DPR levels
- **`src/app/apple-icon.png`** — 180×180 PNG; auto-served by Next.js App Router as `apple-touch-icon`
- **`src/app/icon.png`** — 512×512 PNG; used as Next.js metadata icon and browser tab fallback
- **`public/icon-192x192.png`** — PWA manifest icon (192×192)
- **`public/icon-512x512.png`** — PWA manifest icon (512×512)

No changes to `src/app/manifest.ts` — icon `src` paths were already correct.

---

#### Executive PRD — `docs/TravalBee_Executive_PRD_V1.pdf`

11-page investor/CEO-ready PDF generated via `reportlab` (Python). Sections: Executive Vision, Market Positioning & The Problem, Product Strategy (Freemium Wedge), Core UX, Technical Architecture & SRE, Precision Unit Economics. Colour palette matches brand tokens (paper/ink/burnt-orange/emerald). Dark cover page with logo, branded footer with page numbers on all inner pages. Placed in `/docs/` alongside existing due-diligence PDFs.

---

#### Navbar — Logo Sizing & Nav Order

**`src/components/Navbar.tsx`**

- Logo size iterated to final value: `width={120} height={120}` (`w-[120px] h-[120px]`)
- Negative vertical margins `style={{ marginTop: "-32px", marginBottom: "-32px" }}` absorb the logo overflow without expanding navbar height — `py-5` padding on `<motion.nav>` unchanged
- Wordmark font size: `text-2xl` → `text-4xl` (Cormorant Garamond italic)
- Home icon (`<Home size={22} strokeWidth={1.5} />`) moved to first position in desktop nav — order is now: Home → MY TRIPS → DASHBOARD → PRICING
- Home icon size increased from `16` → `22`

---

#### Support Email Recipient

**`src/app/api/support/route.ts`**

- Resend `to` field updated: `"zenithai003@gmail.com"` → `"travalbee@outlook.com"`

---

#### Credits Hint — Inline Banner

**`src/components/CurationForm.tsx`**

- `showCreditsHint: boolean` state added
- `useEffect` on mount: reads `sessionStorage.getItem("travalbee_credits_hint_shown")` — if absent, sets it and schedules `setShowCreditsHint(true)` after 600ms via `setTimeout` (cleared on unmount)
- Destination `<input>` `onFocus` handler extended: calls `setShowCreditsHint(false)` — banner dismisses the instant the user clicks the search field
- `<AnimatePresence>` + `<motion.div>` banner renders flush below the search bar (shares `border-t-0` to form a seamless join). Contains inline `<a href="/dashboard">` link and a `×` dismiss button
- Animation: `initial={{ opacity: 0, y: -4 }}` → `animate={{ opacity: 1, y: 0 }}` → `exit={{ opacity: 0, y: -4 }}`, `duration: 0.3`
- Old `sonner` toast implementation in `src/app/curate/page.tsx` fully removed

---

#### Privacy Page — Vendor Anonymisation

**`src/app/privacy/page.tsx`** — Section 4 (Third-Party Services):

Named vendors replaced with generic category labels (legal obligation is disclosure of *categories*, not specific vendors):

| Old | New |
|-----|-----|
| Anthropic (Claude) | AI Inference Provider |
| Google Maps Platform | Mapping & Location Services |
| Clerk | Identity & Authentication Provider |
| Booking.com | Hotel Booking Partner |
| Vercel | Cloud Infrastructure Provider |

Data handling language and the no-training-on-API-inputs clause preserved verbatim.

---

#### Hero — Rotating Background Slideshow

**`src/components/HeroFloating.tsx`**

- `BG_IMAGES` array: 7 high-quality Unsplash scenic images (alpine peaks, turquoise coastline, ancient forest, jungle waterfall, desert dunes, misty fjord, white sand beach) — all at `q=90`, `w=1920`
- `getShuffled<T>(arr: T[]): T[]` — Fisher-Yates in-place shuffle; returns new array; called once on mount via `useState(() => getShuffled(BG_IMAGES))`
- `bgIndex` state incremented every 6 000ms via `setInterval`; wraps via `% shuffled.length`
- Background rendered via `<AnimatePresence mode="sync">` → `<motion.div key={bgIndex}>` with `initial={{ opacity: 0 }}` / `animate={{ opacity: 1 }}` / `exit={{ opacity: 0 }}`, `transition={{ duration: 1.8, ease: "easeInOut" }}` — slow cinematic crossfade
- Gradient overlay (`from-black/65 via-black/25 to-black/60`) sits above all image layers via `absolute inset-0`; text legibility unaffected by image content
- First image: `priority={bgIndex === 0}` — only the initial image gets LCP priority hint

---

#### ItineraryMap — Day Filter Pill Restyled

**`src/components/ItineraryMap.tsx`**

- Pill container: `bg-white/80 backdrop-blur-md border border-white/20` → `bg-black/90 backdrop-blur-md border border-white/10`
- `pillActive`: `bg-ink text-paper` → `bg-burnt-orange text-white`
- `pillInactive`: `text-ink/40 hover:text-ink/60` → `text-white/50 hover:text-white/80`

---

#### Offline Mode — Feature Flag

**`src/hooks/useOfflineTrips.ts`**

- `OFFLINE_MODE_ENABLED = false` constant added at module scope — single toggle to restore full offline behaviour
- When `false`: `navigator.onLine` short-circuit disabled; offline banner (`isOffline`) never set to `true`
- Cache write (`writeCache(fresh)`) and cache fallback on fetch failure (`setTrips(readCache())`) remain **always active** regardless of flag — trips never disappear on fetch error; data integrity preserved
- To re-enable: set `OFFLINE_MODE_ENABLED = true`

---

#### Pricing — Premium Feature Addition

**`src/app/pricing/page.tsx`**

- `PRO_FEATURES` array: `"Dedicated AI Concierge for personalised travel enquiries"` inserted between `"Up to 14 days per trip"` and `"Advanced Transit (Car/Regional)"`

---

### 2026-04-05 22:18 UTC — Stripe Subscription Hardening, Premium Tier Enforcement & Legal Compliance

**Commits:** `3166f0d`–`bdc401f` · **Branch:** `main`

---

#### Stripe — Subscription Model End-to-End

**`src/app/api/stripe/checkout/route.ts`**

- `mode: "payment"` → `mode: "subscription"` — aligns with recurring $10.99/month Stripe product
- `subscription_data: { metadata: { clerkUserId: userId } }` added so `clerkUserId` flows through the Stripe lifecycle to `invoice.payment_succeeded` events
- `success_url` updated to `/dashboard?subscribed=1`

**`src/app/api/stripe/webhook/route.ts`**

- Three lifecycle events now handled:
  - `checkout.session.completed` — grants 10 credits, sets `isPremium: true`, saves `stripeCustomerId`
  - `invoice.payment_succeeded` (billing_reason `subscription_cycle` only) — resets credits to 10 on renewal
  - `customer.subscription.deleted` — sets `isPremium: false, availableCredits: 0`
- Idempotency enforced via `StripeEvent` table: `prisma.stripeEvent.create({ data: { stripeEventId: event.id } })` before any processing; unique constraint violation = duplicate → return 200 immediately
- `stripeCustomerId` extracted from `session.customer` and persisted to `UserProfile` on `checkout.session.completed`

---

#### Prisma Schema — `UserProfile` + `StripeEvent`

**`prisma/schema.prisma`**

- `UserProfile`: added `isPremium Boolean @default(false)` — single source of truth for subscription tier
- New `StripeEvent` model:
  ```prisma
  model StripeEvent {
    id            String   @id @default(uuid())
    stripeEventId String   @unique   // Stripe event ID — enforces idempotency
    type          String
    processedAt   DateTime @default(now())
  }
  ```
- Schema synced to Supabase via `npx dotenv -e .env.local -- prisma db push`

---

#### Premium Tier Enforcement — Quota Gate Refactor

**`src/app/api/itinerary/route.ts`**

- `isPremium` hoisted to outer scope (was scoped inside `if (userId)` block — inaccessible to downstream checks)
- Quota logic split by tier:
  - **Premium:** `availableCredits <= 0` is the sole gate — bypasses rolling CostLog count entirely. CostLog counts from before subscription would incorrectly block new subscribers who tested as free users.
  - **Free:** rolling 30-day `CostLog.count()` check retained; hard cap at 5
- Hardcoded `if (safeBody.duration > 3)` block (line 628) removed — was blocking all users including premium regardless of tier. Duration gate now lives exclusively inside the free-tier `else` branch.
- Credit decrement: `prisma.userProfile.updateMany({ data: { availableCredits: { decrement: 1 } } })` after successful generation

---

#### Stripe Customer Portal — Subscription Management

**`src/app/api/stripe/portal/route.ts`** *(new file)*

- `GET /api/stripe/portal` — authenticated route (Clerk `auth()`)
- Looks up `profile.stripeCustomerId`; creates `stripe.billingPortal.sessions.create({ customer, return_url: /dashboard })` and redirects
- Full `try/catch` around portal session creation — returns structured 500 JSON if Stripe portal is not activated, rather than crashing silently
- Redirects to `/pricing` if no `stripeCustomerId` on record
- Dashboard "Manage subscription →" link uses `<a>` (not Next.js `<Link>`) — required to follow server-side 307 redirect to Stripe's external URL

---

#### `/api/user/profile` — Client-Side Tier Detection

**`src/app/api/user/profile/route.ts`** *(new file)*

- `GET /api/user/profile` — returns `{ isPremium, availableCredits }` for the authenticated Clerk user
- Used by: `CurationForm` (calendar unlock), `pricing/page.tsx` (hide upgrade button for existing subscribers)

---

#### Dashboard — Premium UI & Dynamic Credit Sync

**`src/app/dashboard/page.tsx`**

- Profile fetch logic made tier-aware: `existingProfile.isPremium === true` → skip credit overwrite entirely (webhook owns premium credits); free users still sync via `5 - monthlyCount`
- Quota widget background: `bg-ink` → `bg-burnt-orange` when `isPremium`
- Widget label: `"FREE TIER — THIS MONTH"` → `"PREMIUM — THIS MONTH"` conditionally
- Right panel: `"Premium Active"` badge (border-paper/30) + `"Manage subscription →"` `<a>` link visible for premium users
- Free tier at 0 credits: `"Upgrade to Premium →"` CTA link added

---

#### Pricing Page — Existing Subscriber State

**`src/app/pricing/page.tsx`**

- `useEffect` on mount: fetches `/api/user/profile`; sets `isPremium` state if true
- Premium card CTA renders three states:
  1. `isPremium` → greyed-out `"✓ You're on Premium"` badge (no upgrade button)
  2. `isSignedIn` → `"Upgrade to Premium"` button → Stripe checkout
  3. Not signed in → `<SignInButton mode="modal">` → `"Sign in to Upgrade"`
- FAQ: `"Do my credits expire? No. Credits never expire."` → `"When do my itinerary credits reset?"` with accurate monthly rolling window description

---

#### Photo Route — Cache Leak Fix

**`src/app/api/photo/route.ts`**

- `Response.redirect(googleUrl, 301)` → `Response.redirect(googleUrl, 302)` — prevents browsers caching the redirect permanently; the `MAPS_SERVER_KEY` query param was being stored in browser cache and DevTools network history

---

#### Legal Compliance — Cookie Banner, Affiliate Disclosure, Privacy Update

**`src/components/CookieBanner.tsx`** *(new file)*

- Fixed bottom bar rendered on first visit if `localStorage.getItem("travalbee_cookie_consent")` is absent
- Two actions: `"Accept All"` → sets `"accepted"`; `"Decline"` → sets `"declined"`; both hide banner
- `print:hidden` — excluded from PDF export
- Added to root layout: `src/app/layout.tsx`

**`src/components/InteractiveStays.tsx`**

- Affiliate disclosure appended below hotel cards: `"TravalBee earns a commission if you book through these links at no extra cost to you."` — satisfies FTC/ASA clear-and-conspicuous proximity requirement

**`src/app/privacy/page.tsx`** — Section 4 updated:

| Vendor | What was added |
|--------|---------------|
| Anthropic | Named explicitly; no-training clause preserved |
| Google Maps Platform | Named; Google Privacy Policy reference added |
| Clerk | Named; email storage + session token handling disclosed |
| Stripe | New entry: PCI-DSS, no card storage on TravalBee side |
| Booking.com | Commission disclosure bolded per FTC requirement |
| Vercel | Named explicitly |

---

#### CurationForm — 14-Day Calendar Unlock for Premium

**`src/components/CurationForm.tsx`**

- `useEffect` on mount: fetches `/api/user/profile`; sets `isPremium` state
- `const maxDays = isPremium ? 14 : 3` — single derived constant controlling all date constraints
- `computeDuration(departure, returnDate, maxDays)` — third parameter added; `Math.min(3, ...)` → `Math.min(maxDays, ...)`
- `maxReturn` date input upper bound: `departure + 2` → `departure + (maxDays - 1)`
- Duration badge: `duration === 3 → "(3-day max)"` → `duration === maxDays → "({maxDays}-day max)"`
- **Bug fix:** `maxDays` was initially declared after the `useMemo` that referenced it in its dependency array — `const` temporal dead zone caused `ReferenceError: Cannot access 'Q' before initialization` at Vercel prerender. Fixed by hoisting `maxDays` above the `useMemo` call.
- Practical ceiling: 7-day trips generate successfully within `max_tokens: 8192`; 13-day trips hit token limit. Raising to `max_tokens: 16000` deferred to future milestone.

---

### 2026-04-08 — Mobile QA, iOS Scroll Debugging & PDF Print Engine

**Commits:** `cc5b060` → `2497f2a` · **Branch:** `main`

---

#### Day Tab Horizontal Scroll — Root Cause & Definitive Fix

Multiple iterations were required to isolate the true cause of tab scroll truncation (clips at Day 2 on small phones, Day 4 on larger screens).

**Root causes identified (in order of discovery):**

1. `snap-mandatory` — iOS snaps back to the last reachable snap point when snap-start positions exceed `maxScrollLeft`; Days 5+ had no reachable snap point. Fixed by removing all snap classes.
2. `flex` + `overflow-x: auto` on sticky subtrees — documented WebKit bug: Safari restricts internal horizontal scroll on `position: sticky` elements with `overflow-x`. Fixed by removing `md:sticky` on mobile.
3. `overflow-x: auto` iOS miscalculation — Safari sometimes returns 0 scrollable width on auto. Fixed by switching to `overflow-x: scroll` (always-on).
4. `flex-shrink: 1` default — flex children were silently squishing despite `w-max`, compressing the scroll track to viewport width. Root cause of all truncation.

**Final architecture (definitive — `src/components/ItineraryViewer.tsx`):**

- `sticky top-0 z-50` outer shell — no `overflow-x` on this element (avoids iOS sticky+overflow-x bug)
- `overflow-hidden` clipping shell — caps the bar to container width, forces internal scroll instead of bleed
- `flex overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]` inner scroll track
- `flex-none shrink-0` on every tab button — the critical invariant; `maxScrollLeft` = exact sum of all button widths
- `bg-[#111111]` dark bar — eliminates `backdrop-blur` stacking context interactions
- Removed `motion.div` wrapper — Framer Motion miscalculates hidden-overflow children widths
- Removed `-mx-10 md:px-10` negative margin trick — was a hidden source of width miscalculation on desktop

**Files changed:** `src/components/ItineraryViewer.tsx`

---

#### Map Day Filter Pill — Same Fix Applied

The floating pill inside `ItineraryMap.tsx` had the identical root cause: `motion.div` wrapper + buttons without `flex-none shrink-0` caused Day 5+ to be unreachable.

**Fix cloned from working tab bar architecture:**

- Removed `motion.div`; replaced with plain `div`
- Added `overflow-hidden` outer clipping shell on the `rounded-full` container
- Inner `flex overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]` scroll track
- `flex-none shrink-0` on every pill button
- Day selector `z-index`: `z-10` → `z-[110]` — explicit protection above Google Map tile layer within modal stacking context

**Files changed:** `src/components/ItineraryMap.tsx`

---

#### Mobile Map UX — Immersive Fullscreen Modal (Airbnb Pattern)

**`src/components/MobileMapBanner.tsx`** — full UX refactor:

- **Before:** 208px thumbnail always rendered at the top of the timeline, consuming screen real estate
- **After:** map is completely `hidden` by default; toggle opens a `fixed inset-0 z-[100] h-[100dvh]` fullscreen overlay
- `100dvh` (dynamic viewport height) accounts for iOS Safari URL bar shrink/grow — map always fills the true visual viewport
- FAB rendered **outside** the map container div via `<>` fragment — never clipped by the container's stacking context in either state
- `z-[110]` FAB always sits above the `z-[100]` map overlay
- `useEffect` locks `document.body.style.overflow = "hidden"` while modal is open; cleanup restores scroll on unmount — prevents accidental timeline scroll behind the map
- FAB label: `"View Map"` → `"List View"` on toggle; `print:hidden` on both elements
- Desktop layout: completely unaffected — `hidden md:block` right panel in `itinerary/page.tsx` and `sample/page.tsx` unchanged

**Files changed:** `src/components/MobileMapBanner.tsx`, `src/components/ItineraryMap.tsx`

---

#### PDF / Print Engine — Iteration & Final State

Three approaches were attempted; the final state is approach 3.

**Approach 1 — `@media print` desktop canvas (abandoned):**
`min-width: 1024px !important; width: 1024px !important` on `html, body`. Silently ignored by iOS Safari and Android Chrome — both browsers freeze the DOM at mobile viewport width before the print renderer reads `@media print`.

**Approach 2 — Viewport meta swap (abandoned):**
`ExportPdfButton.tsx` swapped `<meta name="viewport">` to `width=1024` before calling `window.print()` inside a `setTimeout(..., 300)`. iOS Safari blocks `window.print()` inside `setTimeout` — it is not in the direct call stack of a user gesture, so the browser treats it as a blocked popup. Silent failure on the target platform.

**Approach 3 — Single-column print CSS (current — `src/app/globals.css`):**

Embraces the native single-column mobile layout and makes it print-perfect rather than forcing an unreliable desktop reflow:

| Rule | Purpose |
|------|---------|
| `@page { margin: 0.75in }` | Generous breathing room; `PrintItinerary` inline `@page { margin: 0 }` overrides margin for cover/day pages while preserving this value as fallback |
| `html, body: width 100%, min-width: 0` | Removes all forced-width overrides; clean canvas |
| `body > div: height auto, overflow visible` | Un-clamps the `h-screen overflow-hidden` split-screen app shell |
| `p/h*/span/div: word-wrap + overflow-wrap: break-word` | Prevents long place names pushing off the page edge |
| `img/svg: max-width 100%, object-fit contain, display block, break-inside avoid` | Images stay in containers; never split across pages |
| `article/section/.itinerary-card/.hotel-card: break-inside avoid` | Entire cards pushed to next page rather than sliced |
| `button/nav/.hide-on-print: display none` | Belt-and-suspenders behind component-level `print:hidden` |

**`src/components/ExportPdfButton.tsx`** reverted to synchronous `onClick={() => window.print()}`.

---

#### Auto-Scroll on Day Tab Change

**`src/components/ItineraryViewer.tsx`**

- `scrollSentinelRef` — invisible `0`-height `aria-hidden` `<div>` placed immediately above the tab bar
- `useEffect` fires on `activeDay` change; calls `scrollSentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })`
- `scrollIntoView` targets the nearest scrollable ancestor automatically: the `overflow-y-auto` left panel on desktop split-screen; the window on `/trips/[id]` and `/shared/[id]` full-page routes
- `isFirstRender` ref guards initial mount — no scroll fires when the page first loads
- Sentinel positioned above the tab bar (not page top) — scroll lands with the day selector visible at the top of the viewport, not the editorial opener

---

### 2026-04-08 — Pre-Launch Polish & Email Infrastructure

**Commits:** `dd930ef` · `a785327` · `2e81f0a` · `bde9f70` · `e5fd7cd` · `b578b0f` · **Branch:** `main`

---

#### 1. Map Marker & Legend — High-Contrast Jewel Tone Palette

**File:** `src/components/ItineraryMap.tsx`

The previous `DAY_PALETTE` entries for days 1–5 used muted tones (Champagne, Slate, Midnight, Emerald, Rose) that blended into the Google Maps basemap. Replaced with high-contrast jewel tones that remain legible on all map backgrounds:

| Day | Old | New | Name |
|-----|-----|-----|------|
| 1 | `#D4AF7A` | `#9C4300` / stroke `#7A3400` | Deep Terracotta |
| 2 | `#64748B` | `#1E5631` / stroke `#163E24` | Forest Green |
| 3 | `#1E293B` | `#0F254B` / stroke `#091A36` | Navy Blue |
| 4 | `#059669` | `#B89741` / stroke `#8F7530` | Rich Gold |
| 5 | `#E11D48` | `#4A2545` / stroke `#351A32` | Deep Plum |

Both map markers and the day legend derive from `DAY_PALETTE`, so both update automatically. `CLAUDE.md` and `MEMORY.md` updated to reflect the new canonical palette.

---

#### 2. Mobile Date Picker — Enforced min/max Validation

**File:** `src/components/CurationForm.tsx`

**Problem:** iOS Safari and other mobile browsers ignore HTML `min`/`max` attributes on `<input type="date">`, allowing users to select a return date before the departure date or beyond the 3-day maximum.

**Fix — `handleReturnChange`:** Now clamps the incoming value to `[minReturn, maxReturn]` in JavaScript before setting state. Mobile browsers cannot bypass an `onChange` clamp.

**Fix — `handleDepartureChange`:** Now also clears `returnDate` if shifting the departure date pushes it above the new `maxReturn` (previously only cleared when `returnDate <= departureDate`). Computes `newMaxStr` and `newMinStr` from the new departure before evaluating.

---

#### 3. Auth Gate — "Begin Your Journey" & `/curate` Route

**Files:** `src/components/BeginJourneyButton.tsx` (new), `src/components/HeroFloating.tsx`, `src/components/HeroClassic.tsx`, `src/app/curate/page.tsx`, `src/app/curate/CurateClient.tsx` (new)

**Problem:** Unauthenticated users could click "Begin Your Journey" and access the curation form at `/curate` directly, bypassing auth entirely.

**Solution — three layers:**

1. **`BeginJourneyButton.tsx`** — new `"use client"` component using Clerk's `<SignedIn>` / `<SignedOut>`. Authenticated users get a direct `<Link href="/curate">`. Unauthenticated users get `<SignInButton mode="modal" forceRedirectUrl="/curate">` — Clerk opens the sign-in modal and redirects to `/curate` after a successful sign-in.

2. **Hero components** — `HeroFloating.tsx` and `HeroClassic.tsx` both replace the bare `<Link href="/curate">` with `dynamic(() => import("./BeginJourneyButton"), { ssr: false })`. Mirrors the exact `NavbarAuth` pattern — prevents SSR throws when `ClerkProvider` is absent in keyless-mode builds. Loading fallback renders the button visually identical to prevent layout shift.

3. **`curate/page.tsx` server component auth guard** — converted from `"use client"` to an `async` server component. `await auth()` runs server-side; unauthenticated direct URL access receives a hard `redirect("/")` before any form content renders. Client logic (`useRouter` + `CurationForm`) moved to `CurateClient.tsx`.

---

#### 4. Global Email Standardisation

**Files:** `src/app/faq/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/cookies/page.tsx`, `src/app/refunds/page.tsx`

Replaced all placeholder contact emails with `travalbee@outlook.com` across all legal and support pages — 9 instances total:

| Old address | Files affected |
|---|---|
| `hello@travalbee.com` | faq (x2), terms (x2), refunds (x2) |
| `privacy@travalbee.com` | faq (x1), privacy (x2), cookies (x2) |

`src/app/api/support/route.ts` was already routing to `travalbee@outlook.com` — confirmed correct, no change needed. Bonus fix: stray "Seek Wander" brand reference on `terms/page.tsx:34` corrected to "TravalBee".

---

#### 5. FAQ — Account & Billing Sync with Live Pricing

**File:** `src/app/faq/page.tsx`

The Account & Billing FAQ section contained stale copy that no longer matched the live Pricing page. Rewrote two answers:

| Question | Before | After |
|---|---|---|
| Is there a free tier? | "First itinerary completely free" (implied one-time) | 5 itineraries/month, 3-day max, Basic PDF, Standard Routing |
| What does the paid plan include? | "Unlimited itinerary generations" (incorrect) | $10.99/month, 10/month, 14-day max, AI Concierge, Advanced Transit |

Account deletion email link in the FAQ accordion body updated to `travalbee@outlook.com` with a live `mailto:` anchor.

---

#### 6. Smart Back Button — `router.back()` with History Guard

**File:** `src/components/BackButton.tsx`

**Problem:** The shared `BackButton` component used a static `<Link href="/">`, forcing users who arrived via the footer back to the homepage top instead of their previous scroll position.

**Fix:** Replaced `<Link>` with a `<button>` that calls `router.back()` when `window.history.length > 1`, falling back to `router.push(href)` for direct navigation (no history entry). Since all six legal/support pages (FAQ, Privacy, Terms, Cookies, Refunds, Support) already import `BackButton`, one file change covers the entire site.

---

#### 7. Privacy Policy — Tech Stack Obfuscation

**File:** `src/app/privacy/page.tsx` — Section 4 "Third-Party Services"

Replaced specific vendor names with generic category headings to reduce infrastructure fingerprinting. Anthropic and Clerk retained verbatim (required for legal transparency re: data processing and AI training policy).

| Was | Now |
|---|---|
| Google Maps Platform | Mapping and Location Services |
| Stripe | Secure Payment Processors |
| Booking.com (Affiliate Partner) | Accommodation and Travel Partners |
| Vercel | Cloud Infrastructure Providers |

All legally material language preserved: PCI-DSS compliance, commission disclosure, no card storage, no AI training opt-in.

---

#### 8. Support Form Email Infrastructure — Resend + `travalbee.com` Domain

**File:** `src/app/api/support/route.ts`

**Problem:** Support form was silently failing to deliver emails. Root causes:
1. `from: "onboarding@resend.dev"` (Resend sandbox) can only deliver to the Resend account email — not to `travalbee@outlook.com`.
2. No guard for missing `RESEND_API_KEY` — failure was completely silent.

**Fixes applied:**
- `RESEND_API_KEY` guard: explicit `console.error` fires before any send attempt if the key is absent.
- `RESEND_FROM_ADDRESS` env var: controls sender address; falls back to sandbox address.
- `RESEND_TO_ADDRESS` env var: controls recipient inbox; defaults to `travalbee@outlook.com`. Both addresses configurable from Vercel without a code deploy.
- Structured `.catch()` logging: surfaces exact Resend error name and message (`ValidationError`, `AuthenticationError`) in Vercel function logs.

**Domain setup completed:**
- `travalbee.com` verified in Resend via manual DNS — 3 records added to Vercel DNS (DKIM TXT, SPF MX, SPF TXT).
- Vercel environment variables confirmed set: `RESEND_FROM_ADDRESS=support@travalbee.com`, `RESEND_TO_ADDRESS=travalbee@outlook.com`.
- End-to-end delivery confirmed: support form → `/api/support` → Resend → `travalbee@outlook.com` ✓

---

## V1.1 Post-Launch Security Polish (To-Do)

- [ ] **Framework Patch:** Upgrade Next.js to the latest 14.x patch to resolve CVEs.
- [ ] **Strict TypeScript:** Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from `next.config.mjs`, and resolve pre-existing TS errors in `api/itinerary/route.ts` and `api/stripe/webhook/route.ts`.
- [ ] **Security Headers:** Add a Content-Security-Policy (CSP) to `next.config.mjs`.
- [ ] **API Protection:** Add a Clerk `auth()` check to `GET /api/photo/route.ts`.
- [ ] **Dependency Audit:** Run `npm audit fix` to clear transitive dev-dependency warnings.
- [ ] **Email Delivery Audit:** Verify live Vercel environment variables for the Support page email routing API.

