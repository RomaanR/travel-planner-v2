# Seek Wander — Brand Guidelines & Marketing Strategy
### Brand & Marketing Reference Document
**Classification:** Confidential — ZenithAI Data Room
**Document Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Brand Positioning & Core Identity](#1-brand-positioning--core-identity)
2. [Visual Guidelines — The Million-Dollar UI/UX](#2-visual-guidelines--the-million-dollar-uiux)
3. [Tone & Voice — Copywriting Lexicon](#3-tone--voice--copywriting-lexicon)
4. [Zero-CAC Acquisition Engine](#4-zero-cac-acquisition-engine)
5. [User Lifecycle & White-Glove Retention](#5-user-lifecycle--white-glove-retention)
6. [Monetization Aesthetics](#6-monetization-aesthetics)

---

## 1. Brand Positioning & Core Identity

### The Archetype: The Ultimate Digital Concierge

Seek Wander occupies a singular position in the travel category: it is not a booking engine, not a review aggregator, and emphatically not a chatbot. It is a **digital concierge** — the invisible, impeccably-informed companion that curates a complete, opinionated luxury itinerary for a discerning traveller in under sixty seconds.

The aesthetic reference point is deliberate and non-negotiable: **Vogue meets National Geographic**. The editorial authority of Condé Nast. The geographic authority of National Geographic. Combined into a product that looks and feels like it was designed by the art department of a luxury print magazine, not a Silicon Valley startup.

> **The single founding insight:** Affluent travellers do not want more options — they want fewer, better ones. The anxiety of infinite choice is the enemy of the luxury experience. Seek Wander's entire value proposition is the confident, opinionated elimination of that anxiety.

### Target Demographics

| Segment | Profile | Seek Wander Value |
|---------|---------|-------------------|
| **The Affluent Escapist** | HHI $200k+, 35–55, takes 4–6 international trips/year, stays at 5-star properties | Eliminates planning overhead; validates instincts with editorial authority |
| **The Luxury Digital Nomad** | Location-independent, $80k–$150k income, values experience over possessions | Rapid destination research tool; shareable itineraries as social currency |
| **The Occasion Traveller** | Anniversary, milestone birthday, honeymoon — once-in-a-decade trip, budget unconstrained | High emotional stakes demand trusted curation, not crowdsourced opinions |
| **The Corporate Traveller** | Bleisure extension, 2–3 free days after a conference | Needs fast, high-quality options with no research burden |

### Competitive Positioning

| Competitor | Their Category | Seek Wander's Differentiation |
|-----------|---------------|-------------------------------|
| TripAdvisor | Crowdsourced reviews | Editorial curation — one authoritative voice, not 10,000 conflicting ones |
| Google Travel | Utility / search | Aesthetic + narrative — a dossier, not a search result |
| ChatGPT | Raw AI output | Purpose-built luxury UI; enriched with live data; no prompt engineering required |
| Airbnb Experiences | Booking platform | Zero commercial bias — recommendations are curated, not paid placements |
| Condé Nast Traveller | Editorial media | Interactive and personalised — the magazine curates *your* trip, not a generic one |

### The Brand Promise

> *"Every journey, curated with the care of a private travel consultant who has been everywhere you want to go."*

---

## 2. Visual Guidelines — The Million-Dollar UI/UX

### Design Philosophy

Every pixel of the Seek Wander interface must pass a single editorial test: **would this feel at home in a luxury print publication?** The reference documents are Kinfolk, Monocle, and Condé Nast Traveller — not app stores.

The consequence of this philosophy is a set of non-negotiable design constraints that differentiate the product from every generic SaaS travel tool on the market.

### Color Palette — "Paper and Ink"

The palette is derived from the physical materials of luxury print: warm paper stock, carbon ink, and restrained accent colours that signal status without shouting.

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#F5F0E8` | Primary page backgrounds — warm off-white, never pure white |
| `paper-dark` | `#EDE8DC` | Card surfaces, input backgrounds, subtle depth |
| `ink` | `#0A0A0A` | Primary text, borders, wordmark — near-black, never pure black |
| `ink-light` | `#6B6B6B` | Secondary text, captions, metadata, placeholders |
| `emerald-accent` | `#059669` | Links, active states, OPEN status indicators |
| `burnt-orange` | `#C2410C` | Primary CTA buttons, active tab underline, CLOSED status |
| `white` | `#FFFFFF` | Text on dark/photographic backgrounds only |

**Critical rules:**
- `paper` (#F5F0E8) is the default page background — never use pure white (#FFFFFF) as a page background
- `burnt-orange` is reserved exclusively for primary actions and active indicators — never use for decorative elements
- No gradients, no drop shadows, no glassmorphism — these are disqualifying aesthetic crimes

### Typography

| Role | Font Family | Usage Rules |
|------|-------------|-------------|
| **Display headings** | Cormorant Garamond, serif | Italic, massive scale (48–96px), tight leading (0.9–1.0), editorial opener text |
| **UI headings** | Cormorant Garamond, serif | H1–H3, bold or semi-bold, generous tracking |
| **Body & UI** | DM Sans, sans-serif | All body copy, navigation, buttons, labels — never italic in UI |
| **Micro-copy** | DM Sans, sans-serif | UPPERCASE, `letter-spacing: 0.2em`, used for category labels and nav items |

**Implementation (Next.js):**
```css
/* Loaded via next/font/google in layout.tsx */
font-serif: 'Cormorant Garamond' → className: font-serif
font-sans:  'DM Sans'           → className: font-sans (Tailwind default)
```

### Component Rules — Non-Negotiable

**Shape:**
- `border-radius: 0` on every component — buttons, cards, inputs, modals, images
- `rounded-none` applied globally via Tailwind config
- No pill buttons, no rounded badges, no soft corners anywhere

**Motion:**
- Framer Motion on all page sections: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.6`, `ease: 'easeOut'`
- Stagger children at 0.1s increments
- Tab content: `<AnimatePresence mode="wait">` with `y: 8` entrance / `y: -8` exit, `duration: 0.35`

**Photography:**
- All images render grayscale by default: `filter: grayscale(100%)`
- Transition to full colour on hover: `filter: grayscale(0%)`, `transition: all 700ms`
- This creates the editorial "magazine reveal" effect and signals intentionality

**Spacing:**
- Generous whitespace is mandatory — empty space is not waste, it is luxury
- Section padding minimum: `py-24` (96px vertical)
- Never compress layouts to fit more content — cut content instead

**Borders:**
- Only hairline borders: `border border-black/5` or `border-b border-ink/20`
- No box shadows — borders only
- Dividers use `<hr>` at `border-ink/10`

### UI Copy Rules

- Never use "AI" anywhere in the user interface, page titles, metadata, or marketing copy
- The product is positioned around the outcome, not the technology
- `<ClerkProvider>` is conditionally rendered — the app must look flawless without auth

---

## 3. Tone & Voice — Copywriting Lexicon

### The Voice: Understated Confidence

Seek Wander speaks the way a world-travelled private member's club concierge speaks to a returning guest: with authority, warmth, and zero filler. It does not exclaim. It does not beg. It does not use power words borrowed from SaaS growth marketing.

**The three-word brief:** *Confident. Understated. Specific.*

### Core Voice Principles

**1. Specificity over superlatives**
Never say "the best restaurants." Say "a kaiseki counter with a six-month waitlist." The specificity signals insider knowledge. The superlative signals a generic listicle.

**2. Declarative over interrogative**
Never ask the user what they want — the product already knows. Avoid "What kind of trip are you looking for?" Replace with "Tell us your destination. We'll handle the rest."

**3. Restraint over enthusiasm**
Excitement is vulgar at the luxury price point. Replace "You're going to love this!" with silence — let the quality of the itinerary speak. The product does not perform enthusiasm.

**4. Editorial authority**
Write every line as if it appeared in a Condé Nast publication. Every recommendation is considered. Every word is chosen. Nothing is filler.

### Use This / Not That — Copywriting Lexicon

| Use This | Not That | Reason |
|----------|----------|--------|
| **Curation** | Generation / Creation | "Generation" signals AI machinery; "Curation" signals human editorial judgment |
| **Journey** | Trip / Vacation | "Journey" implies significance and intentionality |
| **Itinerary** | Plan / Schedule | "Itinerary" is the vocabulary of luxury travel; "plan" is the vocabulary of logistics |
| **Complimentary** | Free | "Free" is a discount word; "complimentary" is a hospitality word |
| **Dossier** | Document / PDF | A "dossier" is what a private intelligence firm or luxury concierge prepares |
| **Curated by Seek Wander** | Generated by AI | Never mention the technology; only the outcome |
| **Your concierge** | The app / The tool | Anthropomorphise the service; dehumanise the technology |
| **Discover** | Find / Search | "Discover" implies revelation; "find" implies a search engine |
| **Considered** | Smart / Intelligent | "Considered" is editorial language; "intelligent" is product marketing language |
| **Tailored** | Personalised / Custom | "Personalised" is SaaS; "tailored" is Savile Row |
| **Destination** | Location / Place | Destination implies intent and aspiration |
| **Hidden gem** | Off the beaten path | "Off the beaten path" is travel blog language; "hidden gem" is concierge language |
| **At your leisure** | Whenever you want | Hospitality register versus casual register |
| **We recommend** | You might like / Suggested | Authority over suggestion |

### Sample Copy by Context

**Landing page hero:**
> *"The journeys you deserve, curated."*
> Not: "AI-powered travel planning for everyone."

**Empty state (/trips, new user):**
> *"Your journeys begin here."*
> *"Every itinerary your concierge curates is archived here — ready to revisit, share, or export as a dossier."*

**Save button:**
> *"Archive this journey"*
> Not: "Save trip"

**Share prompt:**
> *"Share your dossier"*
> Not: "Share your itinerary"

**Error state:**
> *"Your concierge encountered an unexpected interruption. Please try again."*
> Not: "Something went wrong."

---

## 4. Zero-CAC Acquisition Engine

The Seek Wander growth model is built on a single principle: **every piece of infrastructure we build should also be a distribution channel.** The application itself generates the marketing content. The database drives the SEO. The AI writes the social copy.

### Channel 1 — Programmatic SEO

**Architecture:** Static Next.js pages generated for high-intent luxury travel search queries.

**URL structure:**
```
/destinations/[slug]
  e.g. /destinations/amalfi-coast-luxury-itinerary
       /destinations/kyoto-3-day-luxury-guide
       /destinations/maldives-overwater-villa-itinerary
```

**Page generation strategy:**
- Source destination list from `PlaceCache` table — every destination ever generated becomes a candidate landing page
- Generate static pages at build time via `generateStaticParams()` in Next.js App Router
- Each page: editorial hero image (Google Places photo), Vogue-style destination editorial (Claude-generated at build time), sample 1-day timeline from the most recent cached generation, single CTA: "Curate Your Complete Journey →"

**SEO targeting:**
- Primary keywords: `[destination] luxury itinerary`, `[destination] 3-day luxury travel guide`, `[destination] private concierge itinerary`
- Schema markup: `TouristDestination`, `TouristTrip` (JSON-LD)
- Meta description template: *"A curated [N]-day [destination] itinerary for discerning travellers. Handpicked hotels, restaurants, and experiences — tailored to your pace and preferences."*

**Moat:** As PlaceCache grows with every generation, the number of indexable destination pages grows automatically. By month 12, the site could have 500+ indexed luxury travel landing pages with zero additional editorial effort.

### Channel 2 — Automated Social Content Engine (n8n)

**Infrastructure:** n8n cloud instance triggered daily via Vercel Cron (`GET /api/cron/social`, `0 9 * * *`).

**Workflow design:**

```
Step 1: Vercel Cron → POST /api/cron/social (SOCIAL_CRON_SECRET header)
Step 2: n8n Webhook node receives trigger
Step 3: Supabase Query node
        SELECT destination, COUNT(*) as gens
        FROM CostLog
        WHERE createdAt > NOW() - INTERVAL '7 days'
        GROUP BY destination ORDER BY gens DESC LIMIT 1
Step 4: Anthropic node — generate editorial caption
        Prompt: "Write a 240-character luxury travel caption for [destination].
                 Tone: Vogue editorial. No hashtags. No exclamation marks.
                 Begin mid-sentence. Evoke wanderlust through specificity."
Step 5: HTTP Request → Pinterest Boards API (create pin with PlaceCache photo)
Step 6: HTTP Request → Twitter/X API v2 (post thread: caption + link to /destinations/[slug])
Step 7: Error handler → Slack alert on any failure
```

**Content example output:**
> *"Three days in Kyoto, and you haven't seen the real city yet. The tourists leave Fushimi Inari by noon. That's when it becomes yours."*

**Pinterest strategy:** Pinterest has a 4–6 month content decay curve — a pin posted today continues driving traffic for half a year. Luxury travel is Pinterest's second-largest category. A single viral pin of a "5-Day Amalfi Coast Itinerary" can drive 50,000+ monthly impressions at zero marginal cost.

### Channel 3 — Referral via Shared Dossiers

**Mechanism:** Every `/shared/[id]` page is a public, SEO-indexable URL with full OG metadata.

**Viral coefficient:** Every time a user shares their itinerary (via `ShareButton` native share / clipboard), the recipient lands on a branded Seek Wander page with an acquisition CTA: *"Curated by Seek Wander — Create Your Own →"*

**Mobile sticky CTA:** Fixed bottom bar on `/shared/[id]` — `bg-burnt-orange`, full-width — permanently visible as the user scrolls the itinerary.

---

## 5. User Lifecycle & White-Glove Retention

### The Onboarding Philosophy

The first 10 minutes after sign-up are the highest-leverage retention window in the entire user lifecycle. Most SaaS products waste this window with an automated HTML email template featuring a logo, three feature bullets, and a "Get Started" button that nobody clicks.

Seek Wander's onboarding is designed around a single, radical constraint: **it must feel like a human sent it.**

### The Automated Founder's Welcome

**Trigger:** Clerk `user.created` webhook → `POST /api/webhooks/clerk` → verified via `svix` → n8n webhook with user `email` and `first_name`.

**n8n workflow:**
```
Step 1: Webhook receives { email, firstName, userId }
Step 2: Wait node — 10 minutes
        (User has had time to generate their first itinerary)
Step 3: Supabase Query — check if user has generated at least 1 trip
        If yes: personalise with destination
        If no:  use generic welcome copy
Step 4: Send Email via Resend
        From:    roman@seekwander.com
        Reply-To: roman@seekwander.com
        Subject: Your first journey
        Format:  Plain text ONLY — no HTML, no logo, no unsubscribe footer
```

**Email copy (destination-aware variant):**
```
Hi [firstName],

I wanted to reach out personally. You just curated your first journey
to [destination] with Seek Wander — and I'm genuinely grateful you
gave it a try.

Seek Wander isn't a search engine. Every itinerary is considered with
the same care a private travel consultant gives a long-standing client.
Hidden restaurants. The museum room nobody queues for. The hotel that
doesn't advertise.

If you have feedback, a dream destination, or just want to tell me
what we got right or wrong — reply here. I read every email.

Warmly,
Roman
Founder, Seek Wander
```

**Why plain text:** HTML emails are immediately recognisable as automated. A plain-text email from `roman@seekwander.com` with no logo, no CTA button, and no unsubscribe footer reads as a personal message from a founder. Open rates for this format consistently reach 60–80% versus 20–25% for HTML equivalents.

**The complimentary curation:** The email references the user's existing generation — it does not "gift" credits mechanically. The generosity is implicit: the product is free. The email makes the user feel that the founder personally noticed their first use.

### Retention Touchpoints

| Touchpoint | Trigger | Channel | Goal |
|-----------|---------|---------|------|
| Founder's Welcome | Sign-up + 10 min | Email (plain text) | Establish personal relationship |
| Journey Archived | Trip saved | In-app toast | Reinforce value of saving |
| Share Prompt | After generation | In-app modal | Viral referral loop |
| Programmatic SEO | Organic search | Web | Top-of-funnel re-acquisition |
| Social Pin | Daily cron | Pinterest / Twitter | Brand awareness + SEO backlinks |

---

## 6. Monetization Aesthetics

### The Inviolable Rule: No Display Advertising

Seek Wander will never run display advertising. Banner ads, sponsored content labels, affiliate badges, "Ad" markers, and interstitials are categorically incompatible with the luxury brand positioning.

The moment a user sees a banner ad on Seek Wander, the brand becomes indistinguishable from TripAdvisor. The trust that justifies acting on a Seek Wander recommendation — which is the entire monetization thesis — is instantly destroyed.

**All revenue must be invisible at the point of experience.**

### Revenue Stream 1 — Native Affiliate Placements

**The concierge model:** A luxury hotel concierge who books a restaurant for a guest receives a referral fee. The guest never sees the transaction. The recommendation is trusted because it is excellent — the fee is irrelevant to its quality. This is the exact model Seek Wander applies.

**Implementation:** Every `TimelineItem` with type `"activity"`, `"breakfast"`, `"lunch"`, or `"dinner"` is passed through `src/lib/affiliateLinks.ts` which returns a booking URL or `null`.

**In-UI rendering:**
```
[TimelineCard — Le Bernardin, New York]
  Michelin three-star French cuisine...         ← AI-generated description
  DINNER  ·  $$$$  ·  Reservation recommended  ← metadata badges
  Reserve a table →                             ← affiliate link (OpenTable)
                                                   DM Sans 8pt, ink-light colour
                                                   Indistinguishable from concierge copy
```

**Affiliate partners and commission structure:**

| Partner | Category | Commission |
|---------|----------|-----------|
| Booking.com | Hotels & accommodation | 4–6% of booking value |
| Viator | Tours & experiences | 8% of booking value |
| GetYourGuide | Activities | 8–10% of booking value |
| OpenTable | Restaurant reservations | $1–2 per seated cover |

**Revenue at scale:** A user who books a $3,000 hotel night via a Booking.com affiliate link generates $120–180 in commission from a single click. At 1,000 monthly active users with a 15% booking conversion, this represents $18,000–27,000 MRR with zero marginal cost.

### Revenue Stream 2 — Stripe Paywall (Deprioritized)

**Status:** Architecture complete, implementation deprioritized pending affiliate revenue validation.

**The thesis for eventual implementation:** Once Seek Wander has established brand authority and user trust through the affiliate model, a $4.99 per-itinerary or $19/month subscription can be introduced as a premium tier — not a gate. Users who have experienced the product for free are far more likely to pay for premium features (multi-city trips, white-glove PDF exports, priority generation) than cold users hitting a paywall.

**UI approach when implemented:** Stripe Checkout is triggered via a custom luxury modal — not a redirect. The modal uses `paper` background, Cormorant Garamond heading ("Unlock Your Journey"), and a single burnt-orange button. It is designed to feel like a membership application, not a payment form.

### Legal Disclosure Requirements

All affiliate link placements must include a passive disclosure in compliance with FTC guidelines and affiliate programme terms of service:

- **Per-itinerary footer:** *"Seek Wander may earn a commission on bookings made through links in this itinerary. Our recommendations are never influenced by commercial relationships."*
- **Privacy Policy:** Must reference affiliate data collection (click tracking, booking attribution)
- **Terms of Service:** Must reference the nature of affiliate relationships

The disclosure is set in DM Sans, 8pt, `ink-light` (#6B6B6B) — present, compliant, and visually subordinate to the editorial content.

---

*This document defines the non-negotiable brand standards for Seek Wander. All product, marketing, and editorial decisions must be evaluated against the single test: does this belong in a luxury print publication? If not, it does not belong in Seek Wander.*
