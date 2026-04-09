// ─── /api/photo — Google Places Photo Proxy ───────────────────────────────────
//
// Accepts a raw photo_reference token and proxies the image bytes from Google.
// Supports both legacy Places API tokens and new Places API (v1) tokens
// (AU_ / ATCDNf prefixes). Key never reaches the browser.
//
// Usage: /api/photo?ref=<photo_reference>

// New Places API (v1) tokens start with AU_ or ATCDNf
const isNewPlacesFormat = (ref: string) =>
  ref.startsWith("AU_") || ref.startsWith("ATCDNf");

// Tokens are base64url-safe — alphanumeric + _ and -
const SAFE_REF = /^[A-Za-z0-9_\-]+$/;
const MAX_REF_LEN = 2000;

export async function GET(req: Request): Promise<Response> {
  const ref = new URL(req.url).searchParams.get("ref");

  if (!ref || ref.length > MAX_REF_LEN || !SAFE_REF.test(ref)) {
    return new Response(null, { status: 400 });
  }

  const apiKey = process.env.MAPS_SERVER_KEY;
  if (!apiKey) {
    return new Response(null, { status: 503 });
  }

  // New Places API (v1): places.googleapis.com/v1/{resourceName}/media
  // Legacy Places API:   maps.googleapis.com/maps/api/place/photo
  const googleUrl = isNewPlacesFormat(ref)
    ? `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}`
    : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`;

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
