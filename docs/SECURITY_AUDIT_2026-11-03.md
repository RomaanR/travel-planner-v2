# TravalBee Security Audit, 2026-11-03

Scope: end-to-end review of the production app (travalbee.com, repo `travel-planner-v2`): every API route and server action, auth and webhooks, input validation, secrets, headers, dependencies, abuse and cost controls, and the main user workflows under failure conditions.

Method: source review of all sensitive code, `npm audit --omit=dev`, live black-box probes of production (unauthenticated calls, forged webhooks, path traversal on the photo proxy, header inspection, exposed-file checks), and comparison against OWASP Top 10 (2021), OWASP API Security Top 10 (2023), Next.js data-access/Server Actions guidance, Stripe webhook guidance and Clerk guidance.

No code was changed during this audit. Line numbers are approximate to the commit on `docs/security-audit` (9063b65).

---

## 1. Summary

| Severity | Count | Theme |
|---|---|---|
| High | 3 | Cost-abuse paths and an injection into the business inbox |
| Medium | 8 | Dependencies, launch config, error leakage, privacy mismatch, missing build gates |
| Low | 11 | Hardening and hygiene |

No critical, exploitable-today vulnerability was found: no way to read another user's data, no SSRF, no SQL injection, no secret exposure, no payment bypass. The main exposure is **money**: a few unauthenticated or weakly limited paths let an attacker run up Google/Anthropic bills.

---

## 2. Findings (ranked)

### HIGH

**H1. Public server action calls a billed Google API with no auth or limits**
- Evidence: `src/app/actions/affiliate.ts:37` `generateBookingLink(hotelName, city, ...)` is a `"use server"` action, so it is callable by anyone who knows the action ID. No auth, no rate limit, no input length cap. It performs a billed Google `findplacefromtext` request.
- Impact: scripted loop = unbounded Google spend.
- Fix: require sign-in or apply an IP+user rate limit, cap input lengths (Zod), cache results in Redis by normalised hotel+city.

**H2. Per-IP limits can be bypassed, and there is no global daily spend ceiling**
- Evidence: `src/lib/ratelimit.ts:76` `getClientIp` uses the raw `x-real-ip` / first `x-forwarded-for`. IPv6 clients can rotate through a /64 (billions of addresses), bypassing the guest 1-per-24h generation limit and the photo (120/h), staticmap (30/h) and support (3/h) limits. `src/app/api/photo/route.ts:28` counts daily Google fetches in Redis but never enforces a cap.
- Impact: free-generation farming, photo/map proxy cost abuse.
- Fix: normalise IPv6 to its /64 prefix before keying; add a global daily circuit breaker (Redis counter) for Anthropic generations and Google photo/map calls that fails closed to a friendly "try again tomorrow".

**H3. Support form injects unescaped user text into an HTML email; send is not awaited**
- Evidence: `src/app/api/support/route.ts:109` interpolates `message` (and email) into HTML; `:85` `resend.emails.send` is not awaited.
- Impact: an attacker can inject HTML/links/phishing content into mail delivered to the business inbox (content injection, not script execution). Un-awaited send can be dropped when the serverless function freezes after responding, so real tickets may silently go missing.
- Fix: HTML-escape all interpolated fields (or send plain text), await the send inside the handler, keep ticket row as the source of truth.

### MEDIUM

**M1. Vulnerable dependencies (`npm audit`: 41 advisories, 4 critical, 16 high)**
- Notable: `@clerk/nextjs` 6.39.0 has GHSA-vqx2-fgx2-5wq9 (route-protection bypass in middleware **only for apps using `createRouteMatcher`**; this app does not, so real exposure is low). Fix is a drop-in upgrade to 6.39.8. `zod` 4.3.6 has a high-severity memory-exhaustion advisory fixed in 4.6.6; zod validates public endpoints. Remaining Next 14.x advisories are DoS-type and need Next 15, which is blocked by the Clerk v6/v7 coupling. Most others are build-time or transitive.
- Fix: upgrade Clerk to 6.39.8 and zod to >=4.6.6 now; plan Next 15 + Clerk 7 as one coordinated upgrade.

**M2. Stripe checkout success/cancel URL falls back to localhost**
- Evidence: `src/app/api/stripe/checkout/route.ts:68` and `portal/route.ts:22` use `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"`. If the env var is unset in Vercel, paying customers are redirected to localhost after paying. Launch blocker.
- Fix: set `NEXT_PUBLIC_APP_URL=https://travalbee.com` in Vercel; fail loudly (throw) in production when unset instead of defaulting. Add a rate limit to checkout creation.

