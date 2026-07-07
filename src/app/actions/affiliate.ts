"use server";

const HOTELLOOK_BASE_URL = "https://search.hotellook.com/hotels";
const PLACES_API_KEY = process.env.MAPS_SERVER_KEY ?? "";

// Resolves the AI's free-text hotel name against Google Places so the downstream
// Booking.com `ss=` search gets the real, canonically-formatted name + address
// instead of whatever the model wrote — this is what the search box fuzzy-matches
// against, so precision here directly determines whether the click lands on the
// right property. Falls back to the raw name/city on any failure.
async function resolveHotelQuery(hotelName: string, city: string): Promise<string> {
  const fallback = `${hotelName} ${city}`;
  if (!PLACES_API_KEY) return fallback;

  try {
    const searchUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(`${hotelName} ${city}`)}` +
      `&inputtype=textquery` +
      `&fields=name,formatted_address` +
      `&key=${PLACES_API_KEY}`;

    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return fallback;

    const candidate = (await res.json())?.candidates?.[0];
    if (!candidate?.name) return fallback;

    return candidate.formatted_address
      ? `${candidate.name}, ${candidate.formatted_address}`
      : `${candidate.name} ${city}`;
  } catch {
    return fallback;
  }
}

export async function generateBookingLink(
  hotelName: string,
  city: string,
  checkIn?: string,
  checkOut?: string
): Promise<string> {
  const marker = process.env.TRAVELPAYOUTS_MARKER?.trim();
  const query = await resolveHotelQuery(hotelName.trim(), city.trim());

  const params = new URLSearchParams({ destination: query });
  // The Travelpayouts redirect only forwards checkIn/checkOut to Booking.com
  // when `adults` is also present — without it, dates are silently dropped
  // partway through the redirect chain (verified by tracing the live redirects).
  if (checkIn && checkOut) {
    params.set("checkIn", checkIn);
    params.set("checkOut", checkOut);
    params.set("adults", "2");
  }
  if (marker) params.set("marker", marker);

  return `${HOTELLOOK_BASE_URL}?${params.toString()}`;
}
