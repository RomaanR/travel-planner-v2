"use client";

import { track } from "@vercel/analytics";
import { ArrowUpRight } from "lucide-react";

/** Outbound link to the official source, with a funnel event. */
export default function SourceLink({ href, source, label, children }: { href: string; source: string; label?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ? `${label} (opens in a new tab)` : undefined}
      onClick={() => track("news_source_clicked", { source })}
      className="group micro-copy text-xs inline-flex items-center gap-1.5 py-2.5 text-ink hover:text-burnt-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange"
    >
      {children}
      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
