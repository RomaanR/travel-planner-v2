import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import SourceLink from "./SourceLink";
import { DATE_LABEL, type NewsView, SOURCE_LABEL, TOPIC_LABEL, formatNewsDate, severityTag } from "@/lib/news/types";

const TONE: Record<string, string> = {
  quiet: "border-ink/25 text-ink",
  warn:  "border-burnt-orange text-burnt-orange",
  alert: "border-burnt-orange bg-burnt-orange text-white",
};

type Props = {
  item:       NewsView;
  compact?:   boolean;
  /** "alert" gives a current, serious item more weight; "history" quietens it. */
  variant?:   "alert" | "regular" | "history";
  /** ISO time of our last successful check of this item's source. */
  checkedAt?: string;
};

/** One official update. Plain text only — nothing from a feed is rendered as HTML. */
export default function NewsCard({ item, compact = false, variant = "regular", checkedAt }: Props) {
  const tag = severityTag(item);
  const topics = item.topics.map((t) => TOPIC_LABEL[t]).filter(Boolean);
  const source = SOURCE_LABEL[item.source];
  const frame =
    variant === "alert" ? "border border-ink/10 border-l-4 border-l-burnt-orange bg-white"
    : variant === "history" ? "border border-ink/10 bg-paper opacity-90"
    : "border border-ink/10 bg-paper";

  return (
    <article className={`h-full flex flex-col gap-3 p-5 md:p-6 ${frame}`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 micro-copy text-xs text-ink-light">
        <Link href={`/news/${item.countrySlug}`} className="text-ink hover:text-burnt-orange transition-colors py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
          {item.countryName}
        </Link>
        <span aria-hidden>&middot;</span>
        <span>{source}</span>
        {topics.slice(0, 2).map((t) => (
          <span key={t} className="inline-flex items-center gap-2.5">
            <span aria-hidden>&middot;</span>{t}
          </span>
        ))}
      </div>

      {tag && (
        <p className={`self-start inline-flex items-center gap-2 border px-2.5 py-1 micro-copy text-xs ${TONE[tag.tone]}`}>
          {tag.tone === "quiet" ? <Info size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}
          <span><span className="sr-only">{tag.authority}: </span>{tag.label}</span>
        </p>
      )}

      <h3 className={`font-serif italic text-ink leading-tight ${compact ? "text-xl md:text-[22px]" : "text-2xl"}`}>{item.title}</h3>
      <p className={`font-sans text-base text-ink/85 leading-relaxed ${compact ? "line-clamp-3" : ""}`}>{item.summary}</p>

      {item.alsoAffects && item.alsoAffects.length > 0 && (
        <p className="font-sans text-sm text-ink-light">
          Also affecting:{" "}
          {item.alsoAffects.map((o, i) => (
            <span key={o.slug}>
              {i > 0 && ", "}
              <Link href={`/news/${o.slug}`} className="underline underline-offset-2 hover:text-burnt-orange">{o.name}</Link>
            </span>
          ))}
        </p>
      )}

      <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="font-sans text-sm text-ink-light">
          {DATE_LABEL[item.source]} <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
          {checkedAt && !compact && (
            <> &middot; Checked <time dateTime={checkedAt}>{formatNewsDate(checkedAt)}</time></>
          )}
        </p>
        <SourceLink href={item.url} source={item.source} label={`Read the official ${source} update for ${item.countryName}`}>
          Read official update
        </SourceLink>
      </div>
    </article>
  );
}
