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
| Maps | @react-google-maps/api (Places Autocomplete) |
| AI | @anthropic-ai/sdk — model: `claude-sonnet-4-6` |
| Auth | Clerk v7 — **DEFERRED to Phase 2** |
| ORM | Prisma 7 + PostgreSQL (SQLite for dev) — **DEFERRED to Phase 2** |

---

## Design System — "The Million-Dollar Aesthetic"

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#F5F0E8` | Primary backgrounds — warm off-white |
| `paper-dark` | `#EDE8DC` | Card backgrounds, subtle depth |
| `ink` | `#0A0A0A` | Primary text, borders |
| `ink-light` | `#6B6B6B` | Secondary text, captions, placeholders |
| `emerald-accent` | `#059669` | Links, active states, callout borders |
| `burnt-orange` | `#C2410C` | Primary CTA buttons ONLY |
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
- **Images** — grayscale by default, transition to full color on hover (`filter: grayscale(100%)` → `grayscale(0%)`, `transition-all duration-700`)
- **Spacing** — generous whitespace, editorial breathing room

---

## Environment Variables

### Phase 1 (Active)

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Google Cloud Console → Maps JavaScript API + Places API
ANTHROPIC_API_KEY=                 # console.anthropic.com → API Keys
```

### Phase 2 (Deferred — Clerk + Prisma)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
DATABASE_URL=
```

---

## File Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout — fonts, body bg-paper
│   ├── page.tsx                # Landing page (Hero + Search + Bento)
│   ├── globals.css             # Base styles, CSS custom properties
│   ├── api/
│   │   └── itinerary/
│   │       └── route.ts        # POST — AI itinerary generation
│   └── itinerary/
│       └── page.tsx            # Results display page
├── components/
│   ├── Navbar.tsx              # Thin nav, uppercase links, placeholder Sign In
│   ├── SearchBar.tsx           # Google Places Autocomplete + CTA
│   └── BentoGrid.tsx           # 12-col editorial grid
├── hooks/
│   └── useItinerary.ts         # Client-side fetch + state for itinerary
└── types/
    └── itinerary.ts            # Shared TypeScript types
```

---

## Data Schemas

### ItineraryRequest (POST body)
```ts
type ItineraryRequest = {
  destination: string  // "Kyoto, Japan"
  placeId: string      // Google Place ID
  lat: number
  lng: number
}
```

### ItineraryResponse (AI output)
```ts
type Activity = { title: string; description: string; duration: string }
type DiningRec = { name: string; cuisine: string; pricePoint: string; reservation: boolean }
type DayPlan = {
  day: number
  theme: string
  pace: 'slow' | 'moderate' | 'immersive'
  morning: Activity
  afternoon: Activity
  evening: Activity
  hiddenGem: string
  dining: DiningRec[]
}
type ItineraryResponse = { destination: string; editorial: string; days: DayPlan[] }
```

---

## AI Prompt Convention

Model: `claude-sonnet-4-6` | Max tokens: `4096`

The AI is instructed to roleplay as an elite luxury travel curator (Condé Nast Traveller × private concierge). Each itinerary response includes:
- Vogue-style editorial opener (1 sentence capturing the soul of the destination)
- 3 days, each with a poetic theme title
- Honest pace rating: `slow` (restorative) | `moderate` (balanced) | `immersive` (culturally dense)
- Morning / Afternoon / Evening activities with unique titles
- 1 hidden gem per day (95% of tourists never find it)
- 1–2 dining recommendations per day

Response is **always pure JSON** — no markdown, no preamble.

---

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core Engine | **Active** | UI + Google Maps + Anthropic AI, no auth |
| 2 — Auth + Persistence | Deferred | Clerk + Prisma, save itineraries, user accounts |
| 3 — Premium Features | Future | Booking integrations, PDF export, sharing |
