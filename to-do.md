# TravalBee — To-Do

Agreed direction (Oct 2026): the problem is attracting customers, not infrastructure. Keep the stack (Next.js, Prisma, Supabase, Clerk, Vercel). Refactor around an **editable trip** built from **verified places**, cut AI + Google cost per trip, and make the home page convert.

Target architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Decisions: [`docs/adr/`](docs/adr/README.md) (all **Proposed** — review and mark Accepted)

Work on feature branches from clean `main`; never `git add .` in this worktree.

## Phase 0 foundations (from ARCHITECTURE.md §11)
- [ ] Review ADRs 0002–0012 and accept / amend each
- [ ] Hosting (ADR-0003): confirm Vercel Pro + function limits; Supabase Pro; co-locate regions; staging DB for previews
- [ ] Upgrade Next.js + Clerk together to current majors (ADR-0002)
- [ ] CI on GitHub Actions + branch protection on `main` (ADR-0010)
- [ ] Vitest + Playwright harness; boundary lint rules (ADR-0002, ADR-0010)
- [ ] `prisma migrate` baseline of production schema (ADR-0009)
- [ ] Typed config module + Terraform import of Vercel/Supabase/Upstash/Google key settings (ADR-0011)
- [ ] OpenNext dry-run build to prove AWS portability (ADR-0003)

---

## 0. Measure first
- [x] Cost split measured 2026-10-19: Google 92% (~$0.83/trip) vs Claude ~$0.07 — before the Places API (New) change
- [ ] Check the Google Cloud billing breakdown by SKU (Text Search, Details, Photos)
- [ ] Add a simple activation funnel: visit → planner → itinerary generated → saved/shared (segment real users vs friends/family)

## 1. Urgent fixes (from the 2026-09-06 audit)
- [x] Stop leaking `MAPS_SERVER_KEY` in destination image URLs (`getPlacePhoto.ts`, `/api/trips`, shared-page metadata); proxy images, then rotate the key
- [x] Retire the old `/api/itinerary` route (or apply the same limits) — it bypasses the guest 1/day + 3-day rules
- [x] Credits: reserve before generating, finalise on success, release on failure (no double-spend from parallel requests); stop relying on a dashboard visit to reset balances
- [ ] Pricing page: remove "Pay once. Travel forever." and the disabled "Coming Soon" checkout; every limit hit must lead to an action that actually works
- [x] Fix Stripe billing P1–P7 (renewals, payment records, ordering, missing events, `invoice.paid`, duplicate subscriptions, atomic idempotency) — branch `fix/stripe-billing`, see [`docs/stripe-setup.md`](docs/stripe-setup.md)
- [x] Apply new billing tables (done 2026-10-18)
- [ ] Run the Stripe test plan in `docs/stripe-setup.md` before enabling the Premium button
- [x] Credits & quotas: one rule set (`src/lib/credits.ts`), only successful generations charged, premium credit reserved up front and refunded on failure, one generation at a time per user/guest, checks before quota is spent, read-only dashboard
- [x] Retire legacy `/api/itinerary` route
- [x] Saving: signed save tokens (no client JSON), idempotent saves, original request stored with the trip
- [x] Privacy: `user.deleted` removes trips/profile and cancels subscriptions; server Maps key no longer in photo URLs; `/api/trips` returns summaries only
- [x] Schema: Unicode cache keys, weekly opening hours (shown for the actual trip weekday), CostLog model/details calls, Trip `request`/`generationId`/`updatedAt`, StripeEvent retention
- [ ] Enable `user.deleted` on the Clerk webhook endpoint
- [ ] Rotate `MAPS_SERVER_KEY` (it appeared in photo URLs before this fix)
- [ ] Optional: set a dedicated `ITINERARY_SIGNING_SECRET` (falls back to a key derived from `CLERK_SECRET_KEY`)
- [ ] Contract step after deploy: delete old-format `PlaceCache` rows, remove `isOldFormat`, drop `PlaceCache.photoUrl` and `hoursOpen`
- [x] Guests on iOS: a backgrounded generation is aborted and the auto-retry hits the 1/day limit → fixed by §1b below

## 1b. Generation survives leaving the page (iOS Safari) — START 2026-10-19
Goal: the app runs flawlessly when the user switches apps, locks the phone or Safari reloads the tab, using the patterns robust apps use: **work runs on the server independent of the browser connection, results are persisted, and the page resumes from server state.**

Root cause today: generation is one 60–120 s streaming request owned by the page. iOS suspends background tabs within seconds and cuts the connection (and may discard the tab entirely). The route passes `req.signal` to Anthropic, so the disconnect **cancels the generation**; the client's iOS retry then restarts from zero (guests hit the 1/day limit). Not a client- vs server-side rendering issue.

