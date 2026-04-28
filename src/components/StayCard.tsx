"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { generateBookingLink } from "@/app/actions/affiliate";

interface StayCardProps {
  name:         string;
  description:  string;
  neighborhood: string;
  destination:  string;
}

export default function StayCard({ name, description, neighborhood, destination }: StayCardProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleReserve() {
    if (isRedirecting) return;

    const bookingTab = window.open("about:blank", "_blank");
    if (bookingTab) bookingTab.opener = null;

    setIsRedirecting(true);
    try {
      const url = await generateBookingLink(name, destination);
      if (bookingTab) {
        bookingTab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      bookingTab?.close();
    } finally {
      setIsRedirecting(false);
    }
  }

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col justify-between border border-ink/10 bg-paper p-5 group"
    >
      {/* Top: neighborhood label */}
      <p className="micro-copy text-ink-light mb-3">{neighborhood}</p>

      {/* Middle: hotel name */}
      <h3 className="font-serif italic text-xl sm:text-2xl text-ink leading-tight mb-3">
        {name}
      </h3>

      {/* Body: editorial pitch */}
      <p className="font-sans text-sm text-ink-light leading-relaxed flex-1 mb-4">
        {description}
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={handleReserve}
        disabled={isRedirecting}
        className="micro-copy inline-flex w-fit items-center gap-2 border border-ink bg-white px-4 py-2 text-ink transition-all duration-300 hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-70"
      >
        {isRedirecting ? (
          <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
        ) : (
          <ArrowUpRight
            size={13}
            strokeWidth={1.5}
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        )}
        {isRedirecting ? "Opening" : "Reserve"}
      </button>
    </motion.article>
  );
}
