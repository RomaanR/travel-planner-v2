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
      // ── Reads and validates the localStorage cache, purging on corruption ──
      function readCache(): CachedTrip[] {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) throw new Error("Cache is not an array");
          return parsed as CachedTrip[];
        } catch {
          // Corrupt or tampered cache — purge so it doesn't persist
          localStorage.removeItem(CACHE_KEY);
          return [];
        }
      }

      // 1. Short-circuit if the browser reports no connectivity
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setTrips(readCache());
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
        setTrips(readCache());
        setIsOffline(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { trips, isOffline, loading };
}
