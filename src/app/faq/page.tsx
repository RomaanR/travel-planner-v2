"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

const FAQS = [
  {
    category: "The Service",
    items: [
      {
        q: "What exactly is TravalBee?",
        a: "TravalBee is a bespoke travel curation service. You tell us your destination, dates, travel party, pace, budget, dietary needs, and interests, and we produce a complete, day-by-day itinerary in around 2 minutes. Each itinerary includes activities, restaurant recommendations with real GPS coordinates, transit times between stops, hotel suggestions, and a hidden gem per day that 95% of tourists never find.",
      },
      {
        q: "How long does it take to generate an itinerary?",
        a: "Typically around 2 minutes. Everything, including activities, meals, maps, transit estimates, and hotel recommendations, is generated and enriched in a single pass. There are no follow-up loading states or second requests.",
      },
      {
        q: "What destinations are supported?",
        a: "Any destination in the world. The curation engine reasons about geography, neighbourhood coherence, and real place data, so it works equally well for Tokyo, Tangier, or Tbilisi. We currently support itineraries of 1–5 days.",
      },
      {
        q: "Can I customise the itinerary after it's generated?",
        a: "Not within the app. Itineraries are generated holistically. Each day is planned as a geographically coherent unit, so swapping a single activity without re-generating the full day would break the spatial logic and the map. If the result isn't right, regenerate with adjusted preferences: it only takes around 2 minutes.",
      },
      {
        q: "How accurate is the information?",
        a: "Place names, coordinates, and ratings are sourced from Google Places in real time and cached for freshness. Opening hours are computed locally. That said, venues change, so we always recommend verifying reservations and hours directly before you travel. Our Terms of Service cover this in detail.",
      },
    ],
  },
  {
    category: "Features",
    items: [
      {
        q: "Does it work offline?",
        a: "Yes. Once an itinerary is generated and saved, it is stored locally in your browser. Your archive at /trips is fully accessible without an internet connection: maps, transit times, hotel cards, and all. TravalBee is a Progressive Web App (PWA) and can be installed to your home screen.",
      },
      {
        q: "Can I save my itineraries?",
        a: "Yes. Create a free account and hit Save after generation. Your itineraries are stored in your private archive at /trips and synced across devices. They're also cached locally for offline access.",
      },
      {
        q: "Can I share my itinerary with someone?",
        a: "Yes. Every saved itinerary has a unique shareable link (/shared/[id]) that works without an account. Share it via the native share sheet on mobile, or copy the link to clipboard. Shared itineraries are read-only.",
      },
      {
        q: "Can I export to PDF?",
        a: "Yes. Open any saved itinerary and hit Export PDF. The full itinerary, including all days, timeline, activities, meals, and transit, prints cleanly with your browser's native print dialog. Maps, affiliate cards, and interactive elements are excluded from the print output.",
      },
      {
        q: "What is the hidden gem?",
        a: "Each day ends with a hidden gem: a locally beloved spot, viewpoint, neighbourhood, or experience that rarely appears in mainstream travel guides. These are deliberately obscure: think a ceramics workshop in a residential alley, a rooftop bar known only to regulars, or a temple reachable only by a 10-minute walk off the tourist trail.",
      },
      {
        q: "How do the hotel recommendations work?",
        a: "When you indicate you need accommodation, we recommend six hotels across three tiers: Boutique, Premium, and Luxury, each with a neighbourhood description and Booking.com affiliate link. You can filter by tier using the slider. If you already have a hotel booked, you can enter it and we'll use it as the geographic anchor for all activity clustering.",
      },
    ],
  },
  {
    category: "Account & Billing",
    items: [
      {
        q: "Is there a free tier?",
        a: "Yes. Your first itinerary curation is completely free, no credit card required. Sign up to save it to your archive.",
      },
      {
        q: "What does the paid plan include?",
        a: "The paid plan gives you unlimited itinerary generations, unlimited archive storage, offline access, PDF export, and shareable links. Pricing is listed on our Pricing page.",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, at any time from your account settings. You keep access until the end of your current billing period. No penalties, no questions asked.",
      },
      {
        q: "What is your refund policy?",
        a: "We offer a 7-day satisfaction guarantee on all paid plans. If you're not happy for any reason within 7 days of your first charge, email us and we'll issue a full refund. Full details are in our Refund Policy.",
      },
      {
        q: "How do I delete my account and data?",
        a: "Email privacy@travalbee.com with the subject line \"Account Deletion Request\". All personal data and saved itineraries will be permanently removed from our database within 30 days.",
      },
    ],
  },
  {
    category: "Privacy & Data",
    items: [
      {
        q: "Do you track me with cookies?",
        a: "No. We use only a strictly necessary session cookie for authentication (Clerk) and browser localStorage for your offline itinerary cache. We do not use advertising pixels, Google Analytics, or any cross-site tracking. Our analytics provider (Vercel Analytics) is cookieless and GDPR-compliant by design.",
      },
      {
        q: "Are my travel preferences shared with anyone?",
        a: "Your preferences (destination, dates, pace, dietary needs, interests) are transmitted to our curation engine to generate your itinerary, and to Google Places to enrich venue data. They are never sold to third parties or used for advertising. See our Privacy Policy for the full picture.",
      },
      {
        q: "Does the curation engine learn from my data?",
        a: "No. Your data is not used to train any model. Anthropic's API terms prohibit training on API inputs by default, and we do not opt in to any such programme.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-ink/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-6 py-5 text-left group"
      >
        <span className="font-sans text-sm font-medium text-ink leading-snug group-hover:text-ink-light transition-colors">
          {q}
        </span>
        <span className="shrink-0 mt-0.5 text-ink-light">
          {open ? <Minus size={14} strokeWidth={1.5} /> : <Plus size={14} strokeWidth={1.5} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p
              className="font-sans text-sm text-ink-light leading-relaxed pb-5 pr-8"
              dangerouslySetInnerHTML={{ __html: a }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" label="HOME" />
          <p className="micro-copy text-ink-light mb-4">Support</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-4">
            Frequently Asked<br />Questions
          </h1>
          <p className="font-sans text-sm text-ink-light leading-relaxed mb-10 max-w-md">
            Everything you need to know about TravalBee. Can&apos;t find your answer?{" "}
            <a
              href="mailto:hello@travalbee.com"
              className="text-emerald-accent hover:text-ink transition-colors"
            >
              Email us
            </a>
            .
          </p>
          <div className="w-12 h-px bg-burnt-orange mb-12" />

          <div className="space-y-12">
            {FAQS.map((section, si) => (
              <motion.section
                key={section.category}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: si * 0.08 }}
              >
                <p className="micro-copy text-burnt-orange mb-4">
                  {section.category}
                </p>
                <div>
                  {section.items.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-ink/5 flex flex-wrap gap-6">
            <Link
              href="/"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              &larr; Back to TravalBee
            </Link>
            <a
              href="mailto:hello@travalbee.com"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
