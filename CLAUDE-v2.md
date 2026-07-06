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

---

## April 26, 2026 — 11:25 PM EDT

### Session Summary: Dual Planning Modes, Sample Itinerary Fixes & Resilience Patches

---

#### 1. Dual Planning Modes — "Inspire Me" & "Tailor My Trip" (Frontend Architecture)

A second entry point was added to the `/curate` page alongside the existing "Inspire Me" flow. The mode toggle is an inline pill selector rendered in `CurateClient.tsx` with `AnimatePresence` swapping both the editorial header copy and the form component.

**`CurateClient.tsx`** — updated with:
- `mode: "inspire" | "tailor"` state
- Mode toggle UI: two-button pill group (`Inspire Me` / `Tailor My Trip`) with `bg-ink text-paper` active state
- `AnimatePresence mode="wait"` keyed header swap (kicker, headline, sub-copy per mode)
- `AnimatePresence mode="wait"` keyed form swap (`CurationForm` for Inspire, `TailorForm` for Tailor)
- `loading` state + `handleGenerate` that writes to `sessionStorage` and pushes to `/itinerary`

**`src/lib/dateUtils.ts`** — NEW FILE. Four date utility functions extracted from `CurationForm.tsx` to eliminate duplication and allow `TailorForm` to share them:
- `getLocalToday(): string` — timezone-safe today date in `YYYY-MM-DD`
- `parseDateLocal(dateStr: string): Date`
- `formatDateLocal(d: Date): string`
- `computeDuration(departure: string, returnDate: string, maxDays: number): number`

`CurationForm.tsx` updated to import from `@/lib/dateUtils` — zero logic change.

**`src/components/TailorForm.tsx`** — NEW FILE. Full Mode B intake form:
- Google Places Autocomplete destination field (same pattern as `CurationForm`)
- Departure / return date pickers (uses `dateUtils`)
- Travel party pills (`solo` / `couple` / `family` / `group`)
- Budget tier cards (`premium` / `luxury` / `ultra-luxury`)
- `anchorPoints` textarea — auto-expanding, 2000-char limit with live counter (turns burnt-orange at >1800 chars), placeholder: *"Going to Rome, staying at Hotel Eden, must visit the Colosseum on Day 2…"*
- `isComplete` guard requires destination, dates, party, budget, and ≥10 chars of anchor text
- Submit payload hardcodes `pace: "moderate"`, `dietary: ["none"]`, `walkingTolerance: "relaxed"`, `planningMode: "tailor"`, and passes `anchorPoints` verbatim
- Framer Motion fade-in-up root `motion.div`; staged expansion (destination first → rest unlocks)

---

#### 2. Backend AI Prep — Tailor Mode Architecture (Not Yet Wired)

The API route (`src/app/api/itinerary/route.ts`) has been architecturally prepared for Mode B but **the prompt branching is not yet active**. What was planned and will be completed in the next session:

- `ItinerarySchema` Zod additions: `planningMode: z.enum(["inspire", "tailor"]).optional()` and `anchorPoints: z.string().max(2000).regex(…).optional()` with a `.superRefine()` requiring anchor text when mode is `"tailor"`
- `buildTailorPrompt(data: ItineraryRequest): string` — new function alongside `buildPrompt()`. Structures anchor points inside `---BEGIN/END ANCHOR POINTS---` fences with five explicit anchor fidelity rules. Gap-filling instructions cluster new items geographically around the anchors. Hotel extraction via regex injects a `baseCamp` into the client profile block.
- POST handler branch: `const isTailor = safeBody.planningMode === "tailor"` → routes to `buildTailorPrompt` or `buildPrompt`. Mode B always suppresses `recommendedStays`.
- `useItinerary.ts` fingerprint update: add `planningMode` and `anchorPoints` to `buildFingerprint()` so identical Mode B submissions hit the cache.
- `StoredRequestSchema` in `itinerary/page.tsx`: add `planningMode` and `anchorPoints` fields.
- `GenerationLoader.tsx`: add `mode` prop + `TAILOR_STEPS` copy variant ("Reading your anchor points…", "Locking in your fixed plans…", etc.).

The output JSON schema (`ItineraryResponse`) is **unchanged** — Mode B produces the identical `timeline[]`-based shape, so `ItineraryViewer`, the map, PDF export, and sharing all work without modification.

---

#### 3. Loading Screen Race Condition Fix (`useItinerary.ts`)

**Problem:** In React 18 Strict Mode, `useEffect` runs twice on mount (mount → cleanup → mount). The first mount's `AbortController` is cancelled during cleanup, triggering the `catch` block's `setLoading(false)` and the `finally` block's `setLoading(false)` — both of which overwrite the second (real) request's `loading=true`. Result: the page sits blank for the full AI generation time (~60s) with no spinner and no error.

**Fix:** Two staleness guards added:
- `catch` block: `if (abortRef.current !== controller) return null` — stale aborted requests exit immediately without touching state
- `finally` block: `if (abortRef.current === controller) setLoading(false)` — only the active request may clear the loading flag

This fix applies to both "Inspire Me" and "Tailor My Trip" modes.

---

#### 4. Missing PDF Export Button on Live Itinerary Page (`itinerary/page.tsx`)

**Problem:** `ExportPdfButton` (which calls `window.print()`) existed on saved trips (`/trips/[id]` via `TripHeaderActions`) and the sample page, but was never added to the live `/itinerary` page. Neither Inspire Me nor Tailor My Trip had a download option.

**Fix:** `ExportPdfButton` added in two locations inside `itinerary/page.tsx`:
- **Desktop header strip** — inside the `{itinerary && (…)}` block, left of the Save button, wrapped in `hidden md:flex items-center gap-2`
- **Mobile bottomSection** — inside `md:hidden mb-8`, above the "Explore another destination?" CTA

---

#### 5. Sample Itinerary — Trip ID Swap & Photo 502 Fix

**Committed to Git (commit `84c9011`):**

**`src/app/sample/page.tsx`:** `SAMPLE_TRIP_ID` updated from `7d88a6f1-…` to `930920cd-a172-4a1e-bbd5-e3b73ccd8762` (New York City trip). The previous trip's `photoReference` tokens had been cleaned up by the nightly Vercel cron job, causing all card photos to return 502.

**`src/components/TimelineCard.tsx`:** Added `"use client"` directive and `useState(false)` for `imgError`. The `<Image>` component now carries `onError={() => setImgError(true)}`; when fired (e.g. expired `ATCDNf…` token → 502 from `/api/photo`), the component falls back to the `ImageOff` / `Utensils` placeholder icon. This makes all itinerary photo cards resilient to expired Google Places photo references without any database changes.

---

**Note: The Dual Planning Modes feature (items 1–4 above) is currently being tested on the local machine only and has NOT been committed or pushed to Git yet. Only the sample trip ID swap and TimelineCard photo fix (item 5) have been committed and pushed.**

---

## April 26, 2026 — (follow-up) — PlaceCache Photo Refresh & Cron TTL Extension

**Committed to Git (commit `3479525`) — pushed to main.**

### Problem

`Trip.itineraryData` bakes `photoReference` tokens in at generation time. Google Places photo_reference tokens expire on their own timeline (weeks to months). When they expire, `/api/photo?ref=<token>` returns 502, causing cards in saved trips (`/trips/[id]`) to lose their photos permanently — even though the rest of the itinerary data is intact.

The `onError` fallback added to `TimelineCard` (commit `84c9011`) already prevents UI breakage by swapping to the `ImageOff` placeholder gracefully. This follow-up restores the actual photos where a fresh token is available.

### Fix 1 — `refreshPhotoRefs()` in `src/app/trips/[id]/page.tsx`

New async helper added to the server component. Runs between the DB fetch and the render — no Google API calls, reads `PlaceCache` only:

1. Iterates all days (via `normalizeDayPlan`) and collects cache keys for every timeline item using the same `buildCacheKey()` normalization as `enrichPlace()`: `normalize(name)|normalize(destination)`.
2. Batch `findMany` against `PlaceCache` — one DB round-trip for all items.
3. For each item with a cache hit, overlays the cached `photoReference` onto the item. Items with no cache hit are left untouched (placeholder fallback handles them).
4. Returns the refreshed `ItineraryResponse` — `Trip.itineraryData` in the database is never modified.