**Step 1 — quick fix (no lost work, no double charge)**
- [x] Assign a `requestId` per generation, kept in sessionStorage (not the URL — decided 2026-10-19)
- [x] Stop cancelling Anthropic on client disconnect; the server finishes under Vercel `waitUntil`
- [x] Persist progress + finished itinerary + save token in Redis for 24 h under `requestId` (`src/lib/generationStore.ts`)
- [x] On stream loss / `visibilitychange` / `pageshow` / reload: follow `GET /api/generations/{id}` instead of regenerating
- [x] Retry never consumes quota twice (same `requestId` attaches with 202)
- [x] Local live test 2026-10-19: cut after day 1 → server finished → resumed → re-POST attached → exactly 1 CostLog row
- [x] Test on a real iPhone (passed 2026-10-19): switch apps mid-generation, lock screen, kill-and-reopen tab, airplane mode, as guest
- [ ] Known trade-off: leaving mid-generation and starting a different trip returns "already being prepared" until the first finishes (≤ ~2 min) — consider an explicit cancel
- [ ] Known gap: a premium credit reserved by a run killed at maxDuration is not refunded (status `stalled`) — fixed by step 2 leases

**Step 2 — proper fix (ADR-0004, durable jobs)**
- [ ] `GenerationJob` table; `POST /api/generations` → 202 `{ jobId }`
- [ ] Queue worker (Upstash QStash/Workflow) generates day by day, persisting each day
- [ ] Page resumes from the job: shows saved days, then follows progress (polling or SSE)
- [ ] Lease/heartbeat, max attempts, dead-letter state; credit reservation released on failure
- [ ] Save trip from the job result on the server (no token round-trip)

**Robustness patterns to apply across the app** (from successful apps)
- [ ] Idempotency keys on every write a retry can repeat (generate, save, delete, checkout)
- [ ] Nothing important only in memory: URL + server state are the source of truth; local storage is a cache
- [ ] Resume on `visibilitychange`/`pageshow`/`online`; never restart work the server already did
- [ ] Timeouts + retries with backoff per external provider; graceful degradation (Google down → trip without photos)
- [ ] Spend kill-switch and feature flags; alerts on failure rate and daily spend (ADR-0014, to write)

## 1c. CI/CD (planned, on hold) — see ADR-0010
- [ ] Phase 1: fix 2 type errors, re-enable build checks, GitHub Actions (typecheck, lint, Vitest, build, audit), first unit tests, branch protection on `main`
- [ ] Phase 2: `prisma migrate` baseline, migrations applied from CI, separate staging DB for previews
- [ ] Phase 3: Playwright smoke on preview URLs and after production deploy, Sentry releases
- [ ] Turn type/lint checks back on in `next.config.mjs` and fix the 2 remaining TypeScript errors (`RefinePanel.tsx`, `SearchBar.tsx`)

## 2. Cut Claude cost
- [ ] Switch `claude-sonnet-4-6` → `claude-sonnet-5-5` ($3/$15 → $2/$10), test on a few cities first
- [ ] Use structured outputs (`output_config.format`) → guaranteed valid JSON, delete the JSON-repair second call
- [ ] Remove or shorten the per-stop `spatialReasoning` field; validate routes in code after generation (distance between consecutive stops, same city) and regenerate only a failing day
- [ ] Prompt-cache the fixed system prompt + schema
- [ ] Run a small eval of Haiku 5.5 ($0.10/$0.50) against the spatial rules; switch if quality holds (the earlier failed test was Haiku 4.5)