**M3. Raw error messages are sent to the client and stored**
- Evidence: `src/app/api/itinerary-stream/route.ts:~903` sends `e.message` through `send({type:"error"})` and `writer.fail(...)`. Upstream vendor/billing/quota errors can reach users and the Redis snapshot.
- Fix: map known failures to fixed user-safe strings; log the raw message server-side (Sentry) only.

**M4. Sentry captures PII and traces 100% of requests**
- Evidence: `sentry.server.config.ts:18` `sendDefaultPii: true`; `:11` `tracesSampleRate: 1` (same in edge config). Conflicts with the minimal-data stance in the Privacy page and raises Sentry cost.
- Fix: `sendDefaultPii: false`, `tracesSampleRate` 0.05-0.1, scrub request bodies.

**M5. Account deletion leaves personal rows behind**
- Evidence: `src/lib/accountDeletion.ts:14` deletes trips, detaches CostLog, deletes UserProfile, cancels subscriptions, but **does not remove `SupportTicket` (email + message) or the Subscription/Invoice/Dispute mirror rows**. The Privacy page promises deletion within 30 days.
- Fix: delete or anonymise SupportTicket by email/userId; delete or anonymise billing mirror rows (retain only what law requires for tax records, and say so in Privacy). Enable the Clerk `user.deleted` webhook event.

**M6. Build quality gates are disabled and there is no CI**
- Evidence: `next.config.mjs:13` `typescript.ignoreBuildErrors: true`; `:16` `eslint.ignoreDuringBuilds: true`; two known TS errors (RefinePanel.tsx, SearchBar.tsx). A type error that would catch a real bug ships silently.
- Fix: fix the two errors, turn both flags off, add a GitHub Action running `tsc --noEmit` + lint on PRs.

**M7. No Content-Security-Policy**
- Evidence: headers in `next.config.mjs` include X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, but no CSP. Mitigated today because the app has no `dangerouslySetInnerHTML` with user data.
- Fix: ship a `Content-Security-Policy-Report-Only` first (Google Maps, Clerk, Stripe, Sentry allowances), tighten, then enforce.

**M8. Hosting plan terms**
- Vercel Hobby is non-commercial. A paid product needs Vercel Pro (also needed for more frequent crons and higher function limits).

### LOW

- **L1.** Cron routes compare `authorization !== \`Bearer ${secret}\`` (`cron/news/route.ts:17`, `cron/cleanup/route.ts:12`): not constant-time. Use `timingSafeEqual`.
- **L2.** `X-Powered-By: Next.js` sent. Set `poweredByHeader: false`.
- **L3.** `robots.txt` lists `/admin/` and `/dashboard` paths. Harmless (both 404/auth-gated) but advertises them; drop the Disallow lines and rely on `noindex` + auth.
- **L4.** Authenticated API 401/JSON responses carry `Cache-Control: public, max-age=0, must-revalidate`. Add `private, no-store` to private API responses.
- **L5.** `/api/staticmap` marker parameter (`route.ts:25`) is not validated for count or length. Cap at ~10 markers, validate numeric ranges.
- **L6.** Itinerary schema validates `lat`/`lng` only as finite and dates only by regex; no range checks (lat ±90, lng ±180), no check that duration matches the dates. Add range checks and a consistency check.
- **L7.** `refundPremiumCredit` (`src/lib/credits.ts:74`) increments without an upper bound. Clamp to credits purchased.
- **L8.** If a generation function is killed by the platform, the premium credit is not refunded and the lock only self-expires (300 s vs maxDuration 290). Add a reaper (cron) that refunds generations stuck in "running" past their deadline.
- **L9.** Save-token HMAC key falls back to a derivation of `CLERK_SECRET_KEY` when `ITINERARY_SIGNING_SECRET` is unset. Set a dedicated secret and fail if missing in production.
- **L10.** Support form has no CAPTCHA/bot challenge (limited only by IP, see H2). Add Turnstile if spam appears.
- **L11.** Client cache hygiene: per-user localStorage archive `seek_wander_archive:<userId>` is not cleared on sign-out, and `TripHeaderActions.tsx` still touches the legacy global key. Offline mode is currently disabled (`OFFLINE_MODE_ENABLED = false`), so exposure is nil today; clear on sign-out before enabling offline mode.

---

## 3. Best-practice checklist

