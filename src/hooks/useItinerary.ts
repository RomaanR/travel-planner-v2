"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { ItineraryRequest, ItineraryResponse } from "@/types/itinerary";

export function useItinerary() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  async function generateItinerary(data: ItineraryRequest) {
    // Cancel any in-flight request
    abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    toast.loading("Consulting the concierge\u2026", { id: "curate-task" });
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate itinerary");
      }
      const result: ItineraryResponse = await res.json();
      setItinerary(result);
      toast.success("Itinerary Prepared", {
        id: "curate-task",
        description: "Your bespoke journey is ready for review.",
      });
      return result;
    } catch (e) {
      // User navigated away or manually cancelled — silent dismiss
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.dismiss("curate-task");
        setLoading(false);
        return null;
      }
      setError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Concierge Busy", {
        id: "curate-task",
        description: "Our desk is at capacity. Please try again in a moment.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { itinerary, loading, error, generateItinerary, abort };
}
