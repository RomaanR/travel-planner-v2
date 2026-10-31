import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FadeIn from "@/components/news/FadeIn";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import { NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { getCountryPulse, getFeedChecks, getNews } from "@/lib/news/query";
import { TOPICS, TOPIC_LABEL, splitNews } from "@/lib/news/types";

export const metadata: Metadata = {
  title: "Travel News — advisories, entry rules & alerts",
  description: "Official travel advisories, entry requirement changes and disaster alerts for the destinations TravalBee covers, updated daily.",
  alternates: { canonical: "/news" },
};

// Reads ?country= and ?topic=, so this page renders per request.
export const dynamic = "force-dynamic";

const chip = (active: boolean) =>
  `micro-copy text-xs px-4 min-h-[44px] inline-flex items-center border transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange ${
    active ? "bg-ink text-paper border-ink" : "border-ink/25 text-ink hover:border-ink"
  }`;

export default async function NewsPage({ searchParams }: { searchParams: { country?: string; topic?: string } }) {
  const country = searchParams.country ? countryBySlug(searchParams.country) : undefined;
  const topic = TOPICS.find((t) => t === searchParams.topic);

  const [items, pulse, checks] = await Promise.all([
    getNews({ countryCode: country?.code, topic, limit: 100 }),
    getCountryPulse(),
    getFeedChecks(),
  ]);
  const { alerts, latest, history } = splitNews(items);

  const href = (c?: string, t?: string) => {
    const q = new URLSearchParams();
    if (c) q.set("country", c);
    if (t) q.set("topic", t);
    const s = q.toString();
    return s ? `/news?${s}` : "/news";
  };

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <section className="pt-32 pb-24 px-6 md:px-16 max-w-screen-xl mx-auto">
        <FadeIn className="mb-10">
          <p className="micro-copy text-xs text-ink-light mb-4">Travel News</p>
          <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none mb-5">
            Know before you go.
          </h1>
          <p className="font-sans text-base md:text-lg text-ink/85 max-w-2xl leading-relaxed">
            Official travel advisories, entry-requirement changes and weather and disaster alerts for the destinations we cover, collected from government sources and checked daily.
          </p>
        </FadeIn>

        {/* Country filter — a dot marks destinations with a serious recent alert */}
        <FadeIn delay={0.1} className="mb-4">
          <p id="dest-label" className="micro-copy text-xs text-ink-light mb-3">Destination</p>
          <div role="group" aria-labelledby="dest-label" className="flex flex-wrap gap-2">
            <Link href={href(undefined, topic)} className={chip(!country)}>All</Link>
            {NEWS_COUNTRIES.map((c) => (
              <Link key={c.code} href={href(c.slug, topic)} className={`${chip(country?.code === c.code)} inline-flex items-center gap-2`}>
                {c.name}
                {pulse[c.code] >= 3 && (
                  <>
                    <span className="w-2 h-2 bg-burnt-orange" aria-hidden />
                    <span className="sr-only">has a current alert</span>
                  </>
                )}
              </Link>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.15} className="mb-10">
          <p id="topic-label" className="micro-copy text-xs text-ink-light mb-3">Topic</p>
          <div role="group" aria-labelledby="topic-label" className="flex flex-wrap gap-2">
            <Link href={href(country?.slug)} className={chip(!topic)}>All topics</Link>
            {TOPICS.map((t) => (
              <Link key={t} href={href(country?.slug, t)} className={chip(topic === t)}>{TOPIC_LABEL[t]}</Link>
            ))}
          </div>
        </FadeIn>

        {items.length === 0 ? (
          <FadeIn className="border border-ink/10 p-12 text-center">
            <p className="font-serif italic text-2xl text-ink mb-2">Nothing to report here.</p>
            <p className="font-sans text-base text-ink-light">
              {country || topic ? "Try another destination or topic." : "Updates will appear after the next daily check."}
            </p>
          </FadeIn>
        ) : (
          <>
            {alerts.length > 0 && (
              <FadeIn delay={0.2} className="mb-14">
                <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-burnt-orange mb-2">Current alerts</h2>
                <p className="font-sans text-sm text-ink-light mb-5">Serious warnings that are still active. Older alerts move to history.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map((item) => <NewsCard key={item.id} item={item} variant="alert" checkedAt={checks[item.source]} />)}
                </div>
              </FadeIn>
            )}

            {latest.length > 0 && (
              <FadeIn delay={0.25} className="mb-14">
                <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-ink mb-5">Latest updates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latest.map((item) => <NewsCard key={item.id} item={item} checkedAt={checks[item.source]} />)}
                </div>
              </FadeIn>
            )}

            {history.length > 0 && (
              <FadeIn delay={0.3}>
                <details className="group border-t border-ink/10 pt-6">
                  <summary className="cursor-pointer list-none font-sans font-bold uppercase tracking-widest text-sm text-ink min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
                    Earlier updates and expired alerts ({history.length})
                    <span className="ml-3 text-ink-light group-open:hidden" aria-hidden>+</span>
                    <span className="ml-3 text-ink-light hidden group-open:inline" aria-hidden>&minus;</span>
                  </summary>
                  <p className="font-sans text-sm text-ink-light mt-2 mb-5">Kept for reference only. These are no longer current.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((item) => <NewsCard key={item.id} item={item} variant="history" compact />)}
                  </div>
                </details>
              </FadeIn>
            )}
          </>
        )}

        <NewsNote />
      </section>
    </main>
  );
}
