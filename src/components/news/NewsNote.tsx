import { NEWS_ATTRIBUTION, NEWS_DISCLAIMER } from "@/lib/news/types";

/** Attribution (required by the Open Government Licence) and the "check the source" notice. */
export default function NewsNote() {
  return (
    <div className="mt-14 border-t border-ink/10 pt-6 max-w-3xl">
      <p className="micro-copy text-[10px] text-ink-light mb-2">About this page</p>
      <p className="font-sans text-xs text-ink-light leading-relaxed">{NEWS_DISCLAIMER}</p>
      <p className="font-sans text-xs text-ink-light/80 leading-relaxed mt-2">{NEWS_ATTRIBUTION}</p>
    </div>
  );
}
