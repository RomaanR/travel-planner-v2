"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Loading copy ───────────────────────────────────────────────────────────────

const STEPS = [
  "Reviewing your preferences\u2026",
  "Sourcing vetted luxury accommodations\u2026",
  "Cross-referencing Michelin guides\u2026",
  "Mapping realistic routes and transit times\u2026",
  "Finalising your bespoke itinerary\u2026",
];

const INTERVAL_MS = 3500;

// ── Component ─────────────────────────────────────────────────────────────────

export default function GenerationLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6 gap-8">

      {/* Thin spinning ring */}
      <div className="relative w-10 h-10">
        {/* Static track */}
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        {/* Rotating arc */}
        <div
          className="absolute inset-0 rounded-full border border-transparent border-t-ink/40 animate-spin"
          style={{ animationDuration: "2.4s", animationTimingFunction: "linear" }}
        />
      </div>

      {/* Cycling text */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="font-serif italic text-lg sm:text-2xl text-ink leading-tight max-w-xs"
          >
            {STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Persistent sub-label */}
      <p className="micro-copy text-ink-light">
        This will take about 2 minutes
      </p>

    </div>
  );
}
