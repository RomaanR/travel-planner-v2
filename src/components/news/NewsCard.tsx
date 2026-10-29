import Link from "next/link";
import SourceLink from "./SourceLink";
import { type NewsView, SOURCE_LABEL, TOPIC_LABEL, formatNewsDate, severityTag } from "@/lib/news/types";

const TONE: Record<string, string> = {
  quiet: "border-ink/20 text-ink-light",
  warn:  "border-burnt-orange text-burnt-orange",
  alert: "border-burnt-orange bg-burnt-orange text-white",
};

/** One official update. Plain text only — nothing from a feed is rendered as HTML. */
export default function NewsCard({ item, compact = false }: { item: NewsView; compact?: boolean }) {
  const tag = severityTag(item);
  const topics = item.topics.map((t) => TOPIC_LABEL[t]).filter(Boolean);

  return (
    <article className="h-full flex flex-col gap-3 border border-ink/10 bg-paper p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 micro-copy text-[10px] text-ink-light">
        <Link href={`/news/${item.countrySlug}`} className="text-ink hover:text-burnt-orange transition-colors">
          {item.countryName}
        </Link>
        <span aria-hidden>&middot;</span>
        <span>{SOURCE_LABEL[item.source]}</span>
        {topics.slice(0, 2).map((t) => (
          <span key={t} className="inline-flex items-center gap-2.5">
            <span aria-hidden>&middot;</span>{t}
          </span>
        ))}
      </div>

      {tag && (
        <span className={`self-start border px-2 py-0.5 micro-copy text-[9px] ${TONE[tag.tone]}`}>{tag.label}</span>
      )}

      <h3 className={`font-serif italic text-ink leading-tight ${compact ? "text-xl" : "text-xl md:text-2xl"}`}>{item.title}</h3>
      <p className={`font-sans text-sm text-ink-light leading-relaxed ${compact ? "line-clamp-3" : ""}`}>{item.summary}</p>

      <div className="mt-auto pt-2 flex items-center justify-between gap-4">
        <time dateTime={item.publishedAt} className="micro-copy text-[10px] text-ink-light">{formatNewsDate(item.publishedAt)}</time>
        <SourceLink href={item.url} source={item.source}>Read at source</SourceLink>
      </div>
    </article>
  );
}
