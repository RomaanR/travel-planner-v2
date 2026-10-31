import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import CardColumns from "@/components/news/CardColumns";
import FadeIn from "@/components/news/FadeIn";
import AdvisoryMap from "@/components/news/AdvisoryMap";
import DestinationFilter from "@/components/news/DestinationFilter";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import { ALL_COUNTRIES, NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { getCountryPulse, getFeedChecks, getNewsResult } from "@/lib/news/query";
import { getWorldMap } from "@/lib/news/world";
import { TOPIC_GROUPS, splitNews, topicGroupFor } from "@/lib/news/types";

export const metadata: Metadata = {
  title: "Travel News — advisories, entry rules & alerts",
  description: "Official travel advisories, entry requirement changes and disaster alerts for the destinations TravalBee covers, updated daily.",
  alternates: { canonical: "/news" },
};

// Reads ?topic= (and redirects old ?country= links), so this page renders per request.
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

type Params = { country?: string; topic?: string };

export default async function NewsPage({ searchParams }: { searchParams: Params }) {
  // Older links filtered this page by country; a country now has its own page.
  const legacyCountry = searchParams.country ? countryBySlug(searchParams.country) : undefined;
  if (legacyCountry) redirect(`/news/${legacyCountry.slug}`);

  const topic = topicGroupFor(searchParams.topic);

  const [{ items, failed }, pulse, checks, worldMap] = await Promise.all([
    getNewsResult({ topic, limit: 100 }),
    getCountryPulse(),
    getFeedChecks(),
    getWorldMap(),
  ]);
  // This page is about alerts: routine level notes live on each country's page and on the map.
  // History keeps only alerts that have expired.
  const { alerts, history: allHistory } = splitNews(items);
  const history = allHistory.filter((i) => i.severity >= 3);

  const href = (topicKey?: string) => (topicKey ? `/news?topic=${topicKey}` : "/news");

  const chips = NEWS_COUNTRIES.map((c) => ({
    code: c.code, name: c.name, href: `/news/${c.slug}`, alert: pulse[c.code] >= 3,
  }));

  const searchCountries = ALL_COUNTRIES.map((c) => ({ code: c.code, name: c.name, slug: c.slug }));

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
          <DestinationFilter chips={chips} countries={searchCountries} />
        </FadeIn>

        <FadeIn delay={0.15} className="mb-10">
          <p id="topic-label" className="micro-copy text-xs text-ink-light mb-3">Topic</p>
          <div role="group" aria-labelledby="topic-label" className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-2 md:pb-0 snap-x">
            <Link href={href()} scroll={false} className={`${chip(!topic)} snap-start`}>All topics</Link>
            {TOPIC_GROUPS.map((g) => (
              <Link key={g.key} href={href(g.key)} scroll={false} className={`${chip(topic === g.key)} snap-start`}>{g.label}</Link>
            ))}
          </div>
        </FadeIn>

        {failed ? (
          <FadeIn className="border border-ink/15 bg-white p-8" >
            <div role="alert">
              <p className="font-serif italic text-2xl text-ink mb-2">We couldn&apos;t load the latest alerts.</p>
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
        ) : alerts.length === 0 && history.length === 0 ? (
          <FadeIn className="border border-ink/10 p-12 text-center">
            <p className="font-serif italic text-2xl text-ink mb-2">No current alerts.</p>
            <p className="font-sans text-base text-ink-light mb-4">
              {topic ? "Try another topic." : "Search a country above, or tap it on the map, for its advisory level."}
            </p>
            {topic && (
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

            {history.length > 0 && (
              <FadeIn delay={0.3}>
                <details className="group border-t border-ink/10 pt-6">
                  <summary className="cursor-pointer list-none font-sans font-bold uppercase tracking-widest text-sm text-ink min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
                    Expired alerts ({history.length})
                    <span className="ml-3 text-ink-light group-open:hidden" aria-hidden>+</span>
                    <span className="ml-3 text-ink-light hidden group-open:inline" aria-hidden>&minus;</span>
                  </summary>
                  <p className="font-sans text-sm text-ink-light mt-2 mb-5">Kept for reference only. These alerts are no longer current.</p>
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
