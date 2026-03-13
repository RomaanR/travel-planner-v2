"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  BookmarkPlus,
  AlertCircle,
  Check,
} from "lucide-react";
import { SignedIn } from "@clerk/nextjs";
import { saveTripToDb } from "@/app/actions/saveTrip";
import { useItinerary } from "@/hooks/useItinerary";
import type { ItineraryRequest, MapPoint } from "@/types/itinerary";
import Navbar from "@/components/Navbar";
import ItineraryMap from "@/components/ItineraryMap";
import ItineraryViewer from "@/components/ItineraryViewer";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const router = useRouter();
  const { itinerary, loading, error, generateItinerary } = useItinerary();
  const [destination, setDestination] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 35.6762, lng: 139.6503 });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    if (!itinerary || saveState !== "idle") return;
    setSaveState("saving");
    try {
      await saveTripToDb(itinerary.destination, itinerary.days.length, itinerary);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("itineraryRequest");
    if (!stored) { router.push("/"); return; }
    const data: ItineraryRequest = JSON.parse(stored);
    setDestination(data.destination);
    setMapCenter({ lat: data.lat, lng: data.lng });
    generateItinerary(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!itinerary) return [];
    return itinerary.days.flatMap((day) => {
      const pts: MapPoint[] = [
        { type: "morning",   label: day.morning?.title ?? "",   day: day.day, ...(day.morning?.coordinates ?? { lat: 0, lng: 0 }) },
        { type: "afternoon", label: day.afternoon?.title ?? "", day: day.day, ...(day.afternoon?.coordinates ?? { lat: 0, lng: 0 }) },
        { type: "evening",   label: day.evening?.title ?? "",   day: day.day, ...(day.evening?.coordinates ?? { lat: 0, lng: 0 }) },
        { type: "gem",       label: day.hiddenGem?.split("—")?.[0]?.trim() ?? "", day: day.day, ...(day.hiddenGemCoordinates ?? { lat: 0, lng: 0 }) },
        ...(day.dining ?? []).map((d) => ({
          type: "dining" as const,
          label: d.name,
          day: day.day,
          ...(d.coordinates ?? { lat: 0, lng: 0 }),
        })),
      ];
      return pts.filter((p) => p.lat && p.lng);
    });
  }, [itinerary]);

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      <Navbar />

      {/* Header strip */}
      <div className="shrink-0 pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 micro-copy text-ink-light hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={13} />
          New Destination
        </button>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="micro-copy text-ink-light mb-1">Bespoke Itinerary</p>
            <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
              {destination || "Loading\u2026"}
            </h1>
          </div>
          {itinerary && (
            <SignedIn>
              <button
                onClick={handleSave}
                disabled={saveState === "saving" || saveState === "saved"}
                className="hidden md:flex items-center gap-2 micro-copy border border-ink/20 px-4 py-2.5 hover:bg-ink hover:text-paper transition-all disabled:opacity-50 disabled:cursor-default"
              >
                {saveState === "saved" ? <Check size={13} /> : <BookmarkPlus size={13} />}
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save"}
              </button>
            </SignedIn>
          )}
        </motion.div>
      </div>

      {/* Split-screen */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Scrollable timeline */}
        <div className="w-full md:w-[55%] overflow-y-auto">

          {/* Mobile map banner */}
          <div className="md:hidden h-52 w-full border-b border-ink/5">
            <ItineraryMap center={mapCenter} points={mapPoints} />
          </div>

          <div className="px-6 md:px-10 py-8">

            {/* Loading */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-5"
              >
                <Loader2 size={28} className="animate-spin text-burnt-orange" strokeWidth={1} />
                <p className="font-serif italic text-3xl text-ink">
                  Curating your journey&hellip;
                </p>
                <p className="micro-copy text-ink-light">
                  Sourcing locations, photos, ratings and transit times
                </p>
              </motion.div>
            )}

            {/* Error */}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-burnt-orange/20 bg-burnt-orange/5 px-6 py-6"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-burnt-orange shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-serif italic text-2xl text-ink mb-1">
                      Something went wrong
                    </p>
                    <p className="micro-copy text-ink-light mb-4">{error}</p>
                    <button
                      onClick={() => router.push("/")}
                      className="micro-copy border border-ink/20 px-5 py-2.5 hover:bg-ink hover:text-paper transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Itinerary — delegates all display to ItineraryViewer */}
            {itinerary && !loading && (
              <ItineraryViewer
                itinerary={itinerary}
                bottomSection={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-14 border-t border-ink/5 pt-10 text-center pb-10"
                  >
                    {/* Save to My Trips — signed-in users only */}
                    <SignedIn>
                      <div className="mb-10">
                        <p className="micro-copy text-ink-light mb-4">Curated for you</p>
                        <button
                          onClick={handleSave}
                          disabled={saveState === "saving" || saveState === "saved"}
                          className={`micro-copy inline-flex items-center gap-2 px-8 py-4 border transition-all ${
                            saveState === "saved"
                              ? "border-emerald-accent text-emerald-accent cursor-default"
                              : saveState === "saving"
                              ? "border-ink/20 text-ink-light cursor-wait"
                              : saveState === "error"
                              ? "border-burnt-orange text-burnt-orange hover:bg-burnt-orange hover:text-white"
                              : "border-ink/20 text-ink hover:bg-ink hover:text-paper"
                          }`}
                        >
                          {saveState === "saving" && <Loader2 size={13} className="animate-spin" />}
                          {saveState === "saved"   && <Check size={13} />}
                          {saveState === "error"   && <AlertCircle size={13} />}
                          {saveState === "idle"    && <BookmarkPlus size={13} />}
                          {saveState === "saving"
                            ? "SAVING..."
                            : saveState === "saved"
                            ? "SAVED TO MY TRIPS"
                            : saveState === "error"
                            ? "SAVE FAILED — TRY AGAIN"
                            : "SAVE TO MY TRIPS"}
                        </button>
                      </div>
                      <div className="w-8 h-px bg-ink/10 mx-auto mb-10" />
                    </SignedIn>

                    {/* New destination CTA — always visible */}
                    <p className="font-serif italic text-3xl text-ink mb-4">
                      Explore another destination?
                    </p>
                    <button
                      onClick={() => router.push("/")}
                      className="micro-copy bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors"
                    >
                      Curate a New Journey
                    </button>
                  </motion.div>
                }
              />
            )}

          </div>
        </div>

        {/* RIGHT: Sticky map */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
