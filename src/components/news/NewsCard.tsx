import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import Flag from "./Flag";
import Implications from "./Implications";
import SourceLink from "./SourceLink";
import { countryPhoto } from "@/lib/news/countryPhotos";
import { DATE_LABEL, type NewsView, SOURCE_LABEL, TOPIC_LABEL, displayTitle, formatNewsDate, severityTag } from "@/lib/news/types";

// Red and orange are reserved for serious alerts; the card itself takes the alert's colour.
export const TONE: Record<string, string> = {
  quiet:  "border-ink/25 text-ink",
  orange: "border-orange-600 bg-orange-100 text-orange-900",
  red:    "border-red-700 bg-red-700 text-white",
};
const CARD: Record<string, string> = {
  quiet:  "border border-ink/10 border-l-4 border-l-ink/40 bg-white",
  orange: "border border-orange-500 border-l-[6px] bg-orange-50",
  red:    "border border-red-700 border-l-[6px] bg-red-50",
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
  const photo = variant === "history" ? null : countryPhoto(item.countryCode);
  const frame =
    variant === "alert" ? CARD[tag?.tone ?? "quiet"]
    : variant === "history" ? "border border-ink/10 bg-paper opacity-90"
    : "border border-ink/10 bg-paper";

  return (
    // Compact cards (home strip, history) fill their cell so rows line up; full cards keep their own
    // height so expanding one section does not stretch its neighbour.
    <article className={`${compact ? "h-full" : ""} flex flex-col gap-3 p-5 md:p-6 ${frame}`}>
      <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 micro-copy text-xs text-ink-light">
        <Link href={`/news/${item.countrySlug}`} className="text-ink hover:text-burnt-orange transition-colors py-1 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
          <Flag code={item.countryCode} />
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

      <h3 className={`font-serif italic font-bold text-ink leading-tight ${compact ? "text-xl md:text-[22px]" : "text-2xl"}`}>{displayTitle(item)}</h3>
      </div>

      {photo && (
        // A landmark that represents the country (decorative, so no alt text). Always full colour.
        <div className="relative shrink-0 w-20 h-20 md:w-28 md:h-28 overflow-hidden bg-ink/5">
          <Image src={photo} alt="" fill sizes="112px" className="object-cover" />
        </div>
      )}
      </div>
      <p className={`font-sans text-base text-ink/85 leading-relaxed ${compact ? "line-clamp-3" : ""}`}>{item.summary}</p>

      {item.alsoAffects && item.alsoAffects.length > 0 && (
        <p className="font-sans text-sm text-ink-light">
          Also affecting:{" "}
          {item.alsoAffects.slice(0, 6).map((o, i) => (
            <span key={o.slug}>
              {i > 0 && ", "}
              <Link href={`/news/${o.slug}`} className="underline underline-offset-2 hover:text-burnt-orange">{o.name}</Link>
            </span>
          ))}
          {item.alsoAffects.length > 6 && <span> and {item.alsoAffects.length - 6} more</span>}
        </p>
      )}

      {variant !== "history" && !compact && <Implications item={item} />}

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