```ts
// Called in TripViewPage before passing itinerary to ItineraryViewer:
const itinerary = await refreshPhotoRefs(
  trip.itineraryData as unknown as ItineraryResponse,
  trip.destination
);
```

This fix also applies to the `/shared/[id]` page — that page should receive the same treatment in a future session.

### Fix 2 — Cron TTL extended from 14 → 90 days (`src/app/api/cron/cleanup/route.ts`)

Changed `fourteenDaysAgo` → `ninetyDaysAgo`. `PlaceCache` entries now persist for 90 days of inactivity instead of 14. Combined with the `@updatedAt` auto-refresh on every cache hit, popular places stay alive indefinitely. The extended window gives `refreshPhotoRefs()` a much wider coverage for trips viewed infrequently.

### Architecture Note

`/shared/[id]` (public read-only shared trips) does not yet have `refreshPhotoRefs()`. It renders `Trip.itineraryData` directly without a photo overlay. Should be added in the next session — same pattern, no auth required there.


---

## Tuesday, April 28, 2026 - 7:11 AM EDT

### Session Summary: Numbered Map Markers, Travelpayouts Affiliate Flow & Local QA

---

#### 1. Itinerary Map - Numbered Day Stop Markers

**File:** `src/components/ItineraryMap.tsx`

**Problem:** The map could already isolate stops by day using the pill selector (`All`, `Day 1`, `Day 2`, etc.), but the markers only displayed semantic icons such as camera, fork/knife, wine glass, and pin. When users filtered to a single day, there was no visual indication of the order of stops in that day's itinerary.

**Fix applied:**
- Updated `buildSvgMarker()` so marker badges render the visible itinerary sequence number in the center of the day-colored circle.
- The marker number is derived from the filtered point index: `i + 1`.
- When a user selects `Day 2`, the visible Day 2 markers start at `1`, then `2`, then `3`, etc. rather than continuing from the full-trip sequence.
- The same behavior applies to existing itineraries, saved trips, shared trips, sample trips, and newly generated trips because it is a render-layer change only.

**Implementation notes:**
- `filteredPoints` remains the source of truth, preserving the existing polyline order and day isolation behavior.
- Marker colors still come from the day-centric `DAY_PALETTE`.
- The old semantic icon helper remains in the file for now, but the displayed marker state is the numbered badge.

**Local QA:**
- Verified on localhost after resolving a stale dev-server process that was still serving the old marker bundle.
- Final working local URL used for verification: `http://localhost:3000/sample?fresh=numbered4`.
- Confirmed by browser testing that Day 2 markers display numbered stop order.

---

#### 2. Travelpayouts Affiliate Booking Flow

**Files:** `src/app/actions/affiliate.ts`, `src/components/StayCard.tsx`, `src/components/InteractiveStays.tsx`

**Problem:** Hotel recommendation cards were still wired around the old Booking.com affiliate helper (`createAffiliateUrl()`), while the project is moving to Travelpayouts / HotelLook deep links.

**Fix applied:**
- Added a new Server Action in `src/app/actions/affiliate.ts`:

```ts
generateBookingLink(hotelName: string, city: string)
```

- The action reads `TRAVELPAYOUTS_MARKER` from the server environment.
- It builds a HotelLook search URL using:

```txt
https://search.hotellook.com/hotels?destination=[ENCODED_QUERY]&marker=[MARKER]
```

- The destination query combines the hotel name and city, then encodes it safely with `encodeURIComponent()`.
- If `TRAVELPAYOUTS_MARKER` is missing in local development, the action falls back to a basic HotelLook search URL without a marker so the UI can still be tested.

**UI integration:**
- `InteractiveStays.tsx` no longer passes a prebuilt Booking.com URL into `StayCard`.
- `StayCard.tsx` now receives the destination and calls `generateBookingLink()` from a `Reserve` button.
- The button manages an `isRedirecting` loading state and shows a spinner while the booking link is generated.
- The button opens a blank tab synchronously before awaiting the Server Action, then redirects that tab to the returned URL. This avoids popup blocking from async tab creation.
- Button styling was updated to a minimalist luxury treatment: white background, black text, thin black border, and dark hover state.

**Local QA:**
- Added a temporary local marker value: `TRAVELPAYOUTS_MARKER=123456`.
- Confirmed the Reserve button generates a Travelpayouts / HotelLook URL and then redirects onward to Booking.com, which is expected partner behavior.
- Confirmed the temporary marker is for local testing only and must be replaced with the real Travelpayouts marker before production use.

---

#### 3. Localhost / Browser State Debugging

**Issue investigated:** The itinerary page showed the "maximum number of luxury curations for this hour" message even though no new curation had intentionally been submitted.

**Findings:**
- Local server logs showed real `POST /api/itinerary` requests returning `429`.
- The `/itinerary` page automatically reads `sessionStorage.getItem("itineraryRequest")` and calls `generateItinerary(data)` on mount.
- An old Istanbul request was still present in browser `sessionStorage`, so visiting or refreshing `/itinerary` retried the stored generation request.
- The hourly Upstash limiter correctly returned `429` once the local quota was exhausted.

**Recommended browser cleanup command:**

```js
sessionStorage.removeItem("itineraryRequest");
sessionStorage.removeItem("seek_wander_itinerary_cache");
location.href = "/";
```

---

#### 4. Local Development Status

**Verification completed locally:**
- `npm.cmd run lint` passes with no ESLint warnings or errors.
- `http://localhost:3000/sample` compiles and serves successfully.
- Numbered map markers were visually confirmed in the browser.
- Travelpayouts Reserve flow was locally tested with a temporary marker.

**Important:** These updates are currently in the local development environment only. None of these changes have been pushed to Git yet.

---

### Tuesday, April 29, 2026 — PDF Branding, TravelPayouts Removal & Static Maps

**Branch:** `main` · **Pushed:** ✅

---

#### 1. PDF Export Branding — Logo, Wordmark & Footer Link

**Files changed:** `src/components/PrintItinerary.tsx`

Two shared components extracted and applied to **every printed page** (cover + all day pages):

**`PageHeader`** — renders at the top of every page above all content:
- Left: `bee_compass_512_transparent.png` at exactly 60×60px (explicit `maxWidth`, `maxHeight`, and `objectFit: contain` set as inline styles — Tailwind classes are unreliable in print context due to cascade override)
- Right: `"TRAVALBEE"` in 10px uppercase DM Sans, letter-spacing 0.45em, weight 700

**`PageFooter`** — renders at the bottom of every page below all content:
- Centred `<a href="https://travalbee.com">` link styled at 9px uppercase, letter-spacing 0.3em, `color: rgba(0,0,0,0.5)`

**Shared page padding constant** introduced:
```ts
const PAGE_PAD = "20px 56px";
```
Used on the cover page wrapper and `PrintDayPage` wrapper to ensure consistent physical margins across all pages.

**Cover page rewrite:** Replaced Tailwind class-based layout with fully inline styles to eliminate print CSS cascade issues. The `flex-1 justify-center` approach was spreading content incorrectly in print preview — switching to explicit inline `flex/column/center` alignment fixed both the overflow-to-next-page bug and the off-centre heading.

**Sizing iteration summary:** Logo went through 26px → 44px → 60px. Final 60px was chosen to be clearly visible at A4 print resolution without competing with the wordmark text.

---

#### 2. TravelPayouts Drive Script Removal

**File changed:** `src/app/layout.tsx`

**Problem:** After adding the TravelPayouts Drive script (`tp-em.com/NTIzNTM1.js`), every click on Navbar buttons was opening random travel affiliate sites (Kiwi.com, Klook, etc.) in new tabs. The script is a **global click interceptor** — it attaches to `document` and intercepts all anchor and button interactions site-wide, not just designated affiliate zones.

**Root cause:** `strategy="beforeInteractive"` caused it to load before any other JavaScript, giving it first-mover advantage on the event listener queue. No per-element exclusion configuration exists for this script type.

**Fix:** Removed the script block entirely:
```tsx
// REMOVED — hijacked all navbar/link clicks
<Script
  id="travelpayouts-drive"
  src="https://tp-em.com/NTIzNTM1.js?t=523535"
  strategy="beforeInteractive"
  ...
/>
```

