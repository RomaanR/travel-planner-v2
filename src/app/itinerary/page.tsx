"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Loader2,
  ArrowLeft,
  BookmarkPlus,
  AlertCircle,
  Check,
  Sparkles,
  SlidersHorizontal,
  LogIn,
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { saveTripToDb } from "@/app/actions/saveTrip";
import { cacheNewTrip } from "@/hooks/useOfflineTrips";
import { useStreamingItinerary } from "@/hooks/useStreamingItinerary";
import ExportPdfButton from "@/components/ExportPdfButton";
import RefinePanel from "@/components/RefinePanel";
import type { ItineraryRequest, MapPoint } from "@/types/itinerary";

// ─── sessionStorage re-validation schema ──────────────────────────────────────
// Guards against tampered or malformed data injected by browser extensions.
// Mirrors the server-side ItinerarySchema in api/itinerary/route.ts.

const StoredRequestSchema = z.object({
  destination:         z.string().min(1).max(100),
  placeId:             z.string().min(1).max(300),
  lat:                 z.number().finite(),
  lng:                 z.number().finite(),
  departureDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration:            z.number().int().min(1).max(14), // 14 = premium max; server enforces tier-specific limit
  travelParty:         z.enum(["solo", "couple", "family", "group"]),
  pace:                z.enum(["relaxed", "moderate", "packed"]),
  budgetTier:          z.enum(["premium", "luxury", "ultra-luxury"]),
  dietary:             z.array(z.string()).max(7),
  interests:           z.array(z.string()).max(10),
  accommodationStatus: z.enum(["needed", "booked"]).optional(),
  hotelName:           z.string().max(200).optional(),
  exactHotelAddress:   z.string().max(300).optional(),
  transportMode:       z.enum(["walking-transit", "car-driver"]).optional(),
  walkingTolerance:    z.enum(["strict", "relaxed"]).optional(),
  isRegion:            z.boolean().optional(),
  planningMode:        z.enum(["inspire", "tailor"]).optional(),
  anchorPoints:        z.string().max(2000).optional(),
});
import { computeMapPoints } from "@/lib/itineraryUtils";
import Navbar from "@/components/Navbar";
import ItineraryMap from "@/components/ItineraryMap";
import MobileMapBanner from "@/components/MobileMapBanner";
import ItineraryViewer from "@/components/ItineraryViewer";
import GenerationLoader from "@/components/GenerationLoader";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const {
    itinerary,
    loading,
    streamComplete,
    progress,
    error,
    paywalled,
    signInRequired,
    generateItinerary,
    abort,
  } = useStreamingItinerary();

  const [destination, setDestination] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 35.6762, lng: 139.6503 });
  const [transportMode, setTransportMode] = useState<"walking-transit" | "car-driver">("walking-transit");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [planningMode, setPlanningMode] = useState<"inspire" | "tailor">("inspire");
  const [refineOpen, setRefineOpen]       = useState(false);
  const [storedRequest, setStoredRequest] = useState<ItineraryRequest | null>(null);

  async function handleSave() {
    if (!itinerary || !streamComplete || saveState !== "idle") return;
    setSaveState("saving");
    try {
      const saved = await saveTripToDb(itinerary.destination, itinerary.days.length, itinerary);
      setSaveState("saved");
      // Write to user-scoped cache immediately so /trips shows the trip
      // without waiting for the next /api/trips fetch (critical on mobile).
      if (userId) {
        cacheNewTrip(userId, {
          id:            saved.id,
          destination:   saved.destination,
          days:          saved.days,
          createdAt:     saved.createdAt.toISOString(),
          photoUrl:      null,
          itineraryData: itinerary as { editorial?: string; days?: { theme?: string }[] },
        });
      }
      toast.success("Passport Updated", {
        description: "This journey has been saved to your archive.",
      });
    } catch {
      setSaveState("error");
      toast.error("Save Failed", {
        description: "Unable to save this journey. Please try again.",
      });
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const handleRefine = useCallback(async (updated: ItineraryRequest) => {
    setRefineOpen(false);

    // Auto-save the current itinerary before regenerating (fire-and-forget — don't block generation)
    if (isSignedIn && itinerary && saveState === "idle") {
      saveTripToDb(itinerary.destination, itinerary.days.length, itinerary)
        .then(() => toast.success("Previous journey archived", {
          description: "Your original itinerary is safe in My Trips.",
        }))
        .catch(() => { /* non-fatal — user can save manually */ });
    }

    // Persist updated params so back-navigation and refreshes stay consistent
    sessionStorage.setItem("itineraryRequest", JSON.stringify(updated));
    setStoredRequest(updated);

    // Reset save state — the new itinerary hasn't been saved yet
    setSaveState("idle");

    // Kick off the new generation
    generateItinerary(updated);
  }, [isSignedIn, itinerary, saveState, generateItinerary]);

  useEffect(() => {
    const stored = sessionStorage.getItem("itineraryRequest");
    if (!stored) { router.push("/"); return; }

    // Re-validate before use — guards against tampered sessionStorage data
    // (e.g. malicious browser extensions injecting arbitrary payloads).
    let raw: unknown;
    try { raw = JSON.parse(stored); } catch { router.push("/"); return; }

    const result = StoredRequestSchema.safeParse(raw);
    if (!result.success) {
      console.warn("[itinerary] sessionStorage data failed validation — redirecting", result.error.flatten());
      router.push("/");
      return;
    }

    const data = result.data as ItineraryRequest;
    setDestination(data.destination);
    setDepartureDate(data.departureDate ?? "");
    setReturnDate(data.returnDate ?? "");
    setMapCenter({ lat: data.lat, lng: data.lng });
    if (data.transportMode === "walking-transit" || data.transportMode === "car-driver") {
      setTransportMode(data.transportMode);
    }
    if (data.planningMode === "tailor") setPlanningMode("tailor");
    setStoredRequest(data);

    // React Strict Mode mounts, cleans up, and mounts effects again in
    // development. Deferring the request lets the test mount cancel before it
    // reaches the API, preventing duplicate Claude generations and quota use.
    const generationTimer = window.setTimeout(() => {
      void generateItinerary(data);
    }, 0);

    // Abort in-flight generation if user navigates away
    return () => {
      window.clearTimeout(generationTimer);
      abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!itinerary) return [];
    return computeMapPoints(itinerary.days);
  }, [itinerary]);

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden print:h-auto print:overflow-visible print:block">
      {/* Navbar — hidden in print (PrintItinerary handles the print header) */}
      <div className="print:hidden">
        <Navbar />
      </div>

      {/* Header strip — hidden in print */}
      <div className="shrink-0 pt-24 md:pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark print:hidden">
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
          {itinerary && streamComplete && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setRefineOpen(true)}
                className="flex items-center gap-2 micro-copy border border-ink/20 px-4 py-2.5 hover:bg-ink hover:text-paper transition-all"
              >
                <SlidersHorizontal size={13} />
                Refine
              </button>
              <SignedIn>
                <ExportPdfButton />
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="flex items-center gap-2 micro-copy border border-ink/20 px-4 py-2.5 hover:bg-ink hover:text-paper transition-all disabled:opacity-50 disabled:cursor-default"
                >
                  {saveState === "saved" ? <Check size={13} /> : <BookmarkPlus size={13} />}
                  {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save"}
                </button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="flex items-center gap-2 micro-copy border border-ink/20 px-4 py-2.5 hover:bg-ink hover:text-paper transition-all">
                    <LogIn size={13} />
                    Sign In to Save or Download
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          )}
        </motion.div>
      </div>

      {/* Split-screen */}
      <div className="flex flex-1 min-h-0 print:block print:overflow-visible">

        {/* LEFT: Scrollable timeline — full width in print */}
        <div className="w-full md:w-[55%] overflow-y-auto overflow-x-clip print:w-full print:overflow-visible print:h-auto">

          {/* Mobile map banner — hidden in print */}
          <MobileMapBanner center={mapCenter} points={mapPoints} />

          <div className="px-6 md:px-10 py-8 w-full min-w-0 print:px-0 print:py-6">

            {/* Loading */}
            {loading && !itinerary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <GenerationLoader mode={planningMode} />
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

            {/* Paywall — free tier exhausted */}
            {paywalled && !loading && !itinerary && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border border-burnt-orange/20 bg-burnt-orange/5 px-8 py-10 text-center"
              >
                <Sparkles size={28} className="text-burnt-orange mx-auto mb-5" strokeWidth={1.5} />
                <p className="micro-copy text-burnt-orange mb-3">Free Itinerary Used</p>
                <h2 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight mb-4">
                  Your journey awaits.<br />Unlock unlimited curation.
                </h2>
                <p className="font-sans text-sm text-ink-light leading-relaxed max-w-sm mx-auto mb-8">
                  You have used your complimentary itinerary. Upgrade to Pro for unlimited bespoke journeys, every destination, any time.
                </p>
                <a
                  href="/pricing"
                  className="inline-block micro-copy bg-burnt-orange text-white px-10 py-4 hover:bg-ink transition-colors mb-4"
                >
                  View Plans &amp; Upgrade
                </a>
                <div className="mt-4">
                  <button
                    onClick={() => router.push("/")}
                    className="micro-copy text-ink-light hover:text-ink transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}

            {/* Sign-in required — anonymous daily generation already used */}
            {signInRequired && !loading && !itinerary && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border border-ink/15 bg-paper-dark px-8 py-10 text-center"
              >
                <Sparkles size={28} className="text-ink mx-auto mb-5" strokeWidth={1.5} />
                <p className="micro-copy text-ink-light mb-3">Free Itinerary Used</p>
                <h2 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight mb-4">
                  Sign in to keep creating.
                </h2>
                <p className="font-sans text-sm text-ink-light leading-relaxed max-w-sm mx-auto mb-8">
                  You&apos;ve used your free itinerary for today. Sign in — it&apos;s free — to curate again right away.
                </p>
                <SignInButton mode="modal">
                  <button className="inline-block micro-copy bg-burnt-orange text-white px-10 py-4 hover:bg-ink transition-colors mb-4">
                    Sign In to Continue Creating
                  </button>
                </SignInButton>
                <div className="mt-4">
                  <button
                    onClick={() => router.push("/")}
                    className="micro-copy text-ink-light hover:text-ink transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}

            {itinerary && loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 border border-ink/10 bg-paper-dark px-5 py-4 flex items-center justify-between gap-4 print:hidden"
              >
                <div>
                  <p className="micro-copy text-burnt-orange mb-1">
                    Journey Arriving
                  </p>
                  <p className="font-sans text-xs text-ink-light">
                    Day {progress.completedDays} of {progress.totalDays} is ready.
                    {progress.enrichingDay
                      ? ` Curating Day ${progress.enrichingDay}…`
                      : " Curating the next chapter…"}
                  </p>
                </div>
                <Loader2 size={16} className="animate-spin text-burnt-orange shrink-0" />
              </motion.div>
            )}

            {/* Itinerary — delegates all display to ItineraryViewer */}
            {itinerary && (
              <ItineraryViewer
                itinerary={itinerary}
                transportMode={transportMode}
                departureDate={departureDate}
                returnDate={returnDate}
                totalDays={streamComplete ? undefined : progress.totalDays}
                bottomSection={streamComplete ? (
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

                    {/* Sign in to save/export — signed-out users only */}
                    <SignedOut>
                      <div className="mb-10">
                        <p className="micro-copy text-ink-light mb-4">Curated for you</p>
                        <SignInButton mode="modal">
                          <button className="micro-copy inline-flex items-center gap-2 px-8 py-4 border border-ink/20 text-ink hover:bg-ink hover:text-paper transition-all">
                            <LogIn size={13} />
                            SIGN IN TO SAVE OR DOWNLOAD
                          </button>
                        </SignInButton>
                      </div>
                      <div className="w-8 h-px bg-ink/10 mx-auto mb-10" />
                    </SignedOut>

                    {/* Refine + PDF — always visible on mobile (desktop has header buttons) */}
                    <div className="md:hidden flex flex-col items-center gap-3 mb-8">
                      <button
                        onClick={() => setRefineOpen(true)}
                        className="flex items-center gap-2 micro-copy border border-ink/20 px-6 py-3 hover:bg-ink hover:text-paper transition-all w-full justify-center"
                      >
                        <SlidersHorizontal size={13} />
                        Refine Journey
                      </button>
                      <SignedIn>
                        <ExportPdfButton />
                      </SignedIn>
                    </div>

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
                ) : undefined}
              />
            )}

          </div>
        </div>

        {/* RIGHT: Sticky map — hidden in print */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full print:hidden">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>

      {/* Refine panel — portal, renders above everything */}
      {storedRequest && (
        <RefinePanel
          isOpen={refineOpen}
          onClose={() => setRefineOpen(false)}
          currentRequest={storedRequest}
          onRegenerate={handleRefine}
          isSaved={saveState === "saved"}
          isSignedIn={!!isSignedIn}
        />
      )}
    </div>
  );
}
