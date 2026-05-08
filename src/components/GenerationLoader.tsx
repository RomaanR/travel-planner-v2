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

// ── SVG Bee (burnt-orange, ~24 px) ─────────────────────────────────────────────

function BeeSvg() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="bee"
      role="img"
    >
      {/* Wings — behind body */}
      <ellipse
        cx="7" cy="11"
        rx="5.5" ry="2.8"
        fill="white" fillOpacity="0.82"
        stroke="#0A0A0A" strokeWidth="0.6"
        transform="rotate(-18 7 11)"
      />
      <ellipse
        cx="17" cy="11"
        rx="5.5" ry="2.8"
        fill="white" fillOpacity="0.82"
        stroke="#0A0A0A" strokeWidth="0.6"
        transform="rotate(18 17 11)"
      />

      {/* Body */}
      <ellipse cx="12" cy="14.5" rx="4.2" ry="6" fill="#C2410C" />

      {/* Stripes */}
      <path d="M8.1 12.8 Q12 11.8 15.9 12.8" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M8.1 15.5 Q12 14.5 15.9 15.5" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M9 18 Q12 17.2 15 18"         stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Head */}
      <circle cx="12" cy="8" r="3.2" fill="#C2410C" />

      {/* Antennae */}
      <line x1="10.6" y1="5.5" x2="8.5"  y2="2.8" stroke="#0A0A0A" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="13.4" y1="5.5" x2="15.5" y2="2.8" stroke="#0A0A0A" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="8.5"  cy="2.6" r="0.9" fill="#0A0A0A" />
      <circle cx="15.5" cy="2.6" r="0.9" fill="#0A0A0A" />

      {/* Stinger */}
      <path d="M11.2 20.3 L12 22.5 L12.8 20.3" fill="#0A0A0A" />
    </svg>
  );
}

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
        {/* Wireframe globe — black lines */}
        <svg
          viewBox="0 0 112 112"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Outer circle */}
          <circle
            cx="56" cy="56" r="34"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="1.5"
          />
          {/* Equator */}
          <ellipse
            cx="56" cy="56" rx="34" ry="11"
            fill="none"
            stroke="rgba(10,10,10,0.55)"
            strokeWidth="1.2"
          />
          {/* Prime meridian */}
          <ellipse
            cx="56" cy="56" rx="11" ry="34"
            fill="none"
            stroke="rgba(10,10,10,0.55)"
            strokeWidth="1.2"
          />
          {/* Northern tropic */}
          <ellipse
            cx="56" cy="41" rx="23" ry="7"
            fill="none"
            stroke="rgba(10,10,10,0.3)"
            strokeWidth="1"
          />
          {/* Southern tropic */}
          <ellipse
            cx="56" cy="71" rx="23" ry="7"
            fill="none"
            stroke="rgba(10,10,10,0.3)"
            strokeWidth="1"
          />
        </svg>

        {/* Bee orbit — outer rotates, inner counter-rotates to keep bee upright */}
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
            style={{ top: "3px" }}
          >
            <BeeSvg />
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
