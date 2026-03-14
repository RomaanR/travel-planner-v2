// ─── Request ──────────────────────────────────────────────────────────────────

export type TravelParty = "solo" | "couple" | "family" | "group";
export type Pace = "relaxed" | "moderate" | "packed";
export type BudgetTier = "premium" | "luxury" | "ultra-luxury";
export type DietaryOption =
  | "none"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "gluten-free"
  | "dairy-free";
export type Interest =
  | "sightseeing"
  | "museums-art"
  | "food-dining"
  | "nature-parks"
  | "shopping"
  | "nightlife"
  | "culture-history"
  | "adventure-sports"
  | "relaxation-wellness"
  | "photography";

export type ItineraryRequest = {
  destination: string;
  placeId: string;
  lat: number;
  lng: number;
  departureDate: string; // ISO "YYYY-MM-DD"
  returnDate: string;    // ISO "YYYY-MM-DD"
  duration: number;      // computed from date diff, clamped 1–5
  travelParty: TravelParty;
  pace: Pace;
  budgetTier: BudgetTier;
  dietary: DietaryOption[];
  interests: Interest[]; // no max cap
};

// ─── Response ─────────────────────────────────────────────────────────────────

export type Coordinate = { lat: number; lng: number };

export type TransitInfo = {
  walkingMinutes?: number;
  drivingMinutes?: number;
};

// ─── Timeline (new canonical shape) ──────────────────────────────────────────

export type TimelineItemType =
  | "activity"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "drinks";

/** Unified card type — replaces separate Activity + DiningRec for new itineraries */
export type TimelineItem = {
  type: TimelineItemType;
  title: string;           // activity name OR restaurant name
  description: string;     // 2 sentences for activities; cuisine for meals
  duration: string;        // e.g. "2 hours"; empty string for meals
  startTime?: string;      // HH:MM — AI-provided
  category?: string;       // SIGHTSEEING etc — activities only
  coordinates: Coordinate;
  // Meal-specific fields
  cuisine?: string;
  pricePoint?: string;     // $$ | $$$ | $$$$
  reservation?: boolean;
  dietaryNote?: string;
  // Google Places enriched fields (same as legacy Activity / DiningRec)
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;      // e.g. "9:00 AM – 9:00 PM" (today's hours)
  priceLevel?: number;     // Google price_level 0–4
  transitFromPrevious?: TransitInfo;
};

// ─── Legacy types (kept for backward-compat with existing DB records) ─────────

export type Activity = {
  title: string;
  description: string;
  duration: string;
  startTime: string;
  category: string;
  coordinates: Coordinate;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
  transitFromPrevious?: TransitInfo;
};

export type DiningRec = {
  name: string;
  cuisine: string;
  pricePoint: string;
  reservation: boolean;
  coordinates: Coordinate;
  dietaryNote?: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  transitFromPrevious?: TransitInfo;
};

// ─── Day Plan ─────────────────────────────────────────────────────────────────

export type DayPlan = {
  day: number;
  theme: string;
  pace: Pace;
  timeline: TimelineItem[];            // NEW canonical field
  hiddenGem: string;
  hiddenGemCoordinates: Coordinate;
  // Legacy fields — present in DB records saved before the timeline refactor
  morning?: Activity;
  afternoon?: Activity;
  evening?: Activity;
  dining?: DiningRec[];
};

export type ItineraryResponse = {
  destination: string;
  editorial: string;
  days: DayPlan[];
};

// ─── Map ──────────────────────────────────────────────────────────────────────

export type MapPointType = "activity" | "meal" | "gem";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  type: MapPointType;
  day: number;
};
