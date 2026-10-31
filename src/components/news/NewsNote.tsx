import { NEWS_ATTRIBUTION, NEWS_DISCLAIMER } from "@/lib/news/types";

/** Attribution (required by the Open Government Licence) and the "check the source" notice. */
export default function NewsNote() {
  return (
    <div className="mt-14 border-t border-ink/10 pt-6 max-w-3xl">
      <h2 className="micro-copy text-xs text-ink mb-2">About this page</h2>
      <p className="font-sans text-sm text-ink/85 leading-relaxed">{NEWS_DISCLAIMER}</p>
      <p className="font-sans text-sm text-ink-light leading-relaxed mt-2">{NEWS_ATTRIBUTION}</p>
    </div>
  );
}
