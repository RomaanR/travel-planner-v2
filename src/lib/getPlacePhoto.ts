const API_KEY = process.env.MAPS_SERVER_KEY ?? "";

/**
 * Representative destination photo, served through our /api/photo proxy.
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

    const path = `/api/photo?ref=${encodeURIComponent(ref)}`;
    if (!absolute) return path;

    const base = process.env.NEXT_PUBLIC_APP_URL;
    return base ? `${base.replace(/\/$/, "")}${path}` : null;
  } catch {
    return null;
  }
}
