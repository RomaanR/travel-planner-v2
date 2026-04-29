"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { ItineraryRequest, ItineraryResponse } from "@/types/itinerary";

// ─── Cache helpers ────────────────────────────────────────────────────────────
// A fingerprint of the fields that determine the AI output. If all match the
// cached request, we restore the cached result instead of calling the API again.

const CACHE_KEY = "seek_wander_itinerary_cache";

function buildFingerprint(data: ItineraryRequest): string {
  return JSON.stringify({
    destination:         data.destination,
    duration:            data.duration,
    departureDate:       data.departureDate,
    returnDate:          data.returnDate,
    travelParty:         data.travelParty,
    pace:                data.pace,
    budgetTier:          data.budgetTier,
    dietary:             [...data.dietary].sort(),
    interests:           [...data.interests].sort(),
    accommodationStatus: data.accommodationStatus,
    hotelName:           data.hotelName ?? null,
    transportMode:       data.transportMode ?? null,
    walkingTolerance:    data.walkingTolerance ?? null,
    planningMode:        data.planningMode ?? "inspire",
    anchorPoints:        data.anchorPoints ?? null,
  });
}

function saveCache(fingerprint: string, result: ItineraryResponse): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fingerprint, result }));
  } catch { /* non-fatal — sessionStorage quota exceeded or disabled */ }
}

function loadCache(fingerprint: string): ItineraryResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { fingerprint: cachedFp, result } = JSON.parse(raw);
    return cachedFp === fingerprint ? (result as ItineraryResponse) : null;
  } catch { return null; }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useItinerary() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Restore a cached itinerary without any API call (used on back-navigation).
  function restoreItinerary(cached: ItineraryResponse): void {
    setItinerary(cached);
    setLoading(false);
    setError(null);
  }

  async function generateItinerary(data: ItineraryRequest) {
    // ── Cache check — skip API call if result already exists for this request ──
    const fingerprint = buildFingerprint(data);
    const cached = loadCache(fingerprint);
    if (cached) {
      restoreItinerary(cached);
      return cached;
    }

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
        // 402 = free tier exhausted — surface upgrade flow instead of generic error
        if (res.status === 402) {
          setPaywalled(true);
          toast.dismiss("curate-task");
          setLoading(false);
          return null;
        }
        throw new Error(err.error || "Failed to generate itinerary");
      }
      const result: ItineraryResponse = await res.json();
      setItinerary(result);

      // Persist result so back-navigation instantly restores it
      saveCache(fingerprint, result);

      toast.success("Itinerary Prepared", {
        id: "curate-task",
        description: "Your bespoke journey is ready for review.",
      });
      return result;
    } catch (e) {
      // Stale request superseded by a new generateItinerary call — leave state alone.
      // The new request owns loading state; touching it here would clobber loading=true.
      if (abortRef.current !== controller) return null;
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
      // Only reset loading if we are still the active request — a superseding
      // request (React 18 Strict Mode double-mount) has its own loading=true.
      if (abortRef.current === controller) setLoading(false);
    }
  }

  return { itinerary, loading, error, paywalled, generateItinerary, abort, restoreItinerary };
}
