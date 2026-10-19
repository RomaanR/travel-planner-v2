// ─── Google Places API (New) client ───────────────────────────────────────────
// Every server-side Places call goes through here, so each one is priced at the
// SKU its field mask triggers (https://developers.google.com/maps/billing-and-pricing/pricing).
//
//   resolvePlaceId  → Text Search, field mask `places.id`  → Essentials (IDs Only): FREE, unlimited
//   getPlaceDetails → Place Details by ID:
//        "full"  (rating, price, opening hours …)         → Enterprise: $20 / 1,000 (1,000 free / month)
//        "basic" (location + photos only)                 → Essentials: $5 / 1,000 (10,000 free / month)
//   photo media     → Place Photos (New)                   → $7 / 1,000 (1,000 free / month)
//
// Prices are list prices before the monthly free allowance — used for cost reporting.

const API = "https://places.googleapis.com/v1";
const KEY = process.env.MAPS_SERVER_KEY ?? "";

export const PLACES_COST = {
  idSearch:       0,
  detailsFull:    0.020,
  detailsBasic:   0.005,
  photo:          0.007,
} as const;

export type PlacesUsage = { idSearches: number; detailsFull: number; detailsBasic: number };
export const emptyPlacesUsage = (): PlacesUsage => ({ idSearches: 0, detailsFull: 0, detailsBasic: 0 });
export const placesUsageCost = (u: PlacesUsage): number =>
  u.idSearches * PLACES_COST.idSearch + u.detailsFull * PLACES_COST.detailsFull + u.detailsBasic * PLACES_COST.detailsBasic;

export type Coordinate = { lat: number; lng: number };

/** Free: name → Google place ID, biased to a circle around the destination. */
export async function resolvePlaceId(
  query: string,
  near: Coordinate | null,
  usage: PlacesUsage,
  { timeoutMs = 2500, radiusM = 30_000 }: { timeoutMs?: number; radiusM?: number } = {},
): Promise<string | null> {
  if (!KEY) return null;
  usage.idSearches++;
  try {
    const res = await fetch(`${API}/places:searchText`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "places.id" },
      body:    JSON.stringify({
        textQuery: query,
        pageSize:  1,
        ...(near
          ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: Math.min(radiusM, 50_000) } } }
          : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.places?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export type PlaceDetails = {
  placeId:          string;
  location?:        Coordinate;
  rating?:          number;
  userRatingsTotal?: number;
  priceLevel?:      number;   // 0–4, same scale as the legacy API
  weeklyHours:      string[]; // Monday first: "Monday: 9:00 AM – 5:00 PM"
  googleMapsUri?:   string;
  photoName?:       string;   // "places/…/photos/…" — expires; render via /api/photo
  photoAuthorName?: string;
  photoAuthorUri?:  string;
};

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const FULL_FIELDS  = "id,location,photos,rating,userRatingCount,priceLevel,regularOpeningHours,googleMapsUri";
const BASIC_FIELDS = "id,location,photos"; // Essentials — no rating/hours/Maps link

/** Paid: place details by ID. `basic` skips rating/price/hours for 75% less. */
export async function getPlaceDetails(
  placeId: string,
  level: "full" | "basic",
  usage: PlacesUsage,
  { timeoutMs = 2500 }: { timeoutMs?: number } = {},
): Promise<PlaceDetails | null> {
  if (!KEY) return null;
  if (level === "full") usage.detailsFull++; else usage.detailsBasic++;
  try {
    const res = await fetch(`${API}/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": level === "full" ? FULL_FIELDS : BASIC_FIELDS },
      signal:  AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const p = await res.json();
    const photo  = p?.photos?.[0];
    const author = photo?.authorAttributions?.[0];
    return {
      placeId:          p.id ?? placeId,
      location:         p.location ? { lat: p.location.latitude, lng: p.location.longitude } : undefined,
      rating:           p.rating,
      userRatingsTotal: p.userRatingCount,
      priceLevel:       p.priceLevel ? PRICE_LEVELS[p.priceLevel] : undefined,
      weeklyHours:      Array.isArray(p.regularOpeningHours?.weekdayDescriptions) ? p.regularOpeningHours.weekdayDescriptions : [],
      googleMapsUri:    p.googleMapsUri,
      photoName:        photo?.name,
      photoAuthorName:  author?.displayName,
      photoAuthorUri:   author?.uri,
    };
  } catch {
    return null;
  }
}

/** New-API photo names look like "places/{placeId}/photos/{ref}". */
export const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export function photoMediaUrl(photoName: string, maxWidthPx = 800): string {
  return `${API}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${KEY}`;
}

/** Great-circle distance in km. */
export function distanceKm(a: Coordinate, b: Coordinate): number {
  const R = 6371, dLat = (b.lat - a.lat) * (Math.PI / 180), dLon = (b.lng - a.lng) * (Math.PI / 180);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * (Math.PI / 180)) * Math.cos(b.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