Also removed the now-unused `import Script from "next/script"` import.

**Affiliate strategy going forward:** Use targeted widgets or server actions per placement (e.g. the existing `generateBookingLink()` server action for hotel cards) rather than a global click interceptor.

---

#### 3. Per-Day Static Map in PDF Export

**New file:** `src/app/api/staticmap/route.ts`
**File changed:** `src/components/PrintItinerary.tsx`

##### `/api/staticmap` — Server-Side Proxy Route

A new `GET` route that proxies Google Static Maps API requests server-side, keeping `MAPS_SERVER_KEY` out of the browser entirely.

**Request shape:** Accepts repeated `?m=lat,lng` query parameters — one per timeline stop with GPS coordinates.

**Map configuration:**
- Size: `600x260`, Scale: `2` (retina-quality for print)
- Map type: `roadmap`
- Markers: burnt-orange (`color:0xC2410C`) numbered `1`–`9`, then `•` for stops beyond 9

**Caching:** `Cache-Control: public, max-age=86400, stale-while-revalidate=3600` — repeated prints do not re-fetch the map image.

**Timeout:** `AbortSignal.timeout(6000)` — returns `502` cleanly if Google is slow.

**Style configuration (final):**
```ts
const STYLES = [
  "feature:poi|element:labels.icon|visibility:off",
  "feature:transit|element:labels.icon|visibility:off",
];
```

Initial implementation used heavy style overrides (paper-tone backgrounds, hidden road/neighbourhood labels) for an editorial aesthetic. This made the maps practically unreadable — no city names, no street names, no neighbourhood context. Reverted to near-default roadmap with only POI and transit **icon** suppression, keeping all text labels fully visible.

##### `PrintDayPage` — Map + Legend Section

Added below the hidden gem section on each day page:

```tsx
const coordParams = items
  .filter(item => item.coordinates?.lat && item.coordinates?.lng)
  .map(item => `m=${item.coordinates.lat},${item.coordinates.lng}`)
  .join("&");
const mapSrc = coordParams ? `/api/staticmap?${coordParams}` : null;
```

The map image renders full-width with `loading="eager"` (required — browser print preview fires before lazy images load).

Below the map image, a **numbered legend** lists every mapped stop:
- Burnt-orange `18×18px` circle with white number (matching the map marker)
- Monospace time in `9px` (when `startTime` is present)  
- Place name in `11px` italic
- Type/category badge in `8px` uppercase

The legend uses hairline `1px rgba(0,0,0,0.04)` dividers and is wrapped in `break-inside-avoid` so it never splits across a page break.

##### Google Cloud Console — API Key Update

`MAPS_SERVER_KEY` required a manual update in Google Cloud Console:

- **Before:** API restrictions listed "Places API" only
- **After:** Added "Maps Static API" to the allowed list

Without this change the proxy returned `"This API key is not authorized to use this service or API"` and the map rendered as a broken image.

---

#### 4. Git — Merge Resolution

**Context:** When pushing the worktree branch to `main`, local `main` was 4 commits behind `origin/main` with uncommitted changes (`Navbar.tsx`, `CLAUDE-v2.md`) and untracked PNG files already present on origin.

**Resolution sequence:**
1. `git stash` — stashed uncommitted local changes
2. Removed untracked PNG files already present on origin
3. `git pull --ff-only origin main` — fast-forward succeeded
4. `git stash drop` — discarded stale stash (changes already in origin)
5. `git merge nifty-driscoll-81c539` — merged worktree branch cleanly
6. `git push origin main` — all changes pushed

---

### Thursday, May 1, 2026 — Bug Fixes, UX Polish, Privacy Rewrite & Refine Journey Feature

**Branch:** `main` · **Pushed:** ✅

---

#### 1. Max Tokens Fix — Itinerary Truncation Error

**File changed:** `src/app/api/itinerary/route.ts`

**Problem:** Users were hitting "Our concierge ran out of space generating your itinerary" on longer (4–5 day) or Packed-pace trips. This was a hard `stop_reason === "max_tokens"` error — Claude was hitting the 8192-token ceiling before finishing the JSON, producing a truncated and unparseable response.

**Fix:** Raised `max_tokens` from `8192` → `16000`. `claude-sonnet-4-6` supports up to 16k output tokens natively — no beta flag required. A 5-day Packed itinerary generates approximately 30–35 timeline items at ~150 tokens each (~5,000–7,500 tokens of JSON), plus structure overhead. 16,000 provides sufficient headroom for all supported trip lengths.

---

#### 2. Date Picker UX — Click Anywhere to Open Calendar

**File changed:** `src/components/CurationForm.tsx`

**Problem:** The browser's native date picker only opened when the user clicked the calendar icon at the far right of the input field. Clicking the `mm`, `dd`, or `yyyy` text segments activated keyboard-editing mode but did not open the calendar popup — confusing for less tech-savvy users.

**Fix:**
- Added `departureDateRef` and `returnDateRef` (`useRef<HTMLInputElement>`) to both date inputs.
- Wrapped each date row in a `div` with an `onClick` handler that calls `inputRef.current?.showPicker?.()`.
- Clicking anywhere in the row — the Lucide `Calendar` icon, the `mm/dd/yyyy` text, or the surrounding area — now instantly opens the native calendar popup.
- Return date `showPicker` is guarded: only fires if a departure date is already selected, matching the existing `disabled` state on the input.
- `?.` optional chaining on `showPicker` ensures graceful degradation on older browsers.

---

#### 3. Form Validation — Section-Level Red Highlighting

**File changed:** `src/components/CurationForm.tsx`

**Problem:** Submitting the form with missing fields showed a bullet-point list at the bottom of the form. This was easy to miss after scrolling and confusing for older or less experienced users.

**Fix:** Replaced the error list with per-section red highlighting:

- Added `isError(field: string)` helper: returns `true` when `showErrors` is active and the field is in `missingFields`.
- Five sections now receive conditional classes when errored: `border-l-[3px] border-red-400 pl-4 bg-red-50/30` — a 3px red left accent bar and a subtle red background tint.
- Each section label (`Travel Dates`, `Travel Party`, `Travel Pace`, `Budget Tier`, `Interests`) transitions to `text-red-500` when its section is errored.
- All transitions use `transition-all duration-300` so highlights animate in smoothly rather than snapping.
- The verbose error list box was replaced with a single centred line: `"Please complete the sections highlighted above."`
- `data-form-error="true"` attribute added to each errored section so `handleSubmit` can `querySelector` the first one and call `scrollIntoView({ behavior: "smooth", block: "center" })` — auto-scrolling to the first problem section on submit.

---

#### 4. Timeline Card — Category-Based Fallback Images

**File changed:** `src/components/TimelineCard.tsx`

**Problem:** When Google Places has no photo for a place (remote destinations, lesser-known restaurants, hidden gems), the card displayed a grey background with a small `ImageOff` or `Utensils` icon. This looked broken and unprofessional, especially on a luxury product.

**Decision rationale:** Restricting recommendations to only places with Google photos was rejected — it would bias itineraries toward over-touristy, over-photographed spots and filter out hidden gems. Showing a "too remote" message was also rejected as it destroys the luxury aesthetic. The correct approach: always show a beautiful image.

**Fix:** Added `getFallbackImage(item: TimelineItem): string` function returning a curated Unsplash URL keyed by `type` and `category`:

| Type / Category | Fallback |
|---|---|
| `drinks` | Cocktail bar photography |
| `breakfast / lunch / dinner / snack` | Elegant table setting |
| `MUSEUM / CULTURE` | Architectural interior |
| `NATURE / ADVENTURE` | Landscape photography |
| `WELLNESS` | Spa / natural light |
| `SHOPPING` | Boutique lifestyle |
| Default (sightseeing, etc.) | Travel editorial |

- `hasGooglePhoto` boolean computed from `(item.photoReference || item.photoUrl) && !imgError`.
- `imageSrc` resolves to the Google photo URL when available, otherwise the Unsplash fallback.
- `onError` is only attached when showing a Google photo — prevents infinite error loops when falling back.
- `ImageOff` and `Utensils` placeholder imports removed entirely. Blank cards are now impossible.
- Fallback images receive the same `img-grayscale` hover treatment as real Google photos — visually indistinguishable.

