"use client";

import { useState } from "react";
import type { ItineraryRequest, ItineraryResponse } from "@/types/itinerary";

export function useItinerary() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateItinerary(data: ItineraryRequest) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate itinerary");
      }
      const result: ItineraryResponse = await res.json();
      setItinerary(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { itinerary, loading, error, generateItinerary };
}
