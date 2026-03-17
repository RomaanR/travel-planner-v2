"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

// ── Inspiration card data ──────────────────────────────────────────────────────

const CARDS = [
  {
    destination: "A Weekend in Kyoto",
    subtext:     "Zen gardens, kaiseki dining, and hidden teahouses.",
    href:        "/",
  },
  {
    destination: "Summer on the Amalfi Coast",
    subtext:     "Cliffside villas, private boat charters, and Michelin seafood.",
    href:        "/",
  },
  {
    destination: "Wellness in Tulum",
    subtext:     "Jungle sanctuaries, holistic spas, and private cenotes.",
    href:        "/",
  },
];

// ── Animation variants ─────────────────────────────────────────────────────────

const sectionVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmptyTripsState() {
  return (
    <div className="py-16 md:py-24">

      {/* ── Section A: Editorial Greeting ────────────────────────────────── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center mb-20"
      >
        {/* Compass icon */}
        <Compass
          size={20}
          strokeWidth={1}
          className="text-ink-light mb-6"
        />

        {/* Micro-copy kicker */}
        <p className="micro-copy text-ink-light mb-5 tracking-widest">
          Welcome to Seek Wander
        </p>

        {/* Headline */}
        <h2 className="font-serif italic text-4xl md:text-5xl text-ink leading-tight mb-6 max-w-md">
          Your passport is<br />currently blank.
        </h2>

        {/* Body */}
        <p className="font-sans text-sm text-ink-light mb-10 max-w-xs leading-relaxed">
          Every remarkable journey begins with a single destination.
          Let&apos;s curate yours.
        </p>

        {/* CTA — inverted: bg-ink / text-paper */}
        <Link
          href="/"
          className="inline-flex items-center gap-3 bg-ink text-paper micro-copy px-8 py-4
                     hover:bg-burnt-orange transition-colors duration-300"
        >
          Curate a Journey
          <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
      </motion.div>

      {/* ── Section B: Inspiration Grid ──────────────────────────────────── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* Section label */}
        <p className="micro-copy text-ink-light mb-6">Instant Inspiration</p>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/5">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.destination}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 + i * 0.08 }}
            >
              <Link
                href={card.href}
                className="flex flex-col justify-between bg-paper border border-ink/10 p-6 md:p-8
                           group hover:border-ink/30 hover:-translate-y-0.5
                           transition-all duration-200 h-full"
              >
                {/* Card header micro-copy */}
                <p className="micro-copy text-ink-light mb-4">
                  Destination
                </p>

                {/* Card title */}
                <h3 className="font-serif italic text-2xl md:text-3xl text-ink leading-tight mb-3 flex-1">
                  {card.destination}
                </h3>

                {/* Card subtext */}
                <p className="font-sans text-sm text-ink-light leading-relaxed mb-6">
                  {card.subtext}
                </p>

                {/* Arrow CTA */}
                <div className="flex items-center gap-2 micro-copy text-ink-light
                                group-hover:text-ink transition-colors duration-200">
                  Begin curating
                  <ArrowRight
                    size={13}
                    strokeWidth={1.5}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