---

#### 5. Privacy Policy — Full GDPR/CCPA/Global Rewrite

**File changed:** `src/app/privacy/page.tsx`

**Problem:** A user flagged GDPR non-compliance — the existing policy lacked legal bases for processing, had a vague rights section with no response timeframes, gave no supervisory authority contacts, and didn't address international data transfers or non-EU jurisdictions.

**Fix:** Complete rewrite from 10 thin sections to a 15-section production-grade policy. Key additions:

**GDPR / UK GDPR:**
- Section 2: Legal basis for every processing activity under Art. 6 — contract performance, legitimate interests, legal obligation, consent.
- Section 8: All 8 data subject rights spelled out in plain English — access, rectification, erasure, restriction, portability, objection, opt-out of sale, non-discrimination.
- Section 9: Response timeframes — 72-hour acknowledgement, 30-day full response (GDPR), 45-day response (CCPA).
- Section 10: Supervisory authority links — ICO (UK), EDPB member list (EU), OAIC (Australia), OPC (Canada), ANPD (Brazil), CPPA (California).
- Section 5: International transfer safeguards — Standard Contractual Clauses (SCCs) and UK IDTA, addressing the fact that Anthropic, Vercel, Clerk, and Supabase are US-based processors.
- Section 11: Automated decision-making disclosure (GDPR Art. 22) — the AI is an assistive tool, not a decision-maker affecting rights.

**CCPA/CPRA (California):**
- Explicit "we do not sell your personal information" statement.
- 45-day CCPA response commitment.
- Right to non-discrimination confirmed.

**All jurisdictions:**
- Section 1: Precise categorical breakdown of every data type collected, with an explicit "we do not collect" list (card numbers, passport details, precise GPS, special-category data).
- Section 6: Per-category retention schedule — itinerary data (30-day deletion on request), PlaceCache (14-day auto-purge), rate-limit counters (1-hour auto-expire), cost logs (financial records).
- Section 13: Security measures described — HTTPS, encryption at rest, API key split, RBAC, rate limiting.
- Children's age thresholds: 13 globally, 16 in EEA/UK.
- Material change notification commitment for signed-in users.

---

#### 6. Refine Journey Panel

**New file:** `src/components/RefinePanel.tsx`
**File changed:** `src/app/itinerary/page.tsx`

**Feature:** After an itinerary is generated, users can adjust their preferences and regenerate without starting from scratch.

##### `RefinePanel.tsx`

A `createPortal(…, document.body)` slide-up panel (same pattern as `MobileMenu` and `DeleteDialog`) with three editable sections:

- **Budget Tier** — same 3-card grid as `CurationForm` (`$$` / `$$$` / `$$$$`)
- **Travel Pace** — same 3-card grid (`Relaxed` / `Moderate` / `Packed`) with Feather/Zap/Flame icons
- **Interests** — all 10 interest pills, toggleable

Destination and dates are shown read-only with a note explaining they are fixed. Changing destination or dates requires a new journey.

**Regenerate button behaviour:**
- Disabled (`opacity-35 cursor-not-allowed`) until at least one preference differs from the stored request — prevents accidental identical re-runs. Comparison uses sorted JSON stringify for interests array.
- On click: calls `onRegenerate(updatedRequest)` and the parent handles close + generation.

**Archive notice** — context-aware message shown above the CTA:
- Signed in, not saved → "Your current itinerary will be automatically saved to your archive before the new one is generated."
- Signed in, already saved → "Your saved itinerary will not be overwritten — the new version can be saved separately."
- Not signed in → "Sign in to archive your itineraries. The current version will be replaced when you regenerate."

**Accessibility:** Escape key closes the panel (`keydown` listener); backdrop click closes; body scroll locked while open (`document.body.style.overflow = "hidden"`).

**Responsive layout:**
- Mobile: full-width bottom sheet (`bottom-0 left-0 right-0`)
- Desktop (md+): anchored card, bottom-right (`md:max-w-xl md:right-6 md:bottom-6`)

**Z-index fix:** Initial implementation used `z-40` (backdrop) and `z-50` (panel). The `ItineraryMap` day-filter pill uses `z-[110]`, causing it to bleed through the backdrop. Fixed by raising backdrop to `z-[120]` and panel to `z-[130]`.

##### `itinerary/page.tsx` changes

- `useAuth` imported from `@clerk/nextjs` to determine sign-in state for the archive notice and auto-save logic.
- `SlidersHorizontal` imported from `lucide-react` for the Refine button icon.
- `refineOpen: boolean` state controls panel visibility.
- `storedRequest: ItineraryRequest | null` state holds the parsed sessionStorage request (set when the page loads from sessionStorage, updated on each refine).
- **`handleRefine(updated: ItineraryRequest)`** — `useCallback`-wrapped async function:
  1. Closes panel immediately.
  2. If signed in and current itinerary is unsaved (`saveState === "idle"`): fires `saveTripToDb` as fire-and-forget (non-blocking), shows "Previous journey archived" success toast on completion.
  3. Writes updated params to `sessionStorage("itineraryRequest")` for back-navigation consistency.
  4. Resets `saveState` to `"idle"` so the Save button works for the new itinerary.
  5. Calls `generateItinerary(updated)` — identical pipeline to the initial generation.
- **Refine button** added to the header strip (desktop, alongside Export and Save) and to the mobile bottom section (full-width, above ExportPdfButton).
- `<RefinePanel>` rendered at the bottom of the page return, gated by `storedRequest !== null`.

**Cost impact:** A refinement on the same destination costs ~$0.08–0.12 (Claude only). The PlaceCache absorbs all Google Places lookups since the destination is fixed — approximately 90% cheaper than the initial generation.

---

#### 7. Launch Date Update

**File changed:** `src/components/LaunchCountdown.tsx`

Updated all three date references from **May 6, 2026** to **May 25, 2026**:

- `LAUNCH_AT` constant: `"2026-05-06T12:00:00-04:00"` → `"2026-05-25T12:00:00-04:00"`
- Compact variant label: `"May 6, 12 PM EDT"` → `"May 25, 12 PM EDT"`
- Hero variant label: `"Wednesday, May 6 at 12:00 PM EDT"` → `"Sunday, May 25 at 12:00 PM EDT"`

---

### Sunday, May 4, 2026 — Security Audit, DB Indexes & Proxy Rate Limiting

**Commits:** `b1aa6cc`–`4167796` · **Branch:** `main` · **Pushed:** ✅

---

#### 1. Full Scalability & Security Audit

**Scope:** Comprehensive audit covering API endpoint security, `.env` git exposure, database indexes, rate limiting coverage, secret handling, and Vercel/Supabase scaling characteristics.

**Findings — clean:**
- `.env.local` / `.env` confirmed never committed (git log clean, `.gitignore` covers both)
- No hardcoded secrets in any source file
- All user-facing routes gated by Clerk auth or signed secret (rate limit, cron bearer, Stripe HMAC)
- IDOR ownership checks in place on `/api/trips/[id]`
- Stripe webhook has HMAC signature verification + `StripeEvent` idempotency table
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) applied globally in `next.config.mjs`
- Sentry error tracking wired in

**Findings — actioned (see entries 2 & 3 below):**
- `Trip.userId` missing DB index — full table scan on every `/trips` page load
- `CostLog.createdAt` missing index — admin dashboard query unindexed at scale
- `/api/photo` and `/api/staticmap` had no rate limiting — open to Google API quota exhaustion

**Scalability verdict:** The stack (Vercel serverless + Upstash Redis + Supabase PgBouncer) scales horizontally to 10,000+ users. The primary bottleneck was the missing `Trip.userId` index — resolved in entry 2.

---

#### 2. Database Indexes — Trip & CostLog

**File changed:** `prisma/schema.prisma`
**Pushed to Supabase:** ✅ via `npx prisma db push`

**Problem:** `Trip.findMany({ where: { userId } })` — called on every `/trips` archive page load — performed a full sequential table scan. With 10K users × 5 trips = 50K rows this degrades noticeably; at 100K rows it becomes a visible bottleneck. `CostLog` queries in the admin dashboard (`orderBy: { createdAt: "desc" }, take: 200`) were similarly unindexed.

