// ─── /api/photo — Google Places Photo Proxy ───────────────────────────────────
//
// Accepts a raw photo_reference token from the legacy Places API (textsearch/json)
// and proxies the image bytes from Google. Key never reaches the browser.
// All token formats (legacy CmRa..., AU_..., ATCDNf...) use the same legacy
// photo endpoint — they are all photo_reference values, not v1 resource names.
//
// Usage: /api/photo?ref=<photo_reference>

import { photoRatelimit } from "@/lib/ratelimit";

// Tokens are base64url-safe — alphanumeric + _ and -
const SAFE_REF = /^[A-Za-z0-9_\-]+$/;
const MAX_REF_LEN = 2000;

export async function GET(req: Request): Promise<Response> {
  // Rate limit by IP — prevents quota exhaustion on MAPS_SERVER_KEY.
  // 120/hr covers power users generating 4+ itineraries in one session; blocks scrapers.
  const ip = new Headers(req.headers).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    const { success } = await photoRatelimit.limit(ip);
    if (!success) {
      return new Response(null, { status: 429 });
    }
  }

  const ref = new URL(req.url).searchParams.get("ref");

  if (!ref || ref.length > MAX_REF_LEN || !SAFE_REF.test(ref)) {
    return new Response(null, { status: 400 });
  }

  const apiKey = process.env.MAPS_SERVER_KEY;
  if (!apiKey) {
    return new Response(null, { status: 503 });
  }

  // All photo_reference tokens from the legacy Places API use this endpoint —
  // regardless of prefix (AU_, ATCDNf, CmRa, etc.)
  const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`;

  // Proxy the bytes — avoids Next.js Image failing to follow chained redirects
  // and keeps MAPS_SERVER_KEY out of browser cache/history entirely.
  try {
    const upstream = await fetch(googleUrl, {
      signal: AbortSignal.timeout(6000),
    });

    if (!upstream.ok) {
      return new Response(null, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=2592000, immutable", // 30 days
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
