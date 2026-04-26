"use client";

export const dynamic = "force-dynamic";

// ── Hero toggle ────────────────────────────────────────────────────
// Set to false to instantly revert to the locked-in classic design.
const USE_FLOATING_UI = true;

import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BentoGrid from "@/components/BentoGrid";
import HeroClassic from "@/components/HeroClassic";
import HeroFloating from "@/components/HeroFloating";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      {USE_FLOATING_UI ? <HeroFloating /> : <HeroClassic />}

      {/* ── Everything below the hero — opaque wrapper to cover the fixed background ── */}
      <div className="relative z-10 bg-paper">

      {/* ── Stats Strip ──────────────────────────────────── */}
      <section className="border-b border-ink/5 bg-paper-dark">
        <div className="max-w-screen-xl mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { value: "2 mins", label: "Average Curation Time" },
            { value: "120+", label: "Destinations Worldwide" },
            { value: "100%", label: "Hidden Gems Included" },
            { value: "Zero", label: "Tourist Traps" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-serif italic text-4xl text-ink mb-1">
                {stat.value}
              </p>
              <p className="micro-copy text-ink-light">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="px-8 md:px-16 py-20 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <p className="micro-copy text-ink-light mb-3">How It Works</p>
          <h2 className="font-serif italic text-4xl md:text-7xl text-ink leading-none">
            Three Steps.<br />One Perfect Trip.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/5">
          {[
            {
              step: "01",
              title: "Tell Us Your Dream",
              body: "Pick a destination, set your dates, and share your pace, budget, and dietary needs.",
            },
            {
              step: "02",
              title: "We Curate Every Detail",
              body: "Hidden gems, Michelin-worthy restaurants, and geographically coherent routes, crafted in seconds.",
            },
            {
              step: "03",
              title: "Your Dossier Is Ready",
              body: "A day-by-day itinerary with maps, transit times, and hotel recommendations. Save, share, or export as PDF.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
              className="bg-paper p-6 md:p-10 border border-ink/5"
            >
              <span className="micro-copy text-burnt-orange mb-4 block">
                {item.step}
              </span>
              <h3 className="font-serif italic text-2xl md:text-3xl text-ink leading-tight mb-3">
                {item.title}
              </h3>
              <p
                className="font-sans text-sm text-ink-light leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Demo Video ───────────────────────────────────── */}
      <section className="px-8 md:px-16 py-24 max-w-screen-xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left — brand anchor */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:w-[30%] shrink-0"
          >
            <p className="micro-copy text-ink-light mb-4">See It In Action</p>
            <h2 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-5">
              TravalBee
            </h2>
            <p className="font-sans text-sm text-ink-light leading-relaxed">
              Watch the concierge craft a complete luxury itinerary&nbsp;&mdash; hidden gems, live maps, and curated restaurant picks&nbsp;&mdash; in under two minutes.
            </p>
          </motion.div>

          {/* Right — video showcase */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="flex-1 w-full"
          >
            <div className="max-w-5xl w-full mx-auto overflow-hidden rounded-xl border border-zinc-800 shadow-[0_32px_80px_rgba(0,0,0,0.28)] bg-zinc-950">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto block"
              >
                <source src="/demo.mp4" type="video/mp4" />
              </video>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── Bento Grid ───────────────────────────────────── */}
      <BentoGrid />

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-ink/5 bg-paper-dark px-8 md:px-16 py-12">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-serif italic text-3xl text-ink mb-1">
              TravalBee
            </p>
            <p className="micro-copy text-ink-light">
              Curated Luxury Journeys
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/pricing" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="micro-copy text-ink-light hover:text-ink transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Cookies
            </Link>
            <Link href="/refunds" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Refunds
            </Link>
            <Link href="/support" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Support
            </Link>
          </div>
          <p className="micro-copy text-ink-light">
            &copy; {new Date().getFullYear()} TravalBee. All rights reserved.
          </p>
        </div>
      </footer>

      </div>{/* end below-hero opaque wrapper */}
    </main>
  );
}