**Fix:** Three indexes added to `prisma/schema.prisma`:

```prisma
model Trip {
  // ...existing fields...
  @@index([userId])                        // findMany({ where: { userId } }) — O(log n)
  @@index([userId, createdAt(sort: Desc)]) // covering index — avoids sort step on archive fetch
}

model CostLog {
  // ...existing fields...
  @@index([createdAt(sort: Desc)]) // admin dashboard last-200-rows query — O(log n) at scale
}
```

`PlaceCache.@@index([updatedAt])` (cron cleanup) and `PlaceCache.cacheKey @unique` (enrichment lookup) were already present and confirmed correct.

---

#### 3. Rate Limiting — `/api/photo` and `/api/staticmap`

**Files changed:** `src/lib/ratelimit.ts`, `src/app/api/photo/route.ts`, `src/app/api/staticmap/route.ts`

**Problem:** Both proxy routes call Google APIs using `MAPS_SERVER_KEY` server-side but had no rate limiting. A bot or curious user discovering either URL could hammer it and exhaust Google Places / Static Maps quota with no cost cap.

- `/api/photo` — proxies Google Places Photos; unlimited calls would exhaust the Places API photo quota
- `/api/staticmap` — calls Google Static Maps API (~$2/1,000 requests); no guard against automated abuse

**Fix:** Two new Upstash `Ratelimit` instances added to `src/lib/ratelimit.ts`:

```ts
export const photoRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "1 h"),
  prefix:  "travalbee:photo",
});

export const staticmapRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix:  "travalbee:staticmap",
});
```

**Limit rationale:**
- `photo` — 120/hr: a power user generating 4+ itineraries in one session fires ~25–30 uncached photo refs each. CDN-cached photos (30-day `Cache-Control: immutable`) bypass the function entirely and don't count against the limit.
- `staticmap` — 30/hr: one PDF export = up to 5 map requests (one per day page). 30/hr = 6 full PDF exports per hour per IP — more than enough for any real user.

Both routes key by `x-forwarded-for` IP (set by Vercel edge). Missing IP header is silently skipped rather than hard-rejected — these are public proxy routes, not auth-gated endpoints.

---

### Wednesday, May 6, 2026 — KML Map Export, PDF Google Maps Link, Timeline Rail, Credits Banner & Pipeline Hardening

**Branch:** `claude/relaxed-dewdney-4bea72` → merged to `main` · **Pushed:** ✅

---

#### 1. Hotel Autocomplete — Destination Bias Fix

**File changed:** `src/components/CurationForm.tsx`

**Problem:** The hotel name autocomplete (Field 9) was returning results biased toward the user's physical location rather than the selected destination city.

**Fix:** Added a `bounds` option to the lodging `Autocomplete` component, constructed as a `LatLngBoundsLiteral` (plain object — no `google.maps.*` constructor needed) from the stored `form.lat` / `form.lng` values (±0.25 degree box):

```tsx
bounds: {
  north: form.lat + 0.25, south: form.lat - 0.25,
  east:  form.lng + 0.25, west:  form.lng - 0.25,
},
strictBounds: false,
```

`strictBounds: false` keeps results outside the box as lower-ranked fallbacks rather than blocking them entirely.

---

#### 2. Autocomplete Dropdown — Mobile Address Wrapping

**File changed:** `src/app/globals.css`

**Problem:** On mobile, the Google Places `.pac-container` displayed address secondary text on a single truncated line — long hotel addresses were unreadable.

**Fix:** Added CSS overrides after the `* { border-radius: 0 !important; }` block:

```css
.pac-container { font-family: var(--font-dm-sans)...; border: ...; box-shadow: ...; }
.pac-item { padding: 8px 12px; white-space: normal; }
.pac-item-query { font-size: 0.875rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pac-secondary-text { font-size: 0.75rem; display: block; white-space: normal; word-break: break-word; }
```

Also added `@media print { .pac-container { display: none !important; } }` to prevent the dropdown from bleeding into the print/PDF preview overlay.

---

#### 3. No-Credits Banner on `/curate`

**Files changed:** `src/app/curate/page.tsx`, `src/app/curate/CurateClient.tsx`, `src/components/CurationForm.tsx`

**Feature:** Users with zero credits now see a dismissal-free banner above the form before they begin filling it in, preventing a surprise 402 error mid-flow.

**Implementation:**
- `curate/page.tsx` fetches `userProfile.availableCredits` server-side and passes `credits` to `CurateClient`
- `CurateClient` renders a `motion.div` banner (`border-burnt-orange/30 bg-burnt-orange/5`) when `credits <= 0`, containing a `Sparkles` icon, "No Credits Remaining" micro-copy, and a `/pricing` link
- `CurationForm` receives `credits?: number` prop; the existing sessionStorage credits-hint `useEffect` is gated to skip entirely when `credits <= 0` — prevents the "You have free credits available" hint from appearing simultaneously with the no-credits banner

---

#### 4. Timeline Left-Rail Step Numbers

**File changed:** `src/components/ItineraryViewer.tsx`

**Feature:** Added a visual left rail to the itinerary timeline so users can see stop sequence at a glance.

**Implementation inside `DaySection`:**
- Absolute vertical line: `absolute left-[13px] top-6 bottom-6 w-px bg-burnt-orange/40 z-0` — hidden in print
- Each item row wraps in `flex items-start gap-3`; a `w-7 shrink-0` column on the left holds a `26×26px` square node (`border border-burnt-orange/60`, `bg-paper`) containing the zero-padded stop number (`font-mono text-[8px] text-burnt-orange`, e.g. `01`, `02`)
- Transit connectors indent `pl-10` to clear the node column
- All node elements carry `print:hidden` — print layout is unaffected

---

#### 5. KML Map Download

**New files:** `src/lib/generateKml.ts`, `src/components/ExportMapButton.tsx`
**Files changed:** `src/components/TripHeaderActions.tsx`, `src/app/trips/[id]/page.tsx`

**Feature:** Users can download a `.kml` file of their itinerary, importable into Google Maps My Maps or Google Earth, with correct place names and stop order.

**`generateKml(itinerary: ItineraryResponse): string`** — pure function:
- Outputs `<?xml version="1.0">` KML with one `<Folder>` per day (name: `"Day N: Theme"`)
- Each `<Placemark>` contains stop number, title, description, startTime, and `<coordinates>lng,lat,0</coordinates>` (KML requires lng-first order — reversed from the `{lat, lng}` objects in the itinerary)
- Hidden gem appended as a separate starred `<Placemark>` per day with a green star icon (`grn-stars.png`)
- Two `<Style>` definitions: `#stop` (burnt-orange circle, `color: ff0c41c2` in KML ABGR) and `#gem` (teal star, `color: ff006959`)
- `esc()` helper encodes all user text through XML entity escaping before injection

**`ExportMapButton`** — `"use client"` button:
- Calls `generateKml(itinerary)`, creates a `Blob` (`application/vnd.google-earth.kml+xml`), triggers browser download via `URL.createObjectURL` + programmatic `<a>.click()`
- Filename: `travalbee-[destination-slug].kml`
- Accepts `className`, `iconSize`, and `label` props — renders identically in the desktop header and mobile kebab menu

**`TripHeaderActions`** updated:
- New `itinerary: ItineraryResponse` prop threaded from `trips/[id]/page.tsx`
- Desktop: `<ExportMapButton>` added between `<DeleteTripButton>` and `<ExportPdfButton>`
- Mobile kebab: new "Download Map" menu item with `Map` icon, positioned between "Download PDF" and "Remove"

---

#### 6. Clickable Google Maps Link in PDF

**File changed:** `src/components/PrintItinerary.tsx`

**Feature:** Each day page in the PDF export now ends with a clickable `"Open Day N in Google Maps →"` link that opens a pre-built directions route in Google Maps.

**Implementation:**
- `PrintDayPage` receives `destination: string` prop (passed from `PrintItinerary` via `itinerary.destination`) — this fixed a `ReferenceError: itinerary is not defined` crash on `/trips` that occurred in the first revision
- URL format: `https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&waypoints=lat,lng|lat,lng` — the `api=1` programmatic format places pins at exact coordinates without name disambiguation
- Only items with `coordinates?.lat && coordinates?.lng` are included
- Link styled to match existing `PageFooter` link aesthetic: `10px uppercase`, `letter-spacing 0.2em`, burnt-orange with underline

