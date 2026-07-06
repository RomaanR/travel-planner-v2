"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  DayPlan,
  ItineraryRequest,
  ItineraryResponse,
  RecommendedStay,
} from "@/types/itinerary";

const CACHE_KEY = "seek_wander_itinerary_cache";

function buildFingerprint(data: ItineraryRequest): string {
  return JSON.stringify({
    destination: data.destination,
    duration: data.duration,
    departureDate: data.departureDate,
    returnDate: data.returnDate,
    travelParty: data.travelParty,
    pace: data.pace,
    budgetTier: data.budgetTier,
    dietary: [...data.dietary].sort(),
    interests: [...data.interests].sort(),
    accommodationStatus: data.accommodationStatus,
    hotelName: data.hotelName ?? null,
    exactHotelAddress: data.exactHotelAddress ?? null,
    transportMode: data.transportMode ?? null,
    walkingTolerance: data.walkingTolerance ?? null,
    isRegion: data.isRegion ?? false,
    planningMode: data.planningMode ?? "inspire",
    anchorPoints: data.anchorPoints ?? null,
  });
}

function saveCache(fingerprint: string, result: ItineraryResponse): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fingerprint, result }));
  } catch {
    // Cache failure must never block itinerary generation.
  }
}

function loadCache(fingerprint: string): ItineraryResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const { fingerprint: cachedFingerprint, result } = JSON.parse(raw);
    if (cachedFingerprint !== fingerprint) return null;

    if (!result?.destination || !Array.isArray(result?.days) || result.days.length === 0) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return result as ItineraryResponse;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export type StreamMeta = {
  editorial: string;
  recommendedStays?: RecommendedStay[];
};

export type StreamProgress = {
  totalDays: number;
  completedDays: number;
  enrichingDay?: number;
};

