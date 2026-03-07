"use client";

import { motion, type MotionProps } from "framer-motion";
import Image from "next/image";
import { Zap, UtensilsCrossed, Compass } from "lucide-react";

const fadeUp = (delay = 0): MotionProps => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut", delay },
});

export default function BentoGrid() {
  return (
    <section className="px-6 md:px-12 py-20 max-w-screen-xl mx-auto">
      {/* Section header */}
      <motion.div {...fadeUp(0)} className="mb-12">
        <p className="micro-copy text-ink-light mb-3">The Philosophy</p>
        <h2 className="font-serif italic text-6xl md:text-8xl text-ink leading-none">
          The Soul<br />of a Journey
        </h2>
      </motion.div>

      {/* 12-col bento grid */}
      <div className="grid grid-cols-12 bento-gap bg-ink/5">

        {/* Cell 01 — Hidden Gems (col 8) */}
        <motion.div
          {...fadeUp(0.1)}
          className="col-span-12 md:col-span-8 relative overflow-hidden bg-ink min-h-[480px] group"
        >
          <Image
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80"
            alt="Hidden mountain lake — cinematic travel"
            fill
            className="object-cover img-grayscale opacity-70"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          {/* Index */}
          <span className="absolute top-6 right-6 micro-copy text-white/50">
            01
          </span>
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent">
            <p className="micro-copy text-white/60 mb-2">
              Hidden Gems
            </p>
            <h3 className="font-serif italic text-4xl md:text-5xl text-white leading-tight">
              Places 95% of<br />Travelers Never Find
            </h3>
          </div>
        </motion.div>

        {/* Cell 02 — Pace Control (col 4) */}
        <motion.div
          {...fadeUp(0.2)}
          className="col-span-12 md:col-span-4 bg-paper-dark p-10 flex flex-col justify-between min-h-[240px]"
        >
          <span className="micro-copy text-ink-light">02</span>
          <div>
            <Zap
              size={32}
              strokeWidth={1}
              className="text-burnt-orange mb-6"
            />
            <p className="micro-copy text-ink-light mb-3">Pace Control</p>
            <h3 className="font-serif italic text-4xl text-ink leading-tight">
              Slow Mornings<br />vs. High Octane
            </h3>
            <p className="mt-4 text-ink-light text-sm leading-relaxed font-sans">
              Every itinerary is calibrated to your rhythm — restorative silence or culturally immersive density.
            </p>
          </div>
        </motion.div>

        {/* Cell 03 — Palate First (col 6) */}
        <motion.div
          {...fadeUp(0.3)}
          className="col-span-12 md:col-span-6 bg-ink text-paper p-10 flex flex-col justify-between min-h-[300px]"
        >
          <span className="micro-copy text-paper/40">03</span>
          <div>
            <UtensilsCrossed
              size={32}
              strokeWidth={1}
              className="text-emerald-accent mb-6"
            />
            <p className="micro-copy text-paper/50 mb-3">Palate First</p>
            <h3 className="font-serif italic text-4xl text-paper leading-tight">
              Reservations<br />Hand-Picked by AI
            </h3>
            <p className="mt-4 text-paper/60 text-sm leading-relaxed font-sans">
              No Yelp. No TripAdvisor. Only chef-driven tables, hidden izakayas, and legendary tasting menus sourced from local intelligence.
            </p>
          </div>
        </motion.div>

        {/* Cell 04 — Editorial CTA (col 6) */}
        <motion.div
          {...fadeUp(0.4)}
          className="col-span-12 md:col-span-6 bg-paper p-10 flex flex-col justify-between border border-ink/5 min-h-[300px]"
        >
          <span className="micro-copy text-ink-light">04</span>
          <div>
            <Compass
              size={32}
              strokeWidth={1}
              className="text-ink-light mb-6"
            />
            <blockquote className="font-serif italic text-4xl text-ink leading-tight">
              &quot;Travel is not about destinations.
              <span className="block mt-2 border-b-2 border-burnt-orange pb-1 inline-block">
                It is about becoming.&quot;
              </span>
            </blockquote>
            <p className="mt-6 micro-copy text-ink-light">
              Seek Wander — Est. 2024
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
