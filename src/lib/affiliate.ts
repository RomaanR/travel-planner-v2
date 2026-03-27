/**
 * Builds a Booking.com affiliate search URL for a given hotel + destination.
 * AID 4013143 — TravalBee affiliate account.
 */
export function createAffiliateUrl(hotelName: string, destination: string): string {
  const query = encodeURIComponent(`${hotelName} ${destination}`);
  return `https://www.booking.com/searchresults.html?ss=${query}&aid=4013143`;
}
