import { unstable_cache } from "next/cache";
import { emptyPlacesUsage, resolvePlaceId } from "@/lib/places";
import { plannerHref } from "@/lib/plannerLink";
import type { MapPoint } from "@/types/itinerary";

// Place IDs may be stored indefinitely under Google's terms; the lookup itself
// is an IDs-only Text Search, which is free.
const cachedPlaceId = unstable_cache(
  async (destination: string) => resolvePlaceId(destination, null, emptyPlacesUsage()),
  ["destination-place-id"],
  { revalidate: 30 * 24 * 60 * 60 },
);

function centroid(points: MapPoint[]): { lat: number; lng: number } | null {
  if (points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * "Plan a trip like this" link for an existing itinerary: opens the planner with
 * this destination already selected.
 *   1. trips saved with their request (Oct 2026+) → its exact place
 *   2. older trips → free place-ID lookup + the centre of the itinerary's stops
 *   3. otherwise → the destination typed into the search box
 */
export async function planLikeThisHref(destination: string, request: unknown, mapPoints: MapPoint[]): Promise<string> {
  const r = request as { placeId?: unknown; lat?: unknown; lng?: unknown; isRegion?: unknown } | null;
  if (r && typeof r.placeId === "string" && typeof r.lat === "number" && typeof r.lng === "number") {
    return plannerHref({
      destination,
      place: { placeId: r.placeId, lat: r.lat, lng: r.lng, isRegion: r.isRegion === true },
    });
  }

  const center = centroid(mapPoints);
  if (center) {
    const placeId = await cachedPlaceId(destination).catch(() => null);
    if (placeId) return plannerHref({ destination, place: { placeId, ...center, isRegion: false } });
  }

  return plannerHref({ destination });
}
