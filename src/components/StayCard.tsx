"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface StayCardProps {
  name:         string;
  description:  string;
  neighborhood: string;
  affiliateUrl: string;
}

export default function StayCard({ name, description, neighborhood, affiliateUrl }: StayCardProps) {
  return (
    <motion.a
      href={affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col justify-between border border-ink/10 bg-paper p-5 group cursor-pointer"
    >
      {/* Top: neighborhood label */}
      <p className="micro-copy text-ink-light mb-3">{neighborhood}</p>

      {/* Middle: hotel name */}
      <h3 className="font-serif italic text-2xl text-ink leading-tight mb-3">
        {name}
      </h3>

      {/* Body: editorial pitch */}
      <p className="font-sans text-sm text-ink-light leading-relaxed flex-1 mb-4">
        {description}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-1.5 micro-copy text-burnt-orange">
        Book this Stay
        <ArrowUpRight
          size={13}
          strokeWidth={1.5}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </motion.a>
  );
}
