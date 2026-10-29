"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import NewsCard from "./NewsCard";
import type { NewsView } from "@/lib/news/types";

/** Home-page strip: the latest official updates. Renders nothing until there is news. */
export default function BriefingStrip({ items }: { items: NewsView[] }) {
  if (items.length === 0) return null;

  return (
    <section className="px-8 md:px-16 pb-4 pt-20 max-w-screen-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
      >
        <div>
          <p className="micro-copy text-ink-light mb-3">Travel Briefing</p>
          <h2 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
            Before you go.
          </h2>
        </div>
        <Link href="/news" className="micro-copy text-[10px] inline-flex items-center gap-2 text-ink hover:text-burnt-orange transition-colors">
          All travel news <ArrowRight size={12} strokeWidth={1.5} />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
          >
            <NewsCard item={item} compact />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
