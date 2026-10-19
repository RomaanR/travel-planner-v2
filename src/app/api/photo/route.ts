// ─── /api/photo — Google Places Photo Proxy ───────────────────────────────────
//
// Proxies a Google place photo so MAPS_SERVER_KEY never reaches the browser.
// Accepts either:
//   - a Places API (New) photo name: "places/{placeId}/photos/{ref}"
//   - a legacy photo_reference token (CmRa…, AU_…, ATCDNf…) — older saved trips
//
// Usage: /api/photo?ref=<encodeURIComponent(name or token)>
//
// Each fetch is a billed Place Photos call ($7 / 1,000 after 1,000 free a month),
// counted per day in Redis (travalbee:photo-fetches:YYYY-MM-DD) for cost reporting.

import { getClientIp, photoRatelimit, redis } from "@/lib/ratelimit";
import { PHOTO_NAME_PATTERN, photoMediaUrl } from "@/lib/places";

// Legacy tokens are base64url-safe — alphanumeric + _ and -
const LEGACY_REF  = /^[A-Za-z0-9_\-]+$/;
const MAX_REF_LEN = 2000;

function upstreamUrl(ref: string, apiKey: string): string | null {
  if (PHOTO_NAME_PATTERN.test(ref)) return photoMediaUrl(ref, 800);
  if (LEGACY_REF.test(ref)) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`;
  }
  return null;
}

async function countPhotoFetch(): Promise<void> {
  const key = `travalbee:photo-fetches:${new Date().toISOString().slice(0, 10)}`;
  await redis.incr(key);
  await redis.expire(key, 120 * 24 * 60 * 60);
}

export async function GET(req: Request): Promise<Response> {
  // Rate limit by IP — prevents quota exhaustion on MAPS_SERVER_KEY.
  // 120/hr covers power users generating 4+ itineraries in one session; blocks scrapers.
  // Requests without a client IP share one bucket instead of bypassing the limit.
  const ip = getClientIp(req.headers) ?? "unknown";
  const { success } = await photoRatelimit.limit(ip);
  if (!success) {
    return new Response(null, { status: 429 });
  }

  const ref = new URL(req.url).searchParams.get("ref");
  const apiKey = process.env.MAPS_SERVER_KEY;
  if (!apiKey) {
    return new Response(null, { status: 503 });
  }

  const googleUrl = ref && ref.length <= MAX_REF_LEN ? upstreamUrl(ref, apiKey) : null;
  if (!googleUrl) {
    return new Response(null, { status: 400 });
  }

  // Proxy the bytes — avoids Next.js Image failing to follow chained redirects
  // and keeps MAPS_SERVER_KEY out of browser cache/history entirely.
  try {
    const upstream = await fetch(googleUrl, {
      signal: AbortSignal.timeout(6000),
    });
    await countPhotoFetch().catch(() => {});

    // Photo names and tokens expire; the card falls back to its placeholder.
    if (!upstream.ok) {
      return new Response(null, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=2592000, immutable", // 30 days, in the visitor's browser
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
