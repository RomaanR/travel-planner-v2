# Seek Wander — Implementation Roadmap & Backlog
### Engineering & Business Execution Plan
**Classification:** Confidential — ZenithAI Data Room
**Document Version:** 1.0
**Last Updated:** March 2026
**Strategy Status:** ACTIVE — Native Affiliate Pivot

---

## Strategic Context

Seek Wander is pivoting its primary monetization strategy from a **hard Stripe paywall** to **Native Affiliate Placements** — invisible, frictionless monetization embedded directly into the luxury itinerary experience.

**The thesis:** Every hotel, restaurant, and tour the AI recommends is a monetizable booking event. By keeping the product completely free at the point of use, we eliminate conversion friction and maximize top-of-funnel growth. Revenue is captured on the backend when users book the $3,000 hotel or $400 Viator tour that our AI recommended. This is the exact playbook that made NerdWallet, TripAdvisor, and Booking Holdings into category-defining businesses.

**Strategic priority order:**
1. Infrastructure stability (protect margins, prevent abuse)
2. UX polish (maximize retention)
3. Native affiliate monetization (primary revenue engine)
4. Zero-CAC growth automation (n8n flywheel)
5. Legal & compliance (affiliate program approvals)
6. Stripe paywall (deprioritized — optionality, not urgency)

---

## Phase 1 — Security & Infrastructure Stability
> **Priority: IMMEDIATE** | Protects Anthropic margins from abuse before any growth activity

### Task 1.1 — Upstash Redis Rate Limiting
- [ ] Install `@upstash/ratelimit` and `@upstash/redis` packages
- [ ] Create Upstash Redis database at console.upstash.com — copy REST URL + token to env vars
- [ ] Implement sliding-window rate limiter in `src/app/api/itinerary/route.ts`:
  - Authenticated users: **5 generations / hour** keyed by Clerk `userId`
  - Unauthenticated users: **2 generations / hour** keyed by IP address (`x-forwarded-for`)
- [ ] Return `429 Too Many Requests` with `Retry-After` header on limit breach
- [ ] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables

**Technical implementation:**
```ts
// src/app/api/itinerary/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
});

const identifier = userId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
const { success, reset } = await ratelimit.limit(identifier);
if (!success) {
  return Response.json({ error: "Rate limit exceeded" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) }
  });
}
```

**Why this matters:** Without rate limiting, a single malicious actor can drain $50+ of Anthropic credits in minutes. This is the most critical infrastructure gap before any marketing or growth activity.

---

### Task 1.2 — AI JSON Error Handling (Retry + Fix Prompt)
- [ ] Wrap `JSON.parse(aiResponse)` in a try/catch inside `src/app/api/itinerary/route.ts`
- [ ] On parse failure, trigger a secondary "fix" prompt to Claude:
  - Pass the malformed output back to the model
  - Instruct it to return only the corrected, valid JSON
- [ ] If the fix prompt also fails, return a user-friendly `503` error (never expose raw AI output)
- [ ] Log both failures to server console with destination + token counts for monitoring

**Technical implementation:**
```ts
let itinerary: ItineraryResponse;
try {
  itinerary = JSON.parse(rawContent);
} catch {
  // Secondary "fix" prompt
  const fixResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: "You are a JSON repair tool. Return only valid JSON, nothing else.",
    messages: [{ role: "user", content: `Fix this malformed JSON:\n\n${rawContent}` }]
  });
  try {
    itinerary = JSON.parse(fixResponse.content[0].text);
  } catch {
    return Response.json({ error: "Generation failed. Please try again." }, { status: 503 });
  }
}
```

**Why this matters:** Claude produces valid JSON >99% of the time, but network interruptions, token truncation, or edge-case destinations can cause malformed output. Without a retry, users see a broken experience with no path to recovery.

---

## Phase 2 — Core User Experience & Polish
> **Priority: HIGH** | Retention infrastructure before growth spend

### Task 2.1 — Empty State UX (/trips)
- [ ] Detect `trips.length === 0` in `src/app/trips/page.tsx` (server component — no client JS needed)
- [ ] Design full-page editorial empty state matching the "Million-Dollar Aesthetic":
  - Large Cormorant Garamond italic heading: *"Your journeys begin here."*
  - DM Sans body copy: "Every curated itinerary you generate is archived here for you to revisit, share, or export as a dossier."
  - Single burnt-orange CTA button → `/` (the curation form)
  - Optional: Framer Motion fade-in-up animation on the empty state container
- [ ] Ensure `print:hidden` is applied so the empty state never appears in PDF exports

**Design reference:** Match the visual language of the custom `not-found.tsx` page — centered, generous whitespace, serif heading, single clear action.

