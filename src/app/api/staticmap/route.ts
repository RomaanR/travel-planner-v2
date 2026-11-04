import { NextRequest, NextResponse } from "next/server";
import { DAILY_CAPS, getClientIp, staticmapRatelimit, withinDailyBudget } from "@/lib/ratelimit";

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
  // Rate limit by IP — prevents quota exhaustion on MAPS_SERVER_KEY.
  // 30/hr is generous for real users (one map per PDF export); blocks bots.
  // Requests without a client IP share one bucket instead of bypassing the limit.
  const ip = getClientIp(req.headers) ?? "unknown";
  const { success } = await staticmapRatelimit.limit(ip);
  if (!success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const markers = req.nextUrl.searchParams.getAll("m");

  if (markers.length === 0) {
    return new NextResponse("No markers provided", { status: 400 });
  }
  // Each marker must be a plain "lat,lng" pair within range, and there is a sane maximum.
  const COORD = /^-?\d{1,3}(\.\d{1,7})?,-?\d{1,3}(\.\d{1,7})?$/;
  const validMarker = (m: string) => {
    if (!COORD.test(m)) return false;
    const [lat, lng] = m.split(",").map(Number);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  };
  if (markers.length > 40 || !markers.every(validMarker)) {
    return new NextResponse("Invalid markers", { status: 400 });
  }
  if (!(await withinDailyBudget("staticmaps", DAILY_CAPS.staticMaps))) {
    return new NextResponse("Service busy", { status: 503 });
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
