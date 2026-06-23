import type {
  DayPlan,
  TimelineItem,
  TimelineItemType,
  MapPoint,
} from "@/types/itinerary";

// ─── Meal type helper ─────────────────────────────────────────────────────────

export function isMealType(type: TimelineItemType): boolean {
  return (
    type === "breakfast" ||
    type === "lunch" ||
    type === "dinner" ||
    type === "snack" ||
    type === "drinks"
  );
}

// ─── Backward-compat normalizer ───────────────────────────────────────────────

/**
 * Converts a legacy DayPlan (morning / afternoon / evening + dining[]) to the
 * new timeline shape. New-format plans (already have timeline[]) are returned
 * unchanged. Safe to call on any DayPlan from DB.
 */
export function normalizeDayPlan(day: DayPlan): DayPlan {
  if (Array.isArray(day.timeline) && day.timeline.length > 0) return day;

  const timeline: TimelineItem[] = [];

  if (day.morning)   timeline.push({ ...day.morning,   type: "activity" });
  if (day.afternoon) timeline.push({ ...day.afternoon, type: "activity" });
  if (day.evening)   timeline.push({ ...day.evening,   type: "activity" });

  // First dining rec → lunch; subsequent → dinner
  (day.dining ?? []).forEach((d, i) => {
    timeline.push({
      type: i === 0 ? "lunch" : "dinner",
      title: d.name,
      description: d.cuisine,
      duration: "",
      startTime: undefined,
      coordinates: d.coordinates,
      cuisine: d.cuisine,
      pricePoint: d.pricePoint,
      reservation: d.reservation,
      dietaryNote: d.dietaryNote,
      photoUrl: d.photoUrl,
      rating: d.rating,
      userRatingsTotal: d.userRatingsTotal,
      openNow: d.openNow,
      hoursOpen: d.hoursOpen,
      transitFromPrevious: d.transitFromPrevious,
    });
  });

  return { ...day, timeline };
}

// ─── Local openNow parser (zero API calls) ────────────────────────────────────

/**
 * Derives openNow locally from a cached hoursOpen string + destination longitude.
 * Uses longitude-based UTC offset (15° = 1 hour) to estimate local time.
 * Accuracy: ±30 min — sufficient for open/closed status on a planning app.
 * Returns undefined if the string format is unrecognised.
 *
 * Handled formats:
 *   "Open 24 hours"       → true
 *   "Closed"              → false
 *   "9:00 AM – 9:00 PM"  → compare against estimated local time
 *   "6:00 PM – 2:00 AM"  → overnight span (closeMins < openMins)
 */
export function parseOpenNow(hoursOpen: string, lng: number): boolean | undefined {
  if (!hoursOpen) return undefined;
  const h = hoursOpen.trim();

  if (h === "Open 24 hours") return true;
  if (h === "Closed")        return false;

  // Estimate destination local time from longitude
  const utcOffsetMs = Math.round(lng / 15) * 3600 * 1000;
  const now         = new Date();
  const utcMs       = now.getTime() + now.getTimezoneOffset() * 60_000;
  const localTime   = new Date(utcMs + utcOffsetMs);
  const currentMins = localTime.getHours() * 60 + localTime.getMinutes();

  // Match "9:00 AM – 9:00 PM" (en-dash or hyphen)
  const match = h.match(
    /^(\d{1,2}:\d{2}\s*[AP]M)\s*[–\-]\s*(\d{1,2}:\d{2}\s*[AP]M)$/i
  );
  if (!match) return undefined;

  const toMins = (t: string): number => {
    const [time, period] = t.trim().split(/\s+/);
    const [hh, mm] = time.split(":").map(Number);
    let m = (hh % 12) * 60 + mm;
    if (period.toUpperCase() === "PM") m += 720;
    return m;
  };

  const openMins  = toMins(match[1]);
  const closeMins = toMins(match[2]);

  // Overnight span: closeMins < openMins (e.g. 6:00 PM – 2:00 AM)
  if (closeMins < openMins) {
    return currentMins >= openMins || currentMins < closeMins;
  }
  return currentMins >= openMins && currentMins < closeMins;
}

// ─── Map point computation ────────────────────────────────────────────────────

/**
 * Converts itinerary days to MapPoint[] used by ItineraryMap.
 * Called server-side in trips/[id] and shared/[id];
 * called client-side via useMemo in itinerary/page.tsx.
 */
export function computeMapPoints(days: DayPlan[]): MapPoint[] {
  return (days ?? []).flatMap((rawDay) => {
    const day = normalizeDayPlan(rawDay);
    const pts: MapPoint[] = [];

    (day.timeline ?? []).forEach((item) => {
      if (item.coordinates?.lat == null || item.coordinates?.lng == null) return;
      pts.push({
        type:     isMealType(item.type) ? "meal" : "activity",
        itemType: item.type,
        label:    item.title ?? "",
        day:      day.day,
        lat:      item.coordinates.lat,
        lng:      item.coordinates.lng,
      });
    });

    if (day.hiddenGemCoordinates?.lat && day.hiddenGemCoordinates?.lng) {
      pts.push({
        type: "gem",
        label: day.hiddenGem?.split("—")?.[0]?.trim() ?? "",
        day: day.day,
        lat: day.hiddenGemCoordinates.lat,
        lng: day.hiddenGemCoordinates.lng,
      });
    }

    return pts;
  });
}