---

## Phase 3 — Primary Monetization: Native Affiliate Placements
> **Priority: HIGH** | Primary revenue engine — implement before any significant user growth

### Task 3.1 — Affiliate Link Injection System
- [ ] **Register affiliate accounts:**
  - Booking.com Partner Programme (hotels): partners.booking.com
  - Viator Partner Programme (tours & experiences): partner.viator.com
  - GetYourGuide Affiliate (activities): getyourguide.com/partner
  - OpenTable (restaurant reservations): opentable.com/affiliate
- [ ] **Build affiliate URL resolver** at `src/lib/affiliateLinks.ts`:
  - Input: `TimelineItem` (type, title, destination)
  - Output: affiliate URL with tracking parameters or `null` if no match
  - Map `type === "activity"` → Viator / GetYourGuide deep link
  - Map `type === "breakfast" | "lunch" | "dinner"` → OpenTable reservation link
  - Map hotel mentions in `description` → Booking.com search link
- [ ] **Inject links into `TimelineCard`** in `ItineraryViewer.tsx`:
  - Activity/meal cards: add a subtle `"Book Now →"` text link (DM Sans, `text-ink-light`, `hover:text-emerald-accent`)
  - Link opens in `target="_blank" rel="noopener noreferrer sponsored"`
  - Maintains full "Million-Dollar Aesthetic" — no banner ads, no badges, no disruption
- [ ] **UTM parameter strategy:** Append `?utm_source=seekwander&utm_medium=itinerary&utm_campaign={destination}` to all affiliate links for attribution analytics
- [ ] Add affiliate disclosure to `/shared/[id]` page footer (required by FTC + affiliate program TOS)

**Revenue model:**
| Platform | Commission Type | Est. Rate |
|----------|----------------|-----------|
| Booking.com | % of hotel booking value | 4–6% |
| Viator | % of tour booking value | 8% |
| GetYourGuide | % of activity value | 8–10% |
| OpenTable | Per-cover fee | $1–2/cover |

**Why native, not banner:** The product's luxury positioning is its primary differentiator. A "Book on Booking.com →" text link styled in `ink-light` is invisible as advertising. A banner ad destroys the Vogue aesthetic and the trust that drives conversions.

---

## Phase 4 — Zero-CAC Growth & Operations (n8n Automations)
> **Priority: MEDIUM** | Build after affiliate infrastructure is live and generating revenue signals

### Task 4.1 — Automated Social Content Engine
- [ ] **Vercel Cron trigger:** Add new cron route `GET /api/cron/social` to `vercel.json` — schedule: `0 9 * * *` (09:00 UTC daily)
- [ ] **n8n workflow design:**
  1. Webhook node receives trigger from Vercel Cron (secured with `SOCIAL_CRON_SECRET`)
  2. Supabase node queries: `SELECT destination, COUNT(*) FROM CostLog GROUP BY destination ORDER BY COUNT DESC LIMIT 1` — most-generated destination in last 7 days
  3. Anthropic node generates editorial caption: *"The 3-day Kyoto itinerary our concierge curates for discerning travellers. Temples at dawn. Kaiseki at dusk."* (<=280 chars, no hashtags, Vogue tone)
  4. HTTP Request node posts to Pinterest Boards API + Twitter/X API v2
  5. Error handler node sends Slack/email alert on failure
- [ ] Store `N8N_WEBHOOK_URL` and `SOCIAL_CRON_SECRET` in Vercel environment variables
- [ ] Create n8n instance at cloud.n8n.io (free tier sufficient for this volume)

**Zero-CAC thesis:** Every AI-generated social post is a free acquisition touchpoint. A single viral Pinterest pin of a "7-Day Amalfi Coast Itinerary" can drive hundreds of organic sign-ups with zero ad spend.

---

### Task 4.2 — White-Glove Founder's Welcome Email
- [ ] **Clerk webhook setup:** In Clerk Dashboard → Webhooks → Add endpoint → `POST /api/webhooks/clerk`
  - Subscribe to `user.created` event
  - Copy Webhook Secret to `CLERK_WEBHOOK_SECRET` env var
