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
- [ ] Pull avg cost per trip and the Claude vs Google split from `/admin/metrics`
- [ ] Check the Google Cloud billing breakdown by SKU (Text Search, Details, Photos)
- [ ] Add a simple activation funnel: visit → planner → itinerary generated → saved/shared (segment real users vs friends/family)

## 1. Urgent fixes (from the 2026-09-06 audit)
- [ ] Stop leaking `MAPS_SERVER_KEY` in destination image URLs (`getPlacePhoto.ts`, `/api/trips`, shared-page metadata); proxy images, then rotate the key
- [ ] Retire the old `/api/itinerary` route (or apply the same limits) — it bypasses the guest 1/day + 3-day rules
- [ ] Credits: reserve before generating, finalise on success, release on failure (no double-spend from parallel requests); stop relying on a dashboard visit to reset balances
- [ ] Pricing page: remove "Pay once. Travel forever." and the disabled "Coming Soon" checkout; every limit hit must lead to an action that actually works
- [x] Fix Stripe billing P1–P7 (renewals, payment records, ordering, missing events, `invoice.paid`, duplicate subscriptions, atomic idempotency) — branch `fix/stripe-billing`, see [`docs/stripe-setup.md`](docs/stripe-setup.md)
- [ ] Apply new billing tables (`npx prisma db push`) before deploying that branch, then run the Stripe test plan
- [ ] Turn type/lint checks back on in `next.config.mjs` and fix the 5 TypeScript errors

## 2. Cut Claude cost
- [ ] Switch `claude-sonnet-4-6` → `claude-sonnet-5-5` ($3/$15 → $2/$10), test on a few cities first
- [ ] Use structured outputs (`output_config.format`) → guaranteed valid JSON, delete the JSON-repair second call
- [ ] Remove or shorten the per-stop `spatialReasoning` field; validate routes in code after generation (distance between consecutive stops, same city) and regenerate only a failing day
- [ ] Prompt-cache the fixed system prompt + schema
- [ ] Run a small eval of Haiku 5.5 ($0.10/$0.50) against the spatial rules; switch if quality holds (the earlier failed test was Haiku 4.5)

## 3. Cut Google cost (quick wins, before the library)
- [ ] Key `PlaceCache` by Google `place_id`, not by Claude's spelling of the name
- [ ] Fix the cache-key bug that strips non-ASCII names (`buildCacheKey` — Japanese/Arabic names collapse to an empty key and collide)
- [ ] Photo proxy (`/api/photo`): check whether every view hits Google; add CDN caching (`s-maxage`) if Google's terms allow
- [ ] Migrate to Places API (New) with field masks / cheaper SKUs (check current pricing)
- [ ] Check Google Maps Platform terms on what can be stored (place IDs indefinitely; coordinates and other content limited)

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
- [ ] **Quick planner in the hero:** "Where to?" + dates directly on the home page, prefilled into the planner
- [ ] **Trip Ideas section** (agent-managed): cards like "48 hours of food in Lisbon" → full ready-made itinerary → "Make it mine" copies it into the planner with the user's dates; each idea is a crawlable page
- [ ] **"Where to go this month"** seasonal strip, agent-drafted monthly
- [ ] Replace unsupported claims ("100% hidden gems", "Zero tourist traps", "95% never find", loader's "Michelin guides" copy) with real examples; add real user quotes later
- [ ] Fix the mobile cookie banner covering the main call-to-action
- [ ] Every "create" button (mobile menu, sample, shared page, pricing) opens the planner directly instead of going back to `/`
- [ ] SEO basics: `robots.txt`, `sitemap.xml`, canonical URLs, homepage share image
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
- [ ] Decide on the uncommitted local changes (`dietaryNote` → `null`, `PrintItinerary` prop cleanup, `cross-env` 4GB dev script)
- [ ] Clean up untracked logs, screenshots and temp folders; add them to `.gitignore`
- [ ] Remove or gate `/stream-test`
- [ ] Merge CLAUDE.md and CLAUDE-v2.md into one up-to-date spec (current CLAUDE.md is the old Seek Wander version)
