import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FadeIn from "@/components/news/FadeIn";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import { NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { getCountryPulse, getNews } from "@/lib/news/query";
import { TOPICS, TOPIC_LABEL } from "@/lib/news/types";

export const metadata: Metadata = {
  title: "Travel News — advisories, entry rules & alerts",
  description: "Official travel advisories, entry requirement changes and disaster alerts for the destinations TravalBee covers, updated daily.",
  alternates: { canonical: "/news" },
};

// Reads ?country= and ?topic=, so this page renders per request.
export const dynamic = "force-dynamic";

const chip = (active: boolean) =>
  `micro-copy text-[10px] px-3.5 py-2 border transition-colors duration-300 ${
    active ? "bg-ink text-paper border-ink" : "border-ink/15 text-ink-light hover:border-ink hover:text-ink"
  }`;

export default async function NewsPage({ searchParams }: { searchParams: { country?: string; topic?: string } }) {
  const country = searchParams.country ? countryBySlug(searchParams.country) : undefined;
  const topic = TOPICS.find((t) => t === searchParams.topic);

  const [items, pulse] = await Promise.all([
    getNews({ countryCode: country?.code, topic, limit: 60 }),
    getCountryPulse(),
  ]);

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
        <FadeIn className="mb-12">
          <p className="micro-copy text-ink-light mb-4">Travel News</p>
          <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none mb-5">
            What&apos;s changing<br />for travellers.
          </h1>
          <p className="font-sans text-sm md:text-base text-ink-light max-w-xl leading-relaxed">
            Official advisories, entry-requirement updates and disaster alerts for the destinations we cover, gathered from government sources and updated daily.
          </p>
        </FadeIn>

        {/* Country filter — a dot marks destinations with a serious recent alert */}
        <FadeIn delay={0.1} className="mb-4">
          <p className="micro-copy text-[10px] text-ink-light mb-3">Destination</p>
          <div className="flex flex-wrap gap-2">
            <Link href={href(undefined, topic)} className={chip(!country)}>All</Link>
            {NEWS_COUNTRIES.map((c) => (
              <Link key={c.code} href={href(c.slug, topic)} className={`${chip(country?.code === c.code)} inline-flex items-center gap-2`}>
                {c.name}
                {pulse[c.code] >= 3 && <span aria-label="Serious recent alert" className="w-1.5 h-1.5 bg-burnt-orange" />}
              </Link>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.15} className="mb-10">
          <p className="micro-copy text-[10px] text-ink-light mb-3">Topic</p>
          <div className="flex flex-wrap gap-2">
            <Link href={href(country?.slug)} className={chip(!topic)}>All topics</Link>
            {TOPICS.map((t) => (
              <Link key={t} href={href(country?.slug, t)} className={chip(topic === t)}>{TOPIC_LABEL[t]}</Link>
            ))}
          </div>
        </FadeIn>

        {items.length === 0 ? (
          <FadeIn className="border border-ink/10 p-12 text-center">
            <p className="font-serif italic text-2xl text-ink-light mb-2">Nothing to report here.</p>
            <p className="micro-copy text-[10px] text-ink-light">
              {country || topic ? "Try another destination or topic." : "Updates will appear after the next daily check."}
            </p>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => <NewsCard key={item.id} item={item} />)}
          </FadeIn>
        )}

        <NewsNote />
      </section>
    </main>
  );
}
