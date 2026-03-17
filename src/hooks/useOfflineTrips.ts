"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CachedTrip = {
  id:            string;
  destination:   string;
  days:          number;
  createdAt:     string;  // ISO string
  photoUrl:      string | null;
  itineraryData: {
    editorial?: string;
    days?: { theme?: string }[];
  } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_KEY = "seek_wander_archive";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineTrips() {
  const [trips,     setTrips]     = useState<CachedTrip[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Short-circuit if the browser reports no connectivity
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const raw = localStorage.getItem(CACHE_KEY);
        setTrips(raw ? (JSON.parse(raw) as CachedTrip[]) : []);
        setIsOffline(true);
        setLoading(false);
        return;
      }

      try {
        // 2. Attempt live fetch
        const res = await fetch("/api/trips");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { trips: fresh } = (await res.json()) as { trips: CachedTrip[] };

        // 3. Persist to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        setTrips(fresh);
        setIsOffline(false);
      } catch {
        // 4. Fall back to last-known cache
        const raw = localStorage.getItem(CACHE_KEY);
        setTrips(raw ? (JSON.parse(raw) as CachedTrip[]) : []);
        setIsOffline(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { trips, isOffline, loading };
}
