import { implicationsFor } from "@/lib/news/implications";
import type { NewsView } from "@/lib/news/types";

/** Collapsible "What does this mean for travellers?" — only renders for updates that warrant it. */
export default function Implications({ item }: { item: NewsView }) {
  const rows = implicationsFor(item);
  if (!rows) return null;

  return (
    <details className="group border-t border-ink/10 pt-1">
      <summary className="cursor-pointer list-none min-h-[44px] flex items-center justify-between gap-3 font-sans font-bold text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
        What does this mean for travellers?
        <span aria-hidden className="text-ink-light group-open:hidden">+</span>
        <span aria-hidden className="text-ink-light hidden group-open:inline">&minus;</span>
      </summary>
      <dl className="space-y-3 pb-1 pt-1">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="flex flex-wrap items-center gap-2 font-sans text-sm font-bold text-ink">
              {r.label}
              <span className={`micro-copy text-[10px] font-normal ${r.basis === "official" ? "text-emerald-accent" : "text-ink-light"}`}>
                {r.basis === "official" ? "From the official update" : "General guidance"}
              </span>
            </dt>
            <dd className="font-sans text-sm text-ink/85 leading-relaxed mt-0.5">
              {r.text}
              {r.links?.map((l) => (
                <span key={l.href}>
                  {" "}
                  <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${l.label} (opens in a new tab)`} className="underline underline-offset-2 hover:text-burnt-orange">
                    {l.label}
                  </a>
                </span>
              ))}
            </dd>
          </div>
        ))}
        <p className="font-sans text-xs text-ink-light">TravalBee does not assess how an update affects your own trip.</p>
      </dl>
    </details>
  );
}
