"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StayCard from "@/components/StayCard";
import { createAffiliateUrl } from "@/lib/affiliate";
import type { RecommendedStay } from "@/types/itinerary";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InteractiveStaysProps {
  stays:       RecommendedStay[];
  destination: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  3: "Boutique (3\u2605)",
  4: "Premium (4\u2605)",
  5: "Luxury (5\u2605)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveStays({ stays, destination }: InteractiveStaysProps) {
  const [minRating, setMinRating] = useState(4);

  // Backward-compat guard: old saved trips have no `rating` field.
  // When absent, skip the slider entirely and show the first 2 stays as before.
  const hasRatings = stays.some(s => s.rating !== undefined);

  const filtered = hasRatings
    ? stays.filter(s => s.rating === minRating).slice(0, 2)
    : stays.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8 print:hidden"
    >
      {/* Section divider + kicker */}
      <div className="w-8 h-px bg-ink/20 mb-4" />
      <p className="micro-copy text-ink-light mb-4">The Curation</p>

      {/* ── Ratings slider — only when new-format data is present ── */}
      {hasRatings && (
        <div className="mb-5">
          <input
            type="range"
            min={3}
            max={5}
            step={1}
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
            className="w-full accent-ink cursor-pointer"
            aria-label="Filter hotels by star rating"
          />
          {/* Tier labels — flush with slider endpoints */}
          <div className="flex justify-between mt-2">
            <span className="micro-copy text-ink-light">Boutique (3\u2605)</span>
            <span className="micro-copy text-ink-light">Premium (4\u2605)</span>
            <span className="micro-copy text-ink-light">Luxury (5\u2605)</span>
          </div>
        </div>
      )}

      {/* Active tier label */}
      {hasRatings && (
        <p className="font-sans text-xs text-ink-light mb-4 tracking-widest uppercase">
          Showing: {TIER_LABELS[minRating] ?? `${minRating}\u2605`}
        </p>
      )}

      {/* ── Hotel cards — AnimatePresence cross-fade on tier change ── */}
      <AnimatePresence mode="wait">
        {filtered.length > 0 ? (
          <motion.div
            key={minRating}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {filtered.map(stay => (
              <StayCard
                key={stay.name}
                name={stay.name}
                description={stay.description}
                neighborhood={stay.neighborhood}
                affiliateUrl={createAffiliateUrl(stay.name, destination)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="font-sans text-sm text-ink-light"
          >
            No recommendations at this tier.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
