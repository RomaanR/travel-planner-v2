import { emptyPlacesUsage, resolvePlaceId } from "@/lib/places";

const API_KEY = process.env.MAPS_SERVER_KEY ?? "";

/**
 * Representative destination photo, served through our /api/photo proxy.
 *
 * Places API (New): an IDs-only Text Search (free) resolves the destination,
 * then Place Details with only the `photos` field (Essentials IDs-only tier)
 * returns the photo name. Only the photo itself is billed when viewed.
 *
 * Returns a same-origin path ("/api/photo?ref=…") — never a Google URL — so
 * MAPS_SERVER_KEY stays on the server. Pass `absolute: true` for Open Graph
 * tags, which need a full URL. Returns null on any error or when no photo exists.
 */
export async function getDestinationPhotoUrl(
  destination: string,
  { absolute = false }: { absolute?: boolean } = {},
): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const placeId = await resolvePlaceId(destination, null, emptyPlacesUsage(), { timeoutMs: 4000 });
    if (!placeId) return null;

    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "photos" },
      signal:  AbortSignal.timeout(4000),
      next:    { revalidate: 86400 }, // 24 h — photo names expire, so don't hold them longer
    });
    if (!res.ok) return null;

    const photoName: string | undefined = (await res.json())?.photos?.[0]?.name;
    if (!photoName) return null;

    const path = `/api/photo?ref=${encodeURIComponent(photoName)}`;
    if (!absolute) return path;

    const base = process.env.NEXT_PUBLIC_APP_URL;
    return base ? `${base.replace(/\/$/, "")}${path}` : null;
  } catch {
    return null;
  }
}
