import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ITINERARY_LIMIT = process.env.NODE_ENV === "development" ? 10 : 5;
const ITINERARY_PREFIX =
  process.env.NODE_ENV === "development"
    ? "travalbee:itinerary:development"
    : "travalbee:itinerary";

// 10 generations per user locally, 5 in production, per sliding 1-hour window.
// Keyed by Clerk userId (authenticated) or IP address (unauthenticated).
// Unauthenticated requests with no x-forwarded-for header are rejected at the
// route level before reaching this limiter — no shared "anonymous" bucket.
export const ratelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(ITINERARY_LIMIT, "1 h"),
  analytics: true,                       // surfaces usage in Upstash dashboard
  prefix:    ITINERARY_PREFIX,            // isolated local and production buckets
});

// 1 generation per 24-hour sliding window per IP — anonymous (signed-out) requests only.
// Signed-in requests (free or premium) keep using `ratelimit` above plus their
// account-level CostLog/credits checks. Anonymous requests have no account to tie a
// quota to, so without this they could otherwise generate indefinitely by simply
// waiting out the hourly `ratelimit` window forever — this caps that exposure while
// still letting a first-time visitor try the product with zero signup friction.
export const anonymousItineraryRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(1, "24 h"),
  analytics: true,
  prefix:    "travalbee:itinerary:anon",
});

// 60 trips-list fetches per user per sliding 1-hour window.
// Separate from itinerary generation — /api/trips GET is called on every /trips
// page load and must not burn into the user's 5/hr generation quota.
export const tripsRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(60, "1 h"),
  analytics: true,
  prefix:    "travalbee:trips",
});

// 3 support tickets per IP per sliding 1-hour window.
// Public unauthenticated endpoint — IP-keyed to prevent spam bot submissions.
// No shared "anonymous" bucket — missing x-forwarded-for is rejected at the route level.
export const supportRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix:    "travalbee:support",
});

// 120 photo proxy requests per IP per sliding 1-hour window.
// /api/photo proxies Google Places photos using MAPS_SERVER_KEY — unlimited calls
// would exhaust quota. 120/hr covers power users generating 4+ itineraries in a
// single session (~25-30 uncached refs each) while blocking automated scrapers.
// Note: CDN-cached photos (30-day TTL) bypass the function entirely and don't
// count against this limit — only fresh/uncached refs hit the rate limiter.
export const photoRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(120, "1 h"),
  analytics: true,
  prefix:    "travalbee:photo",
});

// ─── Client IP ────────────────────────────────────────────────────────────────
// Vercel sets x-real-ip and x-forwarded-for from the connecting client and
// overwrites client-supplied values. x-forwarded-for can be a list
// ("client, proxy1, …"); the first entry is the client.
export function getClientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return normalizeIp(real);
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? normalizeIp(first) : null;
}

// A single IPv6 customer normally controls a whole /64, i.e. billions of addresses, so keying a
// limit on the full address lets one person dodge it just by rotating. IPv6 is reduced to its
// /64 prefix (the first four groups); IPv4 is returned unchanged.
export function normalizeIp(ip: string): string {
  if (!ip.includes(":")) return ip;
  let addr = ip.split("%")[0].toLowerCase();
  // IPv4-mapped (::ffff:1.2.3.4) is really an IPv4 client.
  const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  // Replace a trailing embedded IPv4 with two hex groups so the group count is right.
  const v4 = addr.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const hex = (a: string, b: string) => (((+a) << 8) | +b).toString(16);
    addr = addr.slice(0, addr.length - v4[0].length) + `${hex(v4[1], v4[2])}:${hex(v4[3], v4[4])}`;
  }
  const [head, tail] = addr.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail !== undefined && tail ? tail.split(":") : [];
  const missing = Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = tail === undefined
    ? headGroups
    : [...headGroups, ...Array(missing).fill("0"), ...tailGroups];
  if (groups.length < 4) return ip;
  return groups.slice(0, 4).map((g) => g.padStart(4, "0")).join(":") + "::/64";
}

// ─── Global daily spend ceiling ───────────────────────────────────────────────
// Per-IP limits stop one caller; this stops many callers (botnets, rotating addresses) from
// running up the Anthropic or Google bill. A plain per-day counter in Redis: returns false
// once `max` calls have been used today (UTC). Fails OPEN if Redis is unreachable so a Redis
// outage cannot take the product down; the per-IP limits still apply.
export async function withinDailyBudget(name: string, max: number): Promise<boolean> {
  try {
    const key = `travalbee:daily:${name}:${new Date().toISOString().slice(0, 10)}`;
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 60 * 60 * 26);
    return used <= max;
  } catch {
    return true;
  }
}

// Daily caps, overridable from the environment without a deploy.
export const DAILY_CAPS = {
  generations:   Number(process.env.DAILY_CAP_GENERATIONS)   || 300,
  placesLookups: Number(process.env.DAILY_CAP_PLACES)        || 5000,
  photos:        Number(process.env.DAILY_CAP_PHOTOS)        || 20000,
  staticMaps:    Number(process.env.DAILY_CAP_STATICMAPS)    || 2000,
};

// 30 hotel-link lookups per IP per hour (each can trigger one billed Places request).
export const bookingLinkRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix:    "travalbee:booklink",
});

// 10 checkout sessions per user per hour.
export const checkoutRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix:    "travalbee:checkout",
});

// ─── One generation at a time ─────────────────────────────────────────────────
// Prevents parallel generations from the same user or guest racing past the
// quota check. Expires on its own if the function is killed before releasing.
const GENERATION_LOCK_TTL_S = 300; // > route maxDuration (290 s)

export async function acquireGenerationLock(identity: string): Promise<boolean> {
  const result = await redis.set(`travalbee:generation-lock:${identity}`, "1", {
    nx: true,
    ex: GENERATION_LOCK_TTL_S,
  });
  return result === "OK";
}

export async function releaseGenerationLock(identity: string): Promise<void> {
  await redis.del(`travalbee:generation-lock:${identity}`);
}

// 30 static map requests per IP per sliding 1-hour window.
// /api/staticmap calls Google Static Maps API (MAPS_SERVER_KEY) — ~$2/1000 requests.
// A real user generates one map per PDF export, so 30/hr is more than sufficient.
export const staticmapRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix:    "travalbee:staticmap",
});
