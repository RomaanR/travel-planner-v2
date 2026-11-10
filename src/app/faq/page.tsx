"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import SiteFooter from "@/components/SiteFooter";
import { FAQS } from "@/content/faqs";


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
              href="mailto:contact@opsisx.com"
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
              href="mailto:contact@opsisx.com"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>
    <SiteFooter />
    </>
  );
}