- [ ] **Webhook route** at `src/app/api/webhooks/clerk/route.ts`:
  - Verify signature using `svix` package (Clerk's webhook verification library)
  - Extract `email_address` and `first_name` from payload
  - POST to n8n webhook with user data + 10-minute delay instruction
- [ ] **n8n workflow design:**
  1. Webhook receives user data
  2. Wait node: 10-minute delay
  3. Send Email node (via Resend or Postmark):
     - From: `roman@seekwander.com` (personal, not noreply)
     - Subject: `Your first journey`
     - Body: Plain text, no HTML, no logo — intentionally personal:

```
Hi [first_name],

I wanted to reach out personally. You just used Seek Wander to plan
your first trip — and I'm genuinely grateful you gave it a try.

Seek Wander isn't an algorithm. Every itinerary is curated with the
same care a private travel consultant would give a long-standing client.

If you have feedback, questions, or a dream destination you want me to
know about — just reply here. I read every email.

Warmly,
Roman
Founder, Seek Wander
```

**Why this converts:** Plain-text founder emails sent 10 minutes after sign-up consistently achieve 60-80% open rates. This is the highest-leverage retention touchpoint in the entire stack.

---

## Phase 5 — Legal & Compliance
> **Priority: MEDIUM** | Required for affiliate programme approvals and general liability

### Task 5.1 — Terms of Service & Privacy Policy
- [ ] **Generate legal pages** using a reputable generator (Termly.io or iubenda) configured for:
  - Affiliate link disclosure (FTC compliance)
  - Cookie usage (Clerk session cookies, Google Maps)
  - Data retention policy (trips stored until user deletion request)
  - AI-generated content disclaimer ("itineraries are curated recommendations, not guarantees")
- [ ] **Create routes:**
  - `src/app/legal/terms/page.tsx` — Terms of Service
  - `src/app/legal/privacy/page.tsx` — Privacy Policy
  - Both: server components, `export const dynamic = "force-dynamic"`, Seek Wander aesthetic
- [ ] **Add footer links** to Navbar or a new `Footer.tsx` component: "Terms · Privacy · © 2026 Seek Wander"
- [ ] **Affiliate disclosure banner** on `ItineraryViewer.tsx` and `/shared/[id]`: small DM Sans text at bottom: *"Seek Wander may earn a commission on bookings made through links in this itinerary."*

**Why this is a blocker:** Booking.com, Viator, and GetYourGuide all require a Privacy Policy URL at affiliate application time. This must be live before submitting applications.

---

## Phase 6 — Future Expansion (Deprioritized)
> **Priority: LOW** | Optionality — implement only if affiliate revenue is insufficient

### Task 6.1 — Stripe Paywall ($4.99 Transactional Gate)
- [ ] **Add `UserBalance` Prisma model** (already pre-designed in schema — run `prisma db push`)
- [ ] **Install Stripe:** `npm install stripe @stripe/stripe-js`
- [ ] **Checkout session route** at `src/app/api/stripe/checkout/route.ts`:
  - Creates Stripe Checkout session for $4.99 one-time payment
  - `success_url` → `/itinerary?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url` → `/`
- [ ] **Webhook fulfillment** at `src/app/api/webhooks/stripe/route.ts`:
  - Verify Stripe webhook signature
  - On `checkout.session.completed`: `prisma.userBalance.upsert({ paidCredits: { increment: 1 } })`
- [ ] **Gate itinerary generation** in `src/app/api/itinerary/route.ts`:
  - Check `userBalance.freeGenerationsUsed < 1` (allow first free)
  - Check `userBalance.paidCredits > 0` (allow if credits exist)
  - Otherwise: return `402 Payment Required` with Stripe Checkout URL
- [ ] **Paywall UI** in `CurationForm.tsx`: Show burnt-orange "Unlock for $4.99" button on submit if user has no credits
- [ ] **Add environment variables:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

**Deprioritization rationale:** The affiliate model has higher lifetime value per user with zero conversion friction. A $4.99 gate reduces top-of-funnel conversion by an estimated 60-80% at the pre-brand-awareness stage. This feature is preserved as an option — not abandoned.

---

## Backlog Summary

| # | Task | Phase | Priority | Status |
|---|------|-------|----------|--------|
| 1.1 | Upstash Redis Rate Limiting | Infrastructure | IMMEDIATE | Pending |
| 1.2 | AI JSON Error Handling | Infrastructure | IMMEDIATE | Pending |
| 2.1 | Empty State UX (/trips) | UX Polish | HIGH | Pending |
| 3.1 | Affiliate Link Injection | Monetization | HIGH | Pending |
| 4.1 | Automated Social Engine (n8n) | Growth | MEDIUM | Pending |
| 4.2 | Founder's Welcome Email (n8n) | Growth | MEDIUM | Pending |
| 5.1 | Terms of Service & Privacy Policy | Legal | MEDIUM | Pending |
| 6.1 | Stripe Paywall ($4.99) | Monetization | LOW | Pending |

---

*This document is a living backlog. Update task statuses and add sub-tasks as implementation progresses. Sync with CLAUDE.md when any item reaches production.*
