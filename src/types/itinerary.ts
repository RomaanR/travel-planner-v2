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

export type Activity = {
  title: string;
  description: string;
  duration: string;     // e.g. "2 hours"
  startTime: string;    // e.g. "09:00" — AI-provided
  category: string;     // e.g. "SIGHTSEEING", "MUSEUM", "WELLNESS"
  coordinates: Coordinate;
  // Enriched by Google Places after AI generation:
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;   // e.g. "9:00 AM – 9:00 PM" (today's hours)
  priceLevel?: number;  // Google price_level 0–4
  transitFromPrevious?: TransitInfo;
};

export type DiningRec = {
  name: string;
  cuisine: string;
  pricePoint: string;
  reservation: boolean;
  coordinates: Coordinate;
  dietaryNote?: string;
  // Enriched:
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;   // e.g. "9:00 AM – 9:00 PM" (today's hours)
  transitFromPrevious?: TransitInfo;
};

export type DayPlan = {
  day: number;
  theme: string;
  pace: Pace;
  morning: Activity;
  afternoon: Activity;
  evening: Activity;
  hiddenGem: string;
  hiddenGemCoordinates: Coordinate;
  dining: DiningRec[];
};

export type ItineraryResponse = {
  destination: string;
  editorial: string;
  days: DayPlan[];
};

// ─── Map ──────────────────────────────────────────────────────────────────────

export type MapPointType =
  | "morning"
  | "afternoon"
  | "evening"
  | "dining"
  | "gem";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  type: MapPointType;
  day: number;
};