## 3. Cut Google cost (quick wins, before the library)
- [x] Places API (New): free IDs-only Text Search biased to the destination + Place Details by ID with field masks ("full" $20/1k, "basic" $5/1k for nature/adventure) — `src/lib/places.ts`
- [x] Dedupe spellings: a new spelling resolves (free) to a place ID already cached → reused, no paid call
- [x] Fix the cache-key bug that strips non-ASCII names
- [x] Google coordinates replace the model's when within 15 km
- [x] Photo credits (author + link) on timeline cards; `/api/photo` accepts new photo names and counts fetches per day in Redis
- [x] Destination photo via free ID search + photos-only details; Autocomplete widgets request Basic fields only
- [x] Live test 2026-10-19 (8 fresh places): Google $0.392 → $0.160 (−59%), trip total $0.43 → $0.20
- [x] Checked Google terms: only place IDs (indefinitely) and coordinates (30 days) may be stored
- [ ] **Owner decision 2026-10-19: keep caching ratings/hours/photo names and saved-trip content for now** (outside Google's terms) — revisit before scaling / with ADR-0006/0007
- [ ] **Photo credits (Google requirement — risk: key suspension)**, ~1 h. Timeline cards are done; still missing on:
  - [ ] My Trips cards — destination photo (`TripsClient.tsx`; needs author from `getPlacePhoto.ts`)
  - [ ] Shared trip page + trip header destination photo (`/shared/[id]`, `/trips/[id]`)
  - [ ] PDF export activity photos (`PrintItinerary.tsx` — currently hidden in print)
- [ ] Google logo next to Places data (ratings, hours) wherever no Google map is on screen (PDF, mobile list view with map hidden)
- [ ] Show the daily photo-fetch count (`travalbee:photo-fetches:*`) in `/admin/metrics`
- [ ] Booking-link hotel lookup (`affiliate.ts`) still uses legacy Find Place ($17/1k, on click only)
- [ ] Check the real Google Cloud bill — free monthly allowances may already cover current volume

## 4. Core refactor
- [ ] **One generation service** used by every entry point: one shared request schema, one prompt builder (remove the copy-pasted code between the two routes)
- [ ] **One entitlement service** for guest / free / premium limits (replaces logic scattered across routes and pages)
- [ ] **New trip data model:** store the original inputs (dates, transport, preferences, brief) plus versions of the plan; reopening a trip on any device keeps everything
- [ ] **Editing without AI:** delete, reorder, move to another day, lock a stop, undo
- [ ] **Regenerate a single day** around locked stops (bounded, clearly priced) instead of full-trip "Refine"
- [ ] Refine must never clear the current itinerary before checking credits/auth
- [ ] Shared trips private by default, with explicit revocable share links
- [ ] Per-stop actions: directions + official site/booking link
- [ ] Break up the oversized components (`CurationForm` 936 lines, etc.)
- [ ] Add a small regression test suite: generation, quotas, save/reopen, sharing privacy, billing

## 5. City places library
- [ ] Choose 3–5 launch cities you can check yourself (focus: 2–3-day food/culture city breaks)
- [ ] Build ~150 tagged places per city (neighbourhood, category, price, dietary, interests) — AI via Batch API (50% off) or hand-curated
- [ ] Match each place to Google once, store `place_id` + own content (descriptions, tags); refresh hours/rating/photos by ID only when shown
- [ ] Evaluate OpenStreetMap (locations) + Wikimedia (landmark photos) to replace part of the Google usage
- [ ] Trip assembly in code: filter by interests/budget, group nearby places into days, order route, add meals; one small AI call for theme + editorial text
- [ ] Cities outside the library: fall back to the current full-AI path, or don't offer them yet

## 6. Home page
- [x] **Quick planner in the hero** (2026-10-19): "TravalBee" on one line; destination + dates → planner opens prefilled at the next step; Google script loads after idle/first tap
- [x] Compact cookie notice (no misleading "Decline"); never covers the main actions on phones
- [x] Copy you can stand behind: stats strip, bento cells, step 2, loader steps, shared page
- [x] Every create button opens the planner; sample/shared pages get "Plan a Trip Like This" (prefilled)
- [x] SEO basics: robots.txt, sitemap.xml, canonical, branded share image, noindex on shared trips
- [x] Funnel events (Vercel Analytics): hero_planner_submitted → planner_submitted → itinerary_ready → trip_saved — needs Vercel Pro for custom events
- [ ] Set `NEXT_PUBLIC_APP_URL=https://travalbee.com` in Vercel (canonical/sitemap fall back to it anyway)
- [ ] Navbar "SIGN IN" wraps onto two lines at 375 px width (pre-existing)
- [ ] **Trip Ideas section** (agent-managed): cards like "48 hours of food in Lisbon" → full ready-made itinerary → "Make it mine" copies it into the planner with the user's dates; each idea is a crawlable page
- [ ] **"Where to go this month"** seasonal strip, agent-drafted monthly
- [ ] Add real user quotes once there are users (unsupported claims replaced 2026-10-19)
- [ ] _Parked:_ daily travel news — revisit later as a small "Travel briefing" strip using the same agent workflow

## 7. Content agent (approval workflow)
- [ ] Vercel cron runs weekly (Trip Ideas) / monthly (seasonal strip)
- [ ] Claude + web search researches and writes a draft → saved in the DB as `pending`
- [ ] Email preview + approval link via Resend
- [ ] Admin page (gated like `/admin/metrics`) to approve / edit / reject
- [ ] Approved items publish to the home page; drafts use original wording and link sources

## 8. Database (Supabase — staying)
- [ ] Check plan: free projects pause after inactivity and have limited backups → consider Pro ($25/mo)
- [ ] Confirm Supabase and Vercel functions are in the same region
- [ ] Confirm pooled `DATABASE_URL` has `?pgbouncer=true`
- [ ] Switch from `prisma db push` to `prisma migrate` before the refactor changes the schema

## 9. Housekeeping
- [x] Uncommitted local changes resolved (legacy route deleted; `PrintItinerary` cleanup and `cross-env` dev script committed)
- [ ] Clean up untracked logs, screenshots and temp folders; add them to `.gitignore`
- [ ] Remove or gate `/stream-test`
- [ ] Merge CLAUDE.md and CLAUDE-v2.md into one up-to-date spec (current CLAUDE.md is the old Seek Wander version)
