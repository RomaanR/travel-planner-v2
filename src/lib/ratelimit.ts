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
  prefix:    "seek-wander:itinerary",    // namespaced — clean Redis keyspace
});