| Practice | Status | Notes |
|---|---|---|
| Authz checked at the data layer, not only in middleware (Next.js guidance; CVE-2025-29927) | Followed | Bare `clerkMiddleware()`, every handler/page calls `auth()`; Next 14.2.35 is past the CVE fix |
| IDOR protection on owned resources | Followed | `findUnique` + owner check, neutral 404, `deleteMany({id,userId})` |
| Input validation on all public inputs | Mostly | Strict Zod on generation/support; gaps: affiliate action, staticmap, coordinate/date ranges |
| SSRF prevention on proxies | Followed | Photo/staticmap proxies use fixed Google hosts and allow-listed identifiers |
| Webhook verification (Stripe, Clerk/svix) | Followed | Raw body, signature check, idempotency table, Stripe re-fetch |
| Secrets management | Followed | None in repo; 3 `NEXT_PUBLIC_` vars, all intended-public; key split for Google |
| Rate limiting / anti-automation (API4:2023) | Partial | Present on main paths; IPv6 bypass, no global ceiling (H2) |
| Unrestricted resource consumption / cost control | Partial | See H1, H2 |
| Security headers | Partial | Good set, HSTS via Vercel; no CSP |
| Dependency hygiene (A06) | Partial | See M1; no automated alerts (enable Dependabot) |
| Logging and monitoring (A09) | Partial | Sentry present but over-collecting (M4) |
| Error handling without leaking internals | Partial | See M3 |
| Secure CI / build gates | Missing | See M6 |
| Data minimisation and deletion | Partial | See M5 |
| Cookie/session security | Followed | Clerk-managed, httpOnly, HTTPS only |
| Private data not cached publicly | Partial | Service worker uses NetworkOnly for `/api/`; API cache headers need `private` (L4) |

---

## 4. Workflow and failure-mode review

| Workflow | Edge case | Result |
|---|---|---|
| Generate itinerary (guest) | IPv6 address rotation | Free-trip limit bypassable (H2) |
| Generate itinerary (signed in) | Double-click / two tabs | Handled: requestId + Redis lock; second request returns existing generation |
| Generate itinerary | Anthropic timeout / malformed JSON | Handled: 180 s stream timeout, JSON self-repair, credit refunded, lock released, CostLog written |
| Generate itinerary | Function killed by platform | Premium credit not refunded until reaper exists (L8) |
| Generate itinerary | Client disconnects mid-stream | Handled: generation continues via `waitUntil`, resumable through `/api/generations/[id]` |
| Generate itinerary | Upstream error text | Reaches the user (M3) |
| Save trip | Replayed or tampered token | Rejected: HMAC, constant-time compare, 7-day expiry |
| Save trip | Token from another user | Token is not bound to a user (accepted design; low risk because token comes from the owner's own generation) |
| View / delete trip | Other user's ID | Neutral 404 |
| Shared trip | Guessed ID | UUID, not enumerable |
| Checkout | `NEXT_PUBLIC_APP_URL` unset | Redirects to localhost (M2) |
| Stripe webhook | Duplicate or out-of-order delivery | Handled: idempotent transaction, event re-fetch |
| Stripe webhook | Handler failure | Returns 500, Stripe retries, Sentry alert |
| Account deletion | Webhook missing | Rows remain; enable `user.deleted` event (M5) |
| Support | Email send fails | Ticket may exist with no notification (H3) |
| News cron | One source feed down | Isolated per source; others still ingest; ETags avoid refetch |
| News page | Database slow | `/news` is `force-dynamic`, so each hit queries the DB; consider `revalidate` |
| Photo proxy | Path traversal / other hosts | 400, tested live |
| Webhooks, cron, private APIs | Unauthenticated calls | 401 / signature failure, tested live |
| Admin / test pages | Non-admin access | Neutral 404, tested live |

---

## 5. Strengths worth keeping

Strict allow-listed photo proxy, signed save tokens, Stripe/Clerk webhook design, IDOR-safe trip routes, sensible order of checks in generation (auth, rate limit, lock, then spend), atomic credit reserve/refund, no raw SQL, no secrets in source, no source maps or `.env` exposed, no CORS allow-origin, NetworkOnly service worker for APIs, neutral 404s for admin pages.

---

## 6. Recommended fix order

1. **Now (cost and launch blockers):** H1, H2 (IPv6 /64 + global daily cap), H3, M2 (set env var, fail loudly).
2. **Soon (one batch):** M1 (Clerk 6.39.8, zod 4.6.6), M3, M4, M5, M6.
3. **Then:** M7 (CSP report-only), M8 (Vercel Pro), and the Low items as one hardening pass.

## 7. User-side actions (no code)

Set `NEXT_PUBLIC_APP_URL=https://travalbee.com` and `RESEND_TO_ADDRESS=contact@opsisx.com` in Vercel and redeploy; enable the Clerk `user.deleted` webhook event; set a dedicated `ITINERARY_SIGNING_SECRET`; enable GitHub Dependabot alerts; move to Vercel Pro before taking payments; have a lawyer review Privacy/Terms/Cookies.
