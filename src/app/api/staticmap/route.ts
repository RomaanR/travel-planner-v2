import { NextRequest, NextResponse } from "next/server";

// Proxy for Google Static Maps API using the server-side key.
// Accepts repeated `m=lat,lng` params — one per timeline stop.
// Returns a PNG image suitable for eager-loading inside PrintItinerary.

// Minimal style overrides — keep all city/neighbourhood/road labels visible.
// Only hide the cluttered POI icons (shopping carts, hospital H, etc.).
const STYLES = [
  "feature:poi|element:labels.icon|visibility:off",
  "feature:transit|element:labels.icon|visibility:off",
];

export async function GET(req: NextRequest) {
  const markers = req.nextUrl.searchParams.getAll("m");

  if (markers.length === 0) {
    return new NextResponse("No markers provided", { status: 400 });
  }

  const key = process.env.MAPS_SERVER_KEY;
  if (!key) {
    return new NextResponse("Maps key not configured", { status: 500 });
  }

  // Build the Static Maps URL — size 600x260, scale=2 for retina print quality
  let url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?size=600x260&scale=2&maptype=roadmap&key=${key}`;

  for (const style of STYLES) {
    url += `&style=${encodeURIComponent(style)}`;
  }

  // Burnt-orange numbered markers — one per stop, labels 1–9
  markers.forEach((coords, i) => {
    const label = i < 9 ? String(i + 1) : "•";
    url += `&markers=${encodeURIComponent(`color:0xC2410C|label:${label}|${coords}`)}`;
  });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return new NextResponse("Map fetch failed", { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new NextResponse("Map fetch timeout", { status: 502 });
  }
}
