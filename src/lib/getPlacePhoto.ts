const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Fetches a representative destination photo URL from the Google Places API.
 * Uses findplacefromtext → photos[0].photo_reference → Places Photo URL.
 * Returns null on any error or if no photos are available.
 */
export async function getDestinationPhotoUrl(
  destination: string
): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const searchUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(destination)}` +
      `&inputtype=textquery` +
      `&fields=photos` +
      `&key=${API_KEY}`;

    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 }, // cache for 24 h — destination photos don't change
    });

    if (!res.ok) return null;

    const json = await res.json();
    const ref: string | undefined =
      json?.candidates?.[0]?.photos?.[0]?.photo_reference;

    if (!ref) return null;

    return (
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=800` +
      `&photo_reference=${ref}` +
      `&key=${API_KEY}`
    );
  } catch {
    return null;
  }
}