**Iteration notes:** Three URL formats were tried — coordinates-only (showed wrong city on first attempt), place name search (caused "Did you mean?" disambiguation), `api=1` with coordinates (current — correct locations, coordinates-based labels). `api=1` with place IDs was architecturally planned but deferred (see entry 7).

---

#### 7. `placeId` Pipeline — Future Google Maps Name+Location Fix

**Files changed:** `prisma/schema.prisma`, `src/types/itinerary.ts`, `src/app/api/itinerary/route.ts`
**DB pushed:** ✅ via `npx dotenv -e D:\travel-plannner-v2\.env.local -- prisma db push`

**Context:** Google Maps `api=1` format supports `origin_place_id` / `destination_place_id` / `waypoint_place_ids` parameters — when provided, Maps shows the correct named place at the exact location with no disambiguation. The Google Places Text Search response already returns `place_id` during enrichment; it was just not being stored.

**Changes:**
- `PlaceCache` schema: `placeId String?` column added (comment: "Google Places place_id — used to build accurate Maps URLs with correct names + locations")
- `TimelineItem` type: `placeId?: string` field added
- `PlacesEnrichment` type in `route.ts`: `placeId?: string` field added
- `enrichPlace()` cache hit path: returns `cached.placeId ?? undefined`
- `enrichPlace()` fresh fetch path: `placeId: place.place_id ?? undefined` included in returned enrichment; `placeId` written to both `update` and `create` branches of `placeCache.upsert()`
- `placeId` flows to `TimelineItem` via the existing `Object.assign(workItems[i].obj, result.value)` call — no additional wiring needed

**Status:** Data pipeline is live (new generations store `placeId`). The Maps URL in `PrintItinerary.tsx` still uses coordinates — the `place_id`-based URL format is ready to enable once enough trips have been generated with real place IDs. Old saved trips fall back to the coordinate URL gracefully.

---

### Tuesday, June 23, 2026 — Open/Closed Hours Fix, iOS Safari Resilience, Trips Multi-Account Isolation, Audit Fixes & Shared Page Redesign

**Branch:** `main` · **Pushed:** ✅ (commits `4ab6fbc`, `4729cc6`, `334a6a9`, `8a21659`, `0b55176`, `60f7db6`)

---

#### 1. Opening Hours — `todayIdx` Used Server UTC Day Instead of Destination Local Day

**File changed:** `src/app/api/itinerary/route.ts`

**Problem:** Timeline cards (restaurants, museums, etc.) almost always displayed `CLOSED`. Two compounding root causes:

1. **Wrong day cached.** In `enrichPlace()`, the `weekday_text` index was computed as `todayIdx = (new Date().getDay() + 6) % 7` — using the *server's* UTC clock. Vercel runs in UTC, so when the server day was (for example) Monday — a common weekly-closure day for venues — Google's `"Closed"` string was selected, stripped, and written to `PlaceCache.hoursOpen`. Every subsequent cache hit then called `parseOpenNow("Closed", lng)` which correctly returns `false` — surfacing `CLOSED` permanently regardless of the destination's actual local day.
2. **Fresh-miss `openNow` always `undefined`.** On a fresh enrichment the field was set from `place.opening_hours?.open_now`, but `opening_hours` is **not** returned by the Google Places *Text Search* endpoint (it is a Place Details-only field). So `openNow` was `undefined` on every cache miss and nothing rendered.

**Fix:**
- `todayIdx` now derives from the destination's estimated local day using the same `lng`-based UTC offset approach as `parseOpenNow()`:
  ```ts
  const utcOffsetHrs = Math.round(destinationLng / 15);
  const destNow = new Date(Date.now() + utcOffsetHrs * 3600 * 1000);
  const todayIdx = (destNow.getUTCDay() + 6) % 7; // Monday=0
  ```
- Fresh-miss `openNow` now computes via `parseOpenNow(hoursOpen, destinationLng)` when hours are available, falling back to `place.opening_hours?.open_now` only if no hours string exists — matching the cache-hit code path.

**Migration:** Existing `PlaceCache` rows holding the literal `"Closed"` string self-correct on their next cache miss (14-day TTL) or via manual Supabase row clear.

---

#### 2. Timeline Cards — Show Opening Hours Only, Remove OPEN/CLOSED Badge

**File changed:** `src/components/TimelineCard.tsx`

**Decision:** Rather than rely on the timezone-estimated open/closed computation (±30 min accuracy, and brittle as documented above), the OPEN/CLOSED status badge was removed entirely. Cards now display only the raw hours string (e.g. `9:00 AM – 9:00 PM`).

**Fix:** The conditional block that rendered the `emerald-accent` "OPEN" / `burnt-orange` "CLOSED" span was deleted; the `Clock` icon + `font-mono` hours text remain, gated on `item.hoursOpen` alone (previously `item.hoursOpen || item.openNow !== undefined`). `print:hidden` retained.

---

#### 3. iOS Safari — Background-Kill Fetch Retry in `useItinerary`

**File changed:** `src/hooks/useItinerary.ts`

**Problem:** On iPhone, starting a generation and then backgrounding Safari (leaving the tab open) produced a "Load failed / something went wrong" error. iOS Safari freezes JS execution and kills all in-flight `fetch` requests when a tab is backgrounded, throwing a generic `TypeError: Load failed` that fell into the catch block and surfaced the "Concierge Busy" error toast.

**Fix:** Added an auto-retry mechanism keyed on tab visibility:
- New `pendingRetryRef` stores the in-flight `ItineraryRequest` before the fetch begins; cleared on success.
- A `visibilitychange` `useEffect` listener re-invokes `generateItinerary(pendingRetryRef.current)` when the tab returns to `visible`.
- The catch block detects the iOS background-kill signature — `e instanceof TypeError` with message `"Load failed"` / `"Failed to fetch"` / `"NetworkError when attempting to fetch resource."` **and** `document.visibilityState === "hidden"` — and, instead of showing an error toast, queues the retry and keeps `loading = true` so the loader stays visible.
- The `finally` block was updated to not clear `loading` when a retry is pending (`if (abortRef.current === controller && !pendingRetryRef.current)`).

**Result:** The user backgrounds the tab, returns to a still-running loader, and the itinerary loads normally — no error surfaced.

---

#### 4. My Trips — Multi-Account Cache Isolation & Mobile Save Visibility

**Files changed:** `src/hooks/useOfflineTrips.ts`, `src/components/TripsClient.tsx`, `src/components/DeleteTripButton.tsx`, `src/app/itinerary/page.tsx`

**Problem A — account mixing:** The offline cache used a single global `localStorage` key `seek_wander_archive` with no user scoping. Logging in as a different Clerk user on the same device/browser could surface the previous user's trips (especially on the fetch-failure fallback path).

**Problem B — mobile save not appearing:** After saving a trip, navigating to `/trips` triggered a fresh `/api/trips` network fetch to see it. On mobile that fetch is slow/raced, so the just-saved trip (written to Supabase, not to localStorage) did not appear.

**Fix:**
- **User-scoped cache key.** `CACHE_KEY` is now `CACHE_KEY_PREFIX` + a `cacheKey(userId)` helper producing `seek_wander_archive:<userId>`. `readCache(userId)` / `writeCache(userId, trips)` take the userId. `useOfflineTrips(userId)` now accepts a `userId` argument, short-circuits when null, and re-fetches when it changes (`useEffect` dep `[userId]`).
- **`TripsClient`** now reads `userId` from Clerk `useAuth()` and passes it to `useOfflineTrips(userId)`.
- **New `cacheNewTrip(userId, trip)` standalone export** — prepends a newly saved trip to the user's cache (with an id-dedup guard for React Strict Mode double-invokes).
- **`itinerary/page.tsx` `handleSave()`** now captures the returned trip from `saveTripToDb()` (which returns the created `Trip` including `id`/`createdAt`) and calls `cacheNewTrip(userId, …)` immediately on success, so `/trips` shows it without waiting for the next API fetch.
- **`DeleteTripButton`** updated to read `userId` from `useAuth()` and prune the user-scoped key `seek_wander_archive:<userId>` (previously hardcoded the unscoped key).