function upsertDay(days: DayPlan[], nextDay: DayPlan): DayPlan[] {
  const byDay = new Map(days.map((day) => [day.day, day]));
  byDay.set(nextDay.day, nextDay);
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

function mergeFallbackDays(streamed: DayPlan[], fallback: DayPlan[]): DayPlan[] {
  const byDay = new Map(fallback.map((day) => [day.day, day]));

  // Streamed days have already been enriched, so they take precedence.
  for (const day of streamed) byDay.set(day.day, day);

  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

export function useStreamingItinerary() {
  const [days, setDays] = useState<DayPlan[]>([]);
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [destination, setDestination] = useState("");
  const [progress, setProgress] = useState<StreamProgress>({
    totalDays: 0,
    completedDays: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const pendingRetryRef = useRef<ItineraryRequest | null>(null);
  const daysRef = useRef<DayPlan[]>([]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRetryRef.current = null;
  }, []);

  const restoreItinerary = useCallback((cached: ItineraryResponse): void => {
    const cachedDays = cached.days ?? [];
    daysRef.current = cachedDays;
    setDays(cachedDays);
    setDestination(cached.destination ?? "");
    setMeta({
      editorial: cached.editorial ?? "",
      recommendedStays: cached.recommendedStays,
    });
    setProgress({
      totalDays: cachedDays.length,
      completedDays: cachedDays.length,
    });
    setStreamComplete(true);
    setLoading(false);
    setError(null);
  }, []);

  const generateItinerary = useCallback(async (
    data: ItineraryRequest
  ): Promise<ItineraryResponse | null> => {
    const fingerprint = buildFingerprint(data);
    const cached = loadCache(fingerprint);
    if (cached) {
      restoreItinerary(cached);
      return cached;
    }

    abort();
    const controller = new AbortController();
    abortRef.current = controller;

    daysRef.current = [];
    setDays([]);
    setMeta(null);
    setDestination(data.destination);
    setProgress({ totalDays: data.duration, completedDays: 0 });
    setStreamComplete(false);
    setLoading(true);
    setError(null);
    setPaywalled(false);
    setSignInRequired(false);

    toast.loading("Consulting the concierge…", {
      id: "curate-task",
      description: undefined,
    });

    try {
      const response = await fetch("/api/itinerary-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const responseError = await response.json().catch(() => ({
          error: "The itinerary stream could not be opened.",
        }));

        if (response.status === 402 || response.status === 403) {
          pendingRetryRef.current = null;
          setPaywalled(true);
          setLoading(false);
          toast.dismiss("curate-task");
          return null;
        }

        if (response.status === 401) {
          pendingRetryRef.current = null;
          setSignInRequired(true);
          setLoading(false);
          toast.dismiss("curate-task");
          return null;
        }

        throw new Error(
          responseError.error || responseError.message || `HTTP ${response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      let receivedDone = false;
      let completedResult: ItineraryResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = leftover + decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        leftover = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }

          switch (event.type) {
            case "start":
              setProgress({
                totalDays: Number(event.totalDays) || data.duration,
                completedDays: daysRef.current.length,
              });
              break;

            case "enriching":
              setProgress((current) => ({
                ...current,
                enrichingDay: Number(event.day) || undefined,
              }));
              break;

            case "day": {
              const nextDay = event.day as DayPlan;
              const nextDays = upsertDay(daysRef.current, nextDay);
              daysRef.current = nextDays;
              setDays(nextDays);

              if (typeof event.editorial === "string") {
                setMeta((current) => ({
                  editorial: event.editorial as string,
                  recommendedStays: current?.recommendedStays,
                }));
              }

              setProgress({
                totalDays: Number(event.totalDays) || data.duration,
                completedDays: nextDays.length,
              });
              break;
            }

            case "done": {
              receivedDone = true;

              if (Array.isArray(event.fallbackDays) && event.fallbackDays.length > 0) {
                const mergedDays = mergeFallbackDays(
                  daysRef.current,
                  event.fallbackDays as DayPlan[]
                );
                daysRef.current = mergedDays;
                setDays(mergedDays);
              }

              const streamMeta: StreamMeta = {
                editorial: typeof event.editorial === "string" ? event.editorial : "",
                recommendedStays: event.recommendedStays as RecommendedStay[] | undefined,
              };

              setMeta(streamMeta);
              setProgress({
                totalDays: Number(event.totalDays) || data.duration,
                completedDays: daysRef.current.length,
              });
              setStreamComplete(true);
              setLoading(false);
              pendingRetryRef.current = null;

              if (daysRef.current.length > 0) {
                completedResult = {
                  destination: data.destination,
                  editorial: streamMeta.editorial,
                  days: daysRef.current,
                  recommendedStays: streamMeta.recommendedStays,
                };
                saveCache(fingerprint, completedResult);
              }

              toast.success("Itinerary Prepared", {
                id: "curate-task",
                description: "Your bespoke journey is ready for review.",
              });
              break;
            }

            case "error":
              throw new Error(
                typeof event.message === "string" ? event.message : "Stream error"
              );
          }
        }
      }

      if (!receivedDone) {
        throw new Error("The itinerary stream ended before completion.");
      }

      return completedResult;
    } catch (caughtError) {
      if (abortRef.current !== controller) return null;

      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        toast.dismiss("curate-task");
        setLoading(false);
        return null;
      }

      const isIosBackgroundKill =
        caughtError instanceof TypeError &&
        (
          caughtError.message === "Load failed" ||
          caughtError.message === "Failed to fetch" ||
          caughtError.message === "NetworkError when attempting to fetch resource."
        );

      if (isIosBackgroundKill && document.visibilityState === "hidden") {
        pendingRetryRef.current = data;
        return null;
      }

      pendingRetryRef.current = null;
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown error"
      );
      toast.error("Concierge Busy", {
        id: "curate-task",
        description: "Our desk is at capacity. Please try again in a moment.",
      });
      return null;
    } finally {
      if (abortRef.current === controller && !pendingRetryRef.current) {
        setLoading(false);
      }
    }
  }, [abort, restoreItinerary]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && pendingRetryRef.current) {
        const retryData = pendingRetryRef.current;
        pendingRetryRef.current = null;
        void generateItinerary(retryData);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [generateItinerary]);

  const itinerary = useMemo<ItineraryResponse | null>(() => {
    if (days.length === 0) return null;

    return {
      destination,
      editorial: meta?.editorial ?? "",
      days,
      recommendedStays: meta?.recommendedStays,
    };
  }, [days, destination, meta]);

  return {
    itinerary,
    days,
    meta,
    progress,
    loading,
    streamComplete,
    error,
    paywalled,
    signInRequired,
    generateItinerary,
    abort,
    restoreItinerary,
  };
}
