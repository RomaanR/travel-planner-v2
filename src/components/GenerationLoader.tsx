"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Loading copy ───────────────────────────────────────────────────────────────

const STEPS = [
  "Reviewing your preferences…",
  "Sourcing vetted luxury accommodations…",
  "Cross-referencing Michelin guides…",
  "Mapping realistic routes and transit times…",
  "Finalising your bespoke itinerary…",
];

const TAILOR_STEPS = [
  "Reading your anchor points…",
  "Locking in your fixed plans…",
  "Filling gaps with luxury curation…",
  "Mapping routes around your anchors…",
  "Finalising your bespoke dossier…",
];

const INTERVAL_MS = 3500;

// ── Component ─────────────────────────────────────────────────────────────────

interface GenerationLoaderProps {
  mode?: "inspire" | "tailor";
}

export default function GenerationLoader({ mode = "inspire" }: GenerationLoaderProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = mode === "tailor" ? TAILOR_STEPS : STEPS;

  useEffect(() => {
    setStepIndex(0);
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, steps.length]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6 gap-8">

      {/* Globe + orbiting bee */}
      <div className="relative w-28 h-28">
        {/* Wireframe globe */}
        <svg
          viewBox="0 0 112 112"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Outer circle */}
          <circle
            cx="56" cy="56" r="34"
            fill="none"
            stroke="rgba(10,10,10,0.13)"
            strokeWidth="1.5"
          />
          {/* Equator */}
          <ellipse
            cx="56" cy="56" rx="34" ry="11"
            fill="none"
            stroke="rgba(10,10,10,0.09)"
            strokeWidth="1.2"
          />
          {/* Prime meridian */}
          <ellipse
            cx="56" cy="56" rx="11" ry="34"
            fill="none"
            stroke="rgba(10,10,10,0.09)"
            strokeWidth="1.2"
          />
          {/* Northern tropic */}
          <ellipse
            cx="56" cy="41" rx="23" ry="7"
            fill="none"
            stroke="rgba(10,10,10,0.05)"
            strokeWidth="1"
          />
          {/* Southern tropic */}
          <ellipse
            cx="56" cy="71" rx="23" ry="7"
            fill="none"
            stroke="rgba(10,10,10,0.05)"
            strokeWidth="1"
          />
        </svg>

        {/* Bee orbit — outer div rotates, inner counter-rotates to keep bee upright */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ transformOrigin: "50% 50%" }}
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: "4px" }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }} role="img" aria-label="bee">
              🐝
            </span>
          </motion.div>
        </motion.div>
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
            {steps[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Persistent sub-label */}
      <div className="flex flex-col items-center gap-2">
        <p className="micro-copy text-ink-light">
          Go grab a coffee &mdash; I&apos;ll have your itinerary ready when you&apos;re back.
        </p>
        <p className="micro-copy text-ink/40">
          Just don&apos;t close this tab.
        </p>
      </div>

    </div>
  );
}
