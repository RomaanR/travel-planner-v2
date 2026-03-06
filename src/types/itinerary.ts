export type ItineraryRequest = {
  destination: string;
  placeId: string;
  lat: number;
  lng: number;
};

export type Activity = {
  title: string;
  description: string;
  duration: string;
};

export type DiningRec = {
  name: string;
  cuisine: string;
  pricePoint: string;
  reservation: boolean;
};

export type DayPlan = {
  day: number;
  theme: string;
  pace: "slow" | "moderate" | "immersive";
  morning: Activity;
  afternoon: Activity;
  evening: Activity;
  hiddenGem: string;
  dining: DiningRec[];
};

export type ItineraryResponse = {
  destination: string;
  editorial: string;
  days: DayPlan[];
};
