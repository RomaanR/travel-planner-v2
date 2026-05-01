"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, RefreshCw, Feather, Zap, Flame } from "lucide-react";
import type { ItineraryRequest } from "@/types/itinerary";

// ─── Option data — mirrors CurationForm values exactly ───────────────────────

const BUDGET_OPTIONS = [
  { value: "premium"      as const, label: "Economic",  symbol: "$$",   sub: "Refined & Considered" },
  { value: "luxury"       as const, label: "Premium",   symbol: "$$$",  sub: "Effortlessly Elevated" },
  { value: "ultra-luxury" as const, label: "Luxury",    symbol: "$$$$", sub: "Without Compromise" },
];

const PACE_OPTIONS = [
  { value: "relaxed"  as const, label: "Relaxed",  sub: "3–4 Activities", icon: <Feather size={18} strokeWidth={1} /> },
  { value: "moderate" as const, label: "Moderate", sub: "4–5 Activities", icon: <Zap     size={18} strokeWidth={1} /> },
  { value: "packed"   as const, label: "Packed",   sub: "6–7 Activities", icon: <Flame   size={18} strokeWidth={1} /> },
];

const INTEREST_OPTIONS = [
  { value: "sightseeing",         label: "Sightseeing" },
  { value: "museums-art",         label: "Museums & Art" },
  { value: "food-dining",         label: "Food & Dining" },
  { value: "nature-parks",        label: "Nature & Parks" },
  { value: "shopping",            label: "Shopping" },
  { value: "nightlife",           label: "Nightlife" },
  { value: "culture-history",     label: "Culture & History" },
  { value: "adventure-sports",    label: "Adventure & Sports" },
  { value: "relaxation-wellness", label: "Relaxation & Wellness" },
  { value: "photography",         label: "Photography" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RefinePanelProps {
  isOpen:         boolean;
  onClose:        () => void;
  currentRequest: ItineraryRequest;
  onRegenerate:   (updated: ItineraryRequest) => void;
  isSaved:        boolean;
  isSignedIn:     boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RefinePanel({
  isOpen,
  onClose,
  currentRequest,
  onRegenerate,
  isSaved,
  isSignedIn,
}: RefinePanelProps) {
  const [mounted,    setMounted]    = useState(false);
  const [budgetTier, setBudgetTier] = useState(currentRequest.budgetTier);
  const [pace,       setPace]       = useState(currentRequest.pace);
  const [interests,  setInterests]  = useState<string[]>(currentRequest.interests ?? []);

  useEffect(() => setMounted(true), []);

  // Re-sync local state whenever the panel is opened
  useEffect(() => {
    if (isOpen) {
      setBudgetTier(currentRequest.budgetTier);
      setPace(currentRequest.pace);
      setInterests(currentRequest.interests ?? []);
    }
  }, [isOpen, currentRequest]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  }

  const hasChanges =
    budgetTier !== currentRequest.budgetTier ||
    pace       !== currentRequest.pace ||
    JSON.stringify([...interests].sort()) !==
    JSON.stringify([...(currentRequest.interests ?? [])].sort());

  function handleRegenerate() {
    onRegenerate({ ...currentRequest, budgetTier, pace, interests });
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="refine-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — slides up from the bottom on all screen sizes */}
          <motion.div
            key="refine-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-paper max-h-[90vh] overflow-y-auto md:max-w-xl md:left-auto md:right-6 md:bottom-6 md:max-h-[85vh]"
            style={{ backgroundColor: "#F5F0E8" }}
          >
            {/* ── Header ── */}
            <div className="sticky top-0 bg-paper flex items-center justify-between px-6 py-5 border-b border-ink/10 z-10" style={{ backgroundColor: "#F5F0E8" }}>
              <div>
                <p className="micro-copy text-ink-light mb-0.5">Adjust &amp; Refresh</p>
                <h2 className="font-serif italic text-2xl text-ink leading-tight">
                  Refine Your Journey
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close refine panel"
                className="p-2 -mr-1 text-ink-light hover:text-ink transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">

              {/* Destination (read-only) */}
              <div>
                <p className="micro-copy text-ink-light mb-1">Destination</p>
                <p className="font-serif italic text-xl text-ink">{currentRequest.destination}</p>
                <p className="font-sans text-xs text-ink-light mt-1">
                  Destination and dates are fixed. To change them, start a new journey.
                </p>
              </div>

              {/* ── Budget Tier ── */}
              <div>
                <p className="micro-copy text-ink-light mb-3">Budget Tier</p>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBudgetTier(opt.value)}
                      className={`flex flex-col gap-1.5 p-3 border text-left transition-all duration-200 cursor-pointer
                        ${budgetTier === opt.value
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/10 text-ink hover:border-ink/30"
                        }`}
                    >
                      <span className={`font-serif italic text-2xl leading-none ${budgetTier === opt.value ? "text-paper" : "text-ink"}`}>
                        {opt.symbol}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase font-bold leading-tight">
                        {opt.label}
                      </span>
                      <span className={`font-sans text-[10px] leading-tight ${budgetTier === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Travel Pace ── */}
              <div>
                <p className="micro-copy text-ink-light mb-3">Travel Pace</p>
                <div className="grid grid-cols-3 gap-2">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPace(opt.value)}
                      className={`flex flex-col gap-2 p-3 border text-left transition-all duration-200 cursor-pointer
                        ${pace === opt.value
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/10 text-ink hover:border-ink/30"
                        }`}
                    >
                      <span className={pace === opt.value ? "text-paper/70" : "text-ink-light"}>
                        {opt.icon}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase font-bold leading-tight">
                        {opt.label}
                      </span>
                      <span className={`font-sans text-[10px] leading-tight ${pace === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Interests ── */}
              <div>
                <p className="micro-copy text-ink-light mb-3">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleInterest(opt.value)}
                      className={`px-3 py-1.5 border micro-copy transition-all duration-200 cursor-pointer
                        ${interests.includes(opt.value)
                          ? "bg-burnt-orange text-white border-burnt-orange"
                          : "border-ink/15 text-ink-light hover:border-burnt-orange/40 hover:text-ink"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Archive notice ── */}
              <p className="font-sans text-xs text-ink-light border-l-2 border-ink/15 pl-3 leading-relaxed">
                {isSignedIn && !isSaved
                  ? "Your current itinerary will be automatically saved to your archive before the new one is generated."
                  : isSignedIn && isSaved
                  ? "Your saved itinerary will not be overwritten — the new version can be saved separately."
                  : "Sign in to archive your itineraries. The current version will be replaced when you regenerate."}
              </p>

              {/* ── Regenerate CTA ── */}
              <button
                onClick={handleRegenerate}
                disabled={!hasChanges}
                className="w-full flex items-center justify-center gap-2 py-4 bg-burnt-orange text-white micro-copy hover:bg-ink transition-colors duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} strokeWidth={2} />
                Regenerate Journey
              </button>

              {/* Safe bottom padding for phones with home-bar */}
              <div className="h-4" />

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
