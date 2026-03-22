"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const FREE_FEATURES = [
  "1 complimentary bespoke itinerary",
  "Day-by-day timeline with real restaurants",
  "Interactive map with curated markers",
  "Hidden gem recommendations",
  "Shareable journey link",
];

const PRO_FEATURES = [
  "1 additional bespoke itinerary credit",
  "Day-by-day timeline with real restaurants",
  "Interactive map with curated markers",
  "Hidden gem recommendations",
  "Shareable journey link",
  "Save itineraries to your archive",
  "PDF export of every journey",
  "Up to 7-day itineraries",
  "Hotel recommendations across 3 tiers",
  "Credits never expire",
];

function CancelledBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("cancelled") !== "1") return null;
  return (
    <p className="micro-copy text-ink-light border border-ink/10 inline-block px-4 py-2 mb-8">
      Checkout cancelled &mdash; no charge was made.
    </p>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleUpgrade() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          // Not signed in — Clerk modal will open on the next click from Navbar
          router.push("/?signIn=1");
          return;
        }
        throw new Error(data.error ?? "Something went wrong");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      <section className="pt-32 pb-24 px-6 md:px-16 max-w-screen-xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <Suspense fallback={null}>
            <CancelledBanner />
          </Suspense>
          <p className="micro-copy text-ink-light mb-4">Simple Pricing</p>
          <h1 className="font-serif italic text-5xl md:text-8xl text-ink leading-none">
            Pay once.<br />Travel forever.
          </h1>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/5 max-w-4xl mx-auto">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="bg-paper p-8 md:p-12 flex flex-col"
          >
            <p className="micro-copy text-ink-light mb-6">Free</p>
            <div className="mb-8">
              <span className="font-serif italic text-6xl text-ink">$0</span>
              <span className="micro-copy text-ink-light ml-2">forever</span>
            </div>
            <ul className="space-y-3 mb-10 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={13} className="text-ink-light shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="font-sans text-sm text-ink-light">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="block text-center micro-copy border border-ink/20 px-6 py-3.5 hover:bg-ink hover:text-paper transition-all"
            >
              Get Started Free
            </Link>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="bg-ink text-paper p-8 md:p-12 flex flex-col relative overflow-hidden"
          >
            {/* One-time badge */}
            <span className="absolute top-6 right-6 micro-copy text-paper/40">
              One-Time
            </span>

            <p className="micro-copy text-paper/50 mb-6">Credit</p>
            <div className="mb-8">
              <span className="font-serif italic text-6xl text-paper">$4.99</span>
              <span className="micro-copy text-paper/40 ml-2">/ itinerary</span>
            </div>

            <ul className="space-y-3 mb-10 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={13} className="text-burnt-orange shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="font-sans text-sm text-paper/80">{f}</span>
                </li>
              ))}
            </ul>

            {error && (
              <p className="micro-copy text-burnt-orange mb-4">{error}</p>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="block w-full text-center micro-copy bg-burnt-orange text-white px-6 py-3.5 hover:bg-paper hover:text-ink transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 size={13} className="animate-spin" />
                  Redirecting to checkout&hellip;
                </span>
              ) : (
                "Buy a Credit &mdash; $4.99"
              )}
            </button>

            <p className="micro-copy text-paper/30 text-center mt-4">
              One-time charge &middot; No subscription &middot; Credits never expire
            </p>
          </motion.div>

        </div>

        {/* FAQ strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 max-w-2xl mx-auto"
        >
          <p className="micro-copy text-ink-light text-center mb-10">Common Questions</p>
          {[
            {
              q: "What counts as one free itinerary?",
              a: "Each generation of a unique trip (destination + dates + preferences) counts as one. Viewing or sharing an existing itinerary does not consume your free generation.",
            },
            {
              q: "Do my credits expire?",
              a: "No. Credits never expire. Buy one today, use it six months from now &mdash; it will be waiting for you.",
            },
            {
              q: "Is my payment information secure?",
              a: "Payments are handled entirely by Stripe. Seek Wander never stores your card details.",
            },
            {
              q: "Do you offer refunds?",
              a: "We offer refunds within 7 days of purchase if you are not satisfied. See our Refund Policy for details.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              className="border-b border-ink/5 py-6"
            >
              <p className="font-serif italic text-xl text-ink mb-2">{item.q}</p>
              <p className="font-sans text-sm text-ink-light leading-relaxed">{item.a}</p>
            </motion.div>
          ))}
        </motion.div>

      </section>

      {/* Footer */}
      <footer className="border-t border-ink/5 bg-paper-dark px-8 md:px-16 py-8">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-serif italic text-2xl text-ink">Seek Wander</p>
          <p className="micro-copy text-ink-light">
            &copy; {new Date().getFullYear()} Seek Wander. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
