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
      if (!item.coordinates?.lat || !item.coordinates?.lng) return;
      pts.push({
        type: isMealType(item.type) ? "meal" : "activity",
        label: item.title ?? "",
        day: day.day,
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
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
