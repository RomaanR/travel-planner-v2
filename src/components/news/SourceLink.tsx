"use client";

import { track } from "@vercel/analytics";
import { ArrowUpRight } from "lucide-react";

/** Outbound link to the official source, with a funnel event. */
export default function SourceLink({ href, source, children }: { href: string; source: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("news_source_clicked", { source })}
      className="group micro-copy text-[10px] inline-flex items-center gap-1.5 text-ink hover:text-burnt-orange transition-colors"
    >
      {children}
      <ArrowUpRight size={12} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
