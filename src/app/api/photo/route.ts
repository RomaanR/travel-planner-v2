// ─── /api/photo — Google Places Photo Proxy ───────────────────────────────────
//
// Accepts a raw photo_reference token and redirects to the Google Places Photo
// API with the server-side MAPS_SERVER_KEY. The key never reaches the browser —
// Next.js Image Optimization follows the redirect server-side and caches the
// result at Vercel's CDN edge.
//
// Usage: /api/photo?ref=<photo_reference>

// photo_reference tokens are base64url-safe strings — alphanumeric + _ and -
const SAFE_REF = /^[A-Za-z0-9_\-]+$/;
const MAX_REF_LEN = 2000; // Google tokens are typically 200–500 chars

export async function GET(req: Request): Promise<Response> {
  const ref = new URL(req.url).searchParams.get("ref");

  if (!ref || ref.length > MAX_REF_LEN || !SAFE_REF.test(ref)) {
    return new Response(null, { status: 400 });
  }

  const apiKey = process.env.MAPS_SERVER_KEY;
  if (!apiKey) {
    return new Response(null, { status: 503 });
  }

  const googleUrl =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=800&photo_reference=${ref}&key=${apiKey}`;

  // 301 — Next.js Image Optimization follows the redirect server-side,
  // fetches the image from Google, and caches it at the Vercel CDN edge.
  // The browser only ever sees /_next/image?url=/api/photo?ref=... — never the key.
  return Response.redirect(googleUrl, 301);
}
