import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import CardColumns from "@/components/news/CardColumns";
import FadeIn from "@/components/news/FadeIn";
import AdvisoryMap from "@/components/news/AdvisoryMap";
import DestinationFilter from "@/components/news/DestinationFilter";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import { NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { getCountryPulse, getFeedChecks, getNewsResult } from "@/lib/news/query";
import { getWorldMap } from "@/lib/news/world";
import { SORTS, TOPIC_GROUPS, type Sort, splitNews, topicGroupFor } from "@/lib/news/types";

export const metadata: Metadata = {
  title: "Travel News — advisories, entry rules & alerts",
  description: "Official travel advisories, entry requirement changes and disaster alerts for the destinations TravalBee covers, updated daily.",
  alternates: { canonical: "/news" },
};

// Reads ?country=, ?topic= and ?sort=, so this page renders per request.
export const dynamic = "force-dynamic";

const chip = (active: boolean) =>
  `micro-copy text-xs px-4 min-h-[44px] shrink-0 inline-flex items-center border transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange ${
    active ? "bg-ink text-paper border-ink" : "border-ink/25 text-ink hover:border-ink"
  }`;

// Where to go when our own data cannot load.
const OFFICIAL = [
  { label: "UK FCDO travel advice", href: "https://www.gov.uk/foreign-travel-advice" },
  { label: "US State Department advisories", href: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/" },
  { label: "GDACS disaster alerts", href: "https://www.gdacs.org/" },
];

type Params = { country?: string; topic?: string; sort?: string };

export default async function NewsPage({ searchParams }: { searchParams: Params }) {
  const country = searchParams.country ? countryBySlug(searchParams.country) : undefined;
  const topic = topicGroupFor(searchParams.topic);
  const sort: Sort = SORTS.find((s) => s === searchParams.sort) ?? "newest";

  const [{ items, failed }, pulse, checks, worldMap] = await Promise.all([
    getNewsResult({ countryCode: country?.code, topic, limit: 100 }),
    getCountryPulse(),
    getFeedChecks(),
    getWorldMap(),
  ]);
  const { alerts, latest: newest, history } = splitNews(items);
  // "Most serious first" reorders regular updates; the default is newest first.
  const latest = sort === "serious"
    ? [...newest].sort((a, b) => b.severity - a.severity || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    : newest;

  const href = (o: { country?: string; topic?: string; sort?: string }) => {
    const q = new URLSearchParams();
    const c = "country" in o ? o.country : country?.slug;
    const t = "topic" in o ? o.topic : topic;
    const s = "sort" in o ? o.sort : sort;
    if (c) q.set("country", c);
    if (t) q.set("topic", t);
    if (s && s !== "newest") q.set("sort", s);
    const str = q.toString();
    return str ? `/news?${str}` : "/news";
  };

  const chips = NEWS_COUNTRIES.map((c) => ({
    code: c.code, name: c.name, href: href({ country: c.slug }), active: country?.code === c.code, alert: pulse[c.code] >= 3,
  }));

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
          {alerts.length > 0 && (
            <a
              href="#alerts"
              className="mt-5 micro-copy text-xs inline-flex items-center gap-2 min-h-[44px] text-burnt-orange hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange"
            >
              <ArrowDown size={14} aria-hidden />
              {alerts.length} current {alerts.length === 1 ? "alert" : "alerts"}
            </a>
          )}
        </FadeIn>

        <FadeIn delay={0.05}>
          <AdvisoryMap countries={worldMap} />
        </FadeIn>

        <FadeIn delay={0.1} className="mb-6">
          <DestinationFilter chips={chips} allHref={href({ country: undefined })} allActive={!country} />
        </FadeIn>

        <FadeIn delay={0.15} className="mb-6">
          <p id="topic-label" className="micro-copy text-xs text-ink-light mb-3">Topic</p>
          <div role="group" aria-labelledby="topic-label" className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-2 md:pb-0 snap-x">
            <Link href={href({ topic: undefined })} scroll={false} className={`${chip(!topic)} snap-start`}>All updates</Link>
            {TOPIC_GROUPS.map((g) => (
              <Link key={g.key} href={href({ topic: g.key })} scroll={false} className={`${chip(topic === g.key)} snap-start`}>{g.label}</Link>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-10 flex flex-wrap items-center gap-3">
          <span id="sort-label" className="micro-copy text-xs text-ink-light">Sort updates</span>
          <div role="group" aria-labelledby="sort-label" className="flex gap-2">
            <Link href={href({ sort: "newest" })} scroll={false} className={chip(sort === "newest")}>Newest</Link>
            <Link href={href({ sort: "serious" })} scroll={false} className={chip(sort === "serious")}>Most serious first</Link>
          </div>
        </FadeIn>

        {failed ? (
          <FadeIn className="border border-ink/15 bg-white p-8" >
            <div role="alert">
              <p className="font-serif italic text-2xl text-ink mb-2">We couldn&apos;t load the latest updates.</p>
              <p className="font-sans text-base text-ink/85 mb-4 max-w-xl">
                Please try again in a moment. In the meantime, check the official sources directly before you travel:
              </p>
              <ul className="font-sans text-base space-y-1">
                {OFFICIAL.map((o) => (
                  <li key={o.href}>
                    <a href={o.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-burnt-orange">{o.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        ) : items.length === 0 ? (
          <FadeIn className="border border-ink/10 p-12 text-center">
            <p className="font-serif italic text-2xl text-ink mb-2">Nothing to report here.</p>
            <p className="font-sans text-base text-ink-light mb-4">
              {country || topic ? "Try another destination or topic." : "Updates will appear after the next daily check."}
            </p>
            {(country || topic) && (
              <Link href="/news" scroll={false} className="micro-copy text-xs underline underline-offset-4 hover:text-burnt-orange">Clear filters</Link>
            )}
          </FadeIn>
        ) : (
          <>
            {alerts.length > 0 && (
              <FadeIn delay={0.2} className="mb-14">
                <h2 id="alerts" className="scroll-mt-28 font-sans font-bold uppercase tracking-widest text-sm text-burnt-orange mb-2">Current alerts</h2>
                <p className="font-sans text-sm text-ink-light mb-5">Serious warnings that are still active. Older alerts move to history.</p>
                <CardColumns>
                  {alerts.map((item) => <NewsCard key={item.id} item={item} variant="alert" checkedAt={checks[item.source]} />)}
                </CardColumns>
              </FadeIn>
            )}

            {latest.length > 0 && (
              <FadeIn delay={0.25} className="mb-14">
                <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-ink mb-5">Latest updates</h2>
                <CardColumns>
                  {latest.map((item) => <NewsCard key={item.id} item={item} checkedAt={checks[item.source]} />)}
                </CardColumns>
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
                  <CardColumns>
                    {history.map((item) => <NewsCard key={item.id} item={item} variant="history" compact />)}
                  </CardColumns>
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
