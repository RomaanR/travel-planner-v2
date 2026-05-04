import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 5 generations per user per sliding 1-hour window.
// Keyed by Clerk userId (authenticated) or IP address (unauthenticated).
// Unauthenticated requests with no x-forwarded-for header are rejected at the
// route level before reaching this limiter — no shared "anonymous" bucket.
export const ratelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,                       // surfaces usage in Upstash dashboard
  prefix:    "travalbee:itinerary",       // namespaced — clean Redis keyspace
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

// 30 static map requests per IP per sliding 1-hour window.
// /api/staticmap calls Google Static Maps API (MAPS_SERVER_KEY) — ~$2/1000 requests.
// A real user generates one map per PDF export, so 30/hr is more than sufficient.
export const staticmapRatelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix:    "travalbee:staticmap",
});
