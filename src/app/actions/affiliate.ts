"use server";

const HOTELLOOK_BASE_URL = "https://search.hotellook.com/hotels";

export async function generateBookingLink(
  hotelName: string,
  city: string
): Promise<string> {
  const marker = process.env.TRAVELPAYOUTS_MARKER?.trim();
  const query = `${hotelName.trim()} ${city.trim()}`.trim();
  const encodedQuery = encodeURIComponent(query);

  if (!marker) {
    return `${HOTELLOOK_BASE_URL}?destination=${encodedQuery}`;
  }

  return `${HOTELLOOK_BASE_URL}?destination=${encodedQuery}&marker=${encodeURIComponent(marker)}`;
}
