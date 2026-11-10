import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import CardColumns from "@/components/news/CardColumns";
import FadeIn from "@/components/news/FadeIn";
import Flag from "@/components/news/Flag";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import SiteFooter from "@/components/SiteFooter";
import SourceLink from "@/components/news/SourceLink";
import { NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { planHrefFor } from "@/lib/news/plan";
import { getAdvisory, getFeedChecks, getLevelChanges, getNews } from "@/lib/news/query";
import { formatNewsDate, splitNews } from "@/lib/news/types";

// The popular countries are pre-built; every other country is rendered on first visit and then
// cached, refreshed hourly (and when the daily ingest runs for the popular ones).
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return NEWS_COUNTRIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const country = countryBySlug(params.slug);
  if (!country) return { title: "Travel News" };
  return {
    title: `${country.name} travel news & advisories`,
    description: `Latest official travel advisories, entry requirement updates and disaster alerts for ${country.name}, gathered from government sources.`,
    alternates: { canonical: `/news/${country.slug}` },
  };
}

const LEVEL_NOTE: Record<number, string> = {
  1: "Normal precautions", 2: "Increased caution", 3: "Reconsider travel", 4: "Do not travel",
};

export default async function CountryNewsPage({ params }: { params: { slug: string } }) {
  const country = countryBySlug(params.slug);
  if (!country) notFound();

  const [advisory, canada, all, checks, changes] = await Promise.all([
    getAdvisory(country.code),
    getAdvisory(country.code, "canada"),
    getNews({ countryCode: country.code, limit: 60 }),
    getFeedChecks(),
    getLevelChanges(country.code),
  ]);
  const { alerts, latest: updates, history } = splitNews(all);
  const latestFcdo = all.find((i) => i.source === "fcdo" && !i.superseded);

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://travalbee.com";
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TravalBee", item: origin },
      { "@type": "ListItem", position: 2, name: "Travel News", item: `${origin}/news` },
      { "@type": "ListItem", position: 3, name: country.name, item: `${origin}/news/${country.slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
      <Navbar />
      <section className="pt-32 pb-24 px-6 md:px-16 max-w-screen-xl mx-auto">
        <BackButton href="/news" label="ALL TRAVEL NEWS" />

        <FadeIn className="mb-12">
          <p className="micro-copy text-ink-light mb-4">Travel News</p>
          <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none mb-6 flex items-center gap-4"><Flag code={country.code} className="!w-10 !h-7 md:!w-14 md:!h-10" />{country.name}</h1>
          {/* No sales button for a country the US advises against travelling to at all. */}
          {advisory?.level !== 4 && (
            <Link
              href={planHrefFor(country)}
              className="micro-copy inline-flex items-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
            >
              Plan a trip to {country.name} <ArrowRight size={13} strokeWidth={1.5} />
            </Link>
          )}
        </FadeIn>

        {/* At a glance */}
        <FadeIn delay={0.1} className={`grid grid-cols-1 ${country.fcdoSlug && canada ? "md:grid-cols-3" : country.fcdoSlug || canada ? "md:grid-cols-2" : ""} gap-px bg-ink/10 border border-ink/10 mb-14`}>
          <div className="bg-paper p-6 md:p-8">
            <h2 className="micro-copy text-xs text-ink-light mb-3">US State Department advisory</h2>
            {advisory ? (
              <>
                <p className="font-serif italic text-3xl text-ink leading-tight mb-1">
                  Level {advisory.level}: {LEVEL_NOTE[advisory.level]}
                </p>
                <p className="font-sans text-sm text-ink-light mb-4">
                  {advisory.label} &middot; published {formatNewsDate(advisory.publishedAt)}{checks.state ? <> &middot; checked {formatNewsDate(checks.state)}</> : null}
                </p>
                <SourceLink href={advisory.url} source="state">Read the full advisory</SourceLink>
              </>
            ) : (
              <p className="font-sans text-sm text-ink-light">Not available yet.</p>
            )}
          </div>
          {country.fcdoSlug && (
          <div className="bg-paper p-6 md:p-8">
            <h2 className="micro-copy text-xs text-ink-light mb-3">Latest UK travel advice update</h2>
            {latestFcdo ? (
              <>
                <p className="font-serif italic text-2xl text-ink leading-tight mb-2 line-clamp-3">{latestFcdo.summary}</p>
                <p className="font-sans text-sm text-ink-light mb-4">Updated {formatNewsDate(latestFcdo.publishedAt)}{checks.fcdo ? <> &middot; Checked {formatNewsDate(checks.fcdo)}</> : null}</p>
                <SourceLink href={latestFcdo.url} source="fcdo">Read the full advice</SourceLink>
              </>
            ) : (
              <p className="font-sans text-sm text-ink-light">Not available yet.</p>
            )}
          </div>
          )}
          {canada && (
          <div className="bg-paper p-6 md:p-8">
            <h2 className="micro-copy text-xs text-ink-light mb-3">Canada&apos;s travel advice</h2>
            <p className="font-serif italic text-3xl text-ink leading-tight mb-1">{canada.label.split(" \u00b7 ")[0]}</p>
            <p className="font-sans text-sm text-ink-light mb-4">
              {canada.label.includes(" \u00b7 ") ? <>{canada.label.split(" \u00b7 ").slice(1).join(" \u00b7 ")} &middot; </> : null}
              published {formatNewsDate(canada.publishedAt)}{checks.canada ? <> &middot; checked {formatNewsDate(checks.canada)}</> : null}
            </p>
            <SourceLink href={canada.url} source="canada">Read the full advice</SourceLink>
          </div>
          )}
        </FadeIn>

        {alerts.length > 0 && (
          <FadeIn delay={0.15} className="mb-14">
            <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-burnt-orange mb-5">Current alerts</h2>
            <CardColumns>
              {alerts.map((item) => <NewsCard key={item.id} item={item} variant="alert" checkedAt={checks[item.source]} />)}
            </CardColumns>
          </FadeIn>
        )}

        {changes.length > 0 && (
          <FadeIn delay={0.18} className="mb-14">
            <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-ink mb-4">US level history</h2>
            <ul className="border border-ink/10 bg-white divide-y divide-ink/10 max-w-2xl">
              {changes.map((c) => (
                <li key={c.changedAt + c.to} className="px-5 py-3 font-sans text-base text-ink/85">
                  <time dateTime={c.changedAt} className="text-ink-light mr-3">{formatNewsDate(c.changedAt)}</time>
                  {c.to > c.from ? "Raised" : "Lowered"} from Level {c.from} to Level {c.to}
                </li>
              ))}
            </ul>
          </FadeIn>
        )}

        {alerts.length === 0 && (
          <FadeIn delay={0.2} className="mb-14">
            <p className="font-sans text-base text-ink/85 max-w-2xl">
              No current disaster alerts for {country.name}.
            </p>
          </FadeIn>
        )}

        {updates.length > 0 && (
        <FadeIn delay={0.2}>
          <h2 className="font-sans font-bold uppercase tracking-widest text-sm text-ink mb-5">Latest updates</h2>
          {updates.length === 0 && alerts.length === 0 ? (
            <div className="border border-ink/10 p-12 text-center">
              <p className="font-serif italic text-2xl text-ink-light">Nothing to report yet.</p>
            </div>
          ) : (
            <CardColumns>
              {updates.map((item) => <NewsCard key={item.id} item={item} checkedAt={checks[item.source]} />)}
            </CardColumns>
          )}
        </FadeIn>
        )}

        {history.length > 0 && (
          <FadeIn delay={0.25} className="mt-14">
            <details className="group border-t border-ink/10 pt-6">
              <summary className="cursor-pointer list-none font-sans font-bold uppercase tracking-widest text-sm text-ink min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange">
                Earlier updates and expired alerts ({history.length})
              </summary>
              <p className="font-sans text-sm text-ink-light mt-2 mb-5">Kept for reference only. These are no longer current.</p>
              <CardColumns>
                {history.map((item) => <NewsCard key={item.id} item={item} variant="history" compact />)}
              </CardColumns>
            </details>
          </FadeIn>
        )}

        <NewsNote />
      </section>
    <SiteFooter />
    </main>
  );
}
