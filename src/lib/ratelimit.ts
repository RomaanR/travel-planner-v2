import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 20 itinerary generations per user per sliding 1-hour window.
// Keyed by Clerk userId (authenticated) or IP address (unauthenticated).
export const ratelimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,                       // surfaces usage in Upstash dashboard
  prefix:    "seek-wander:itinerary",    // namespaced — clean Redis keyspace
});