---

#### 5. Full Codebase Audit — Six Findings Fixed

**Files changed:** `src/types/itinerary.ts`, `src/lib/itineraryUtils.ts`, `src/components/ItineraryMap.tsx`, `src/components/MobileMenu.tsx`, `src/app/shared/[id]/page.tsx`, `src/hooks/useOfflineTrips.ts`, `src/lib/ratelimit.ts`, `src/app/api/trips/route.ts`

A thorough audit (auth flows, mobile edge cases, API routes, data flow, React state, TypeScript safety) surfaced six actionable issues, all fixed:

1. **Semantic map icons were dead code.** `computeMapPoints()` collapsed every meal type to `MapPoint.type = "meal"`, but `buildSvgMarker()` in `ItineraryMap` keys its breakfast/lunch/dinner/etc. icon set on the original `TimelineItemType`. Result: all meal markers showed the default pin. **Fix:** added an optional `itemType?: TimelineItemType` field to `MapPoint`, populated it in `computeMapPoints()`, and updated `ItineraryMap` to call `buildSvgMarker(point.day, point.itemType ?? point.type, …)`.

2. **Coordinate guard rejected `0`.** `computeMapPoints()` used `if (!item.coordinates?.lat || !item.coordinates?.lng) return;` — falsy `0` excluded valid points on the prime meridian (`lng: 0`, e.g. London/Greenwich) or equator. **Fix:** changed to explicit `== null` checks.

3. **iOS scroll lock not released.** `MobileMenu.tsx` set `document.body.style.overflow = "unset"` on close — the inline string `"unset"` is not reliably honoured on older WebKit. **Fix:** set to `""` (empty string) to remove the inline style cleanly.

4. **`/shared/[id]` sticky CTA obscured by home indicator.** No safe-area handling on iPhone X+. **Fix (later superseded by entry 6):** added `env(safe-area-inset-bottom)` padding + `pb-16` on the scroll container + `print:` reset classes.

5. **My Trips showed empty list on fetch failure.** `useOfflineTrips` only fell back to cache visibly when the disabled `OFFLINE_MODE_ENABLED` flag was true. **Fix:** the catch path now unconditionally loads cached trips and sets `isOffline = true` regardless of the flag.

6. **`/api/trips` GET shared the itinerary-generation rate-limit bucket.** Every `/trips` page load consumed the user's `5/hr` generation quota. **Fix:** added a separate `tripsRatelimit` (`slidingWindow(60, "1 h")`, prefix `travalbee:trips`) in `ratelimit.ts` and switched the GET route to use it.

---

#### 6. Shared Itinerary Page — Redesign to Match `/trips/[id]` UI

**File changed:** `src/app/shared/[id]/page.tsx`

**Problem:** Publicly shared itineraries (`/shared/[id]`) rendered with the old layout — a black "Curated by TravalBee" acquisition ribbon below the navbar, an inline non-banner map block, and a fixed full-width burnt-orange sticky CTA bar pinned to the bottom of the viewport (the "weird orange thing"). This diverged from the polished saved-trip viewer.

**Fix:** Rewrote the page to mirror `trips/[id]/page.tsx`:
- Same clean header strip (`bg-paper-dark`, `pt-24 md:pt-20`) showing `"Public Itinerary · N Days"` micro-copy + the serif destination title, with a single inline "Create Your Own →" burnt-orange button (mobile + desktop variants).
- Replaced the inline `<ItineraryMap>` mobile block with the shared `<MobileMapBanner>` component (the "View Map" button experience).
- Removed the fixed bottom orange sticky CTA bar entirely; the acquisition CTA ("Inspired by this journey? / Create Your Free Itinerary →") now lives in the `ItineraryViewer` `bottomSection` slot at the end of the timeline content.
- Added `print:h-auto print:overflow-visible print:block` to the outer wrapper.
- `generateMetadata()` enriched to extract the editorial first sentence as the OG/Twitter description and include the destination hero photo via `getDestinationPhotoUrl()` (mirroring `trips/[id]`).

---

#### 7. Generation Loader — Stale Toast Description

**File changed:** `src/hooks/useItinerary.ts`

**Problem:** While an itinerary was generating, the Sonner toast under the loader sometimes read `"Consulting the concierge…"` (correct loading title) with the description `"Your bespoke journey is ready for review."` (the *success* description from a prior run) — a mismatched/stale message that didn't reflect actual state.

**Root cause:** The loading, success, and error toasts intentionally share `id: "curate-task"` so Sonner mutates one toast in place. When updating an existing toast by id, Sonner spreads new options over the old toast object (`{ ...oldToast, ...newData }`). The `toast.loading()` call set only the title, so a retained `description` from a still-present prior success toast (or the iOS retry path) leaked under the new loader.

**Fix:** `toast.loading("Consulting the concierge…", { id: "curate-task", description: undefined })` — explicitly passing `description: undefined` overwrites the retained value so the loader shows only its own text.

---

### Sunday, June 28, 2026 — Progressive Itinerary Streaming

**Local worktree — not yet committed**

#### Streaming Activated on `/itinerary`

The live itinerary page now uses `useStreamingItinerary()` and
`POST /api/itinerary-stream` instead of the blocking `useItinerary()` flow.
The route still makes one upfront Anthropic request, preserving the
Zero-Latency Principle and cost model, but consumes the response as NDJSON:

- `start` — stream opened and total day count known
- `enriching` — a complete day is being enriched with Google Places
- `day` — one enriched day is ready and immediately appended to the UI
- `done` — editorial, recommended stays, and the complete enriched fallback
  day set are available

The full `GenerationLoader` remains visible until the first day arrives.
Afterward, `ItineraryViewer` renders available days while a compact
`Journey Arriving` progress banner reports completed and currently enriching
days. Save, refine, and export actions remain hidden until `streamComplete`
is true, preventing partial itineraries from being persisted.

#### Stream Resilience

- Stream days are deduplicated by day number and sorted before rendering.
- Day boundaries are detected with a string-aware, brace-balanced JSON scanner.
  The parser does not depend on `hiddenGemCoordinates` being last, coordinate
  key order, or `day` being the first object property.
- AI schema prompts use JSON-safe `null` for absent `dietaryNote` values.
  `sanitizeJson()` also converts legacy bare `undefined` values to `null` before
  incremental or full-response parsing.
- The server keeps enriched emitted days and only enriches parser-missed days
  at completion; raw fallback data can no longer overwrite Google enrichment.
- A response is rejected unless the completed day count matches the requested
  duration.
- `max_tokens` responses emit an actionable error and are never cached.
- Internal `spatialReasoning` scratch-pad fields are stripped before streaming.
- NDJSON responses use `application/x-ndjson`, `no-transform`, and
  `X-Accel-Buffering: no` to discourage intermediary buffering.
- Broken or empty `seek_wander_itinerary_cache` entries now self-delete during
  cache loading. Users no longer need to clear `sessionStorage` manually.
- The cache fingerprint now includes `exactHotelAddress` and `isRegion`, avoiding
  false cache hits between geographically different requests.
- Initial generation is deferred to the next event-loop turn and cancelled by
  the React Strict Mode test-mount cleanup. This prevents two Claude requests
  from being sent for one development navigation.

#### Local Failure Root Cause

The earlier loss of React state was not caused by Turbopack hot reload. Dev
logs showed repeated Node.js heap-out-of-memory crashes, which reloaded the
entire page and destroyed in-memory state. The development script now gives
Node a 4 GB heap through `cross-env` while retaining the standard Next.js 14
webpack dev server:

```json
"dev": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next dev"
```

`--turbo` is intentionally not used because the installed Sentry SDK reports
Turbopack support only for Next.js 15.4.1+, while this project remains locked
to Next.js 14.2.35.

---

### Sunday, June 28, 2026 — Streaming Paused & Git Workflow Decision

#### Streaming Feature Status

The progressive itinerary streaming feature is paused for the day and remains
local-only. It must not be pushed to production in its current state.
Development will resume in the next session.

Current local streaming work includes:

- `POST /api/itinerary-stream`
- `useStreamingItinerary()`
- Progressive day rendering on `/itinerary`
- Brace-balanced incremental JSON parsing
- JSON-safe handling of absent `dietaryNote` values
- React Strict Mode duplicate-request prevention
- A development-only 10-request/hour rate-limit bucket

Before production release, the streaming route still needs parity with the
main itinerary route’s spatial validation/repair, accommodation safeguards,
Sentry reporting, and failed-generation logging. The local `/stream-test`
page must also be removed or securely gated before deployment.

#### Git and Production Workflow — Canonical Going Forward

`main` should remain a clean copy of `origin/main`, which represents the
production code baseline. New features must use this workflow:

1. Create a dedicated feature branch from clean `main`.
2. Commit only the files intentionally required by that feature.
3. Never use `git add .` in a dirty worktree.
4. Push the feature branch to GitHub and test its Vercel Preview deployment.
5. Merge the tested feature branch into `main` only when production-ready.
6. The merge to `main` triggers the live production deployment.

Local logs, screenshots, temporary assets, `.claude` worktrees, test harnesses,
and unrelated changes must not be included in feature commits. Matching GitHub
ensures code parity; environment variables, database state, and deployment
configuration must still be verified separately when diagnosing production.

---

### Sunday, July 5, 2026 — Sign-In Gate Removal & Streaming Fixes

**Status:** Implemented and manually verified end-to-end in local development, then pushed directly to `main` the same day after the owner reviewed the sign-in gate removal with a colleague.

#### 1. Removal of the Forced Sign-In Before Generation

**Problem:** Analytics showed visitors reaching `/curate` and abandoning there, because the app forced account creation before showing any itinerary. The wall appeared before the visitor had seen any value.

**Change:** Sign-in is no longer required to generate an itinerary. It is now only required to (a) save the trip to "My Trips," (b) download the PDF, or (c) generate a second itinerary the same day. This reverses the auth gate documented above under "Auth Gate — 'Begin Your Journey' & `/curate` Route" (2026-04-08 entry).

**Files changed:**
- **`src/components/BeginJourneyButton.tsx`** — removed the `<SignedIn>`/`<SignedOut>` split and the `<SignInButton mode="modal" forceRedirectUrl="/curate">` branch. Now a single unconditional `<Link href="/curate">` for all visitors.
- **`src/app/curate/page.tsx`** — removed the server-side `if (!userId) redirect("/")` guard. `prisma.userProfile` is now only queried when `userId` exists; anonymous visitors are passed `credits={undefined}` (both `CurateClient` and `CurationForm` already treat `credits` as optional).
- **`src/app/curate/CurateClient.tsx`** — `credits` prop type widened to `number | undefined`; the existing no-credits banner already stays hidden when `credits` is `undefined`, no logic change needed there.
- **`src/components/CurationForm.tsx`** — the credits-hint effect now also bails out when `credits === undefined`, so anonymous visitors don't see a "you have free credits" hint that doesn't apply to them.

#### 2. Anonymous Quota Enforcement — Server-Side

**Problem:** Once anonymous generation is allowed, the only existing safeguard was a shared 5-per-hour-per-IP rate limit that resets forever — effectively unlimited free generation over time from one IP. Separately, the existing 3-day free-tier duration cap only ran `if (userId)`, so an anonymous request could already ask for up to a 14-day itinerary directly via the API.

**Change:**
- **`src/lib/ratelimit.ts`** — added `anonymousItineraryRatelimit`, a `Ratelimit.slidingWindow(1, "24 h")` keyed by IP, same pattern as the existing `photoRatelimit`/`staticmapRatelimit`.
- **`src/app/api/itinerary-stream/route.ts`** — signed-in requests still use the original `ratelimit` (5/hour); anonymous requests (`!userId`) now use `anonymousItineraryRatelimit` instead. When an anonymous request is rejected by that limiter, the route returns `401` with `{ error: "sign_in_required", message: "..." }` instead of a generic rate-limit error, so the client can render a sign-in prompt rather than an error state. The `duration > 3` check was moved out of the `if (userId)` block so it now runs whenever the requester is not premium — anonymous included — closing the 14-day gap.
- **`src/hooks/useStreamingItinerary.ts`** — added a `signInRequired` state, set when the stream endpoint responds `401`, returned alongside the existing `paywalled` state.
- **`src/app/itinerary/page.tsx`** — added a dedicated "Sign in to keep creating" card (styled like the existing paywall card) shown when `signInRequired` is true, with a `<SignInButton mode="modal">` CTA. The Save button and `<ExportPdfButton>` (both the desktop header strip and mobile mounts) are now wrapped in `<SignedIn>`/`<SignedOut>`, with signed-out visitors seeing a "Sign In to Save or Download" trigger instead of the buttons disappearing outright.

**Accepted trade-off:** the 1-per-24h cap is IP-based, so it can be bypassed by VPN or IP rotation. This is a deliberate choice — no anonymous-only signal (IP, cookie, or browser fingerprint) can be made unspoofable against someone actively trying to evade it. The sign-in requirement remains the actual backstop against sustained abuse; the IP cap only controls casual reuse before that point.

**Unaffected:** all existing input validation (Zod schema, blocklist regexes on `hotelName`/`exactHotelAddress`/`anchorPoints`) and the locked `SYSTEM_PROMPT` injection defence apply identically regardless of auth state. Signed-in free tier (5/30 days, 3-day cap) and premium tier (10/month, 14-day cap) behavior is unchanged. `saveTripToDb`, trip deletion, and admin routes still independently enforce their own auth/ownership checks server-side — the `<SignedIn>` UI wrapper is a convenience layer on top of those, not a replacement for them.

#### 3. Streaming Bug Fix — Tab-Switch Restarted Generation Mid-Stream

**Problem:** Switching browser tabs after Day 1 (or any day) had already streamed in would silently restart the entire generation from scratch, discarding the days already rendered.

**Root cause:** `useStreamingItinerary.ts` set `pendingRetryRef.current = data` unconditionally at the start of every generation call, intended only to support one narrow case — recovering from iOS silently killing a backgrounded fetch mid-stream. Because it was never cleared until the stream finished or errored, it stayed truthy for the entire healthy streaming duration. A separate `visibilitychange` listener checked that ref on every tab-focus event and, finding it truthy, triggered a duplicate `generateItinerary()` call — aborting the perfectly healthy in-flight stream and starting over.

**Fix:** removed the unconditional assignment. `pendingRetryRef.current` now only becomes truthy inside the specific `catch` branch that detects an iOS background-kill (`isIosBackgroundKill && document.visibilityState === "hidden"`), which is the only scenario the retry mechanism was ever meant to cover.

#### 4. Failed Generations Now Logged for the Admin Dashboard

**Problem:** `/admin/metrics` already had full UI support for showing failed generations (a masked-`userId`/"anon" column and a FAILED/TRUNCATED status badge), but `src/app/api/itinerary-stream/route.ts` never wrote a `CostLog` row on failure — only successful generations were ever recorded, so the dashboard had nothing to display.

**Fix:** the stream's `catch` block now writes a `CostLog` row with `success: false`, `userId: userId ?? null`, best-effort token/cost figures (partial usage is hoisted out of the `try` block via `finalUsage` so it survives into `catch`), and an `errorType` of `max_tokens`, `json_parse`, `incomplete_days`, or a generic `generation_error` fallback. Client aborts (visitor navigating away) are deliberately excluded from logging — not a real failure to attribute to anyone.

#### 5. Hero Section — Button Styling & Hydration Fix

**Files:** `src/components/HeroFloating.tsx`, `src/components/BeginJourneyButton.tsx`

- "Begin Your Journey" and "View Sample Itinerary" restyled: solid fills (burnt-orange and a custom darker beige `#DED4BC` respectively) with 2px cross-colored borders (`border-paper` on the burnt-orange button, `border-burnt-orange` on the beige one), replacing the previous transparent/white-overlay look on the sample button.
- Unrelated bug fixed in the same file: the hero background photo was chosen via `Math.random()` inside a `useState` initializer, which runs once during server render and again during client hydration — producing a different random order in each environment and a React hydration-mismatch warning on the image `alt`/`src`. Fixed by rendering the deterministic, unshuffled image order on first paint (identical on server and client) and moving the actual shuffle into a `useEffect` that only runs after mount, client-side only.
