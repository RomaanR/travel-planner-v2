import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import FadeIn from "@/components/news/FadeIn";
import NewsCard from "@/components/news/NewsCard";
import NewsNote from "@/components/news/NewsNote";
import SourceLink from "@/components/news/SourceLink";
import { NEWS_COUNTRIES, countryBySlug } from "@/lib/news/countries";
import { planHrefFor } from "@/lib/news/plan";
import { getAdvisory, getNews } from "@/lib/news/query";
import { formatNewsDate } from "@/lib/news/types";

// One static page per covered country, refreshed hourly and when the daily ingest runs.
export const revalidate = 3600;
export const dynamicParams = false;

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

  const [advisory, alerts, updates] = await Promise.all([
    getAdvisory(country.code),
    getNews({ countryCode: country.code, sinceDays: 14, limit: 20 }).then((all) => all.filter((i) => i.source === "gdacs")),
    getNews({ countryCode: country.code, limit: 30 }),
  ]);
  const latestFcdo = updates.find((i) => i.source === "fcdo");

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <section className="pt-32 pb-24 px-6 md:px-16 max-w-screen-xl mx-auto">
        <BackButton href="/news" label="ALL TRAVEL NEWS" />

        <FadeIn className="mb-12">
          <p className="micro-copy text-ink-light mb-4">Travel News</p>
          <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none mb-6">{country.name}</h1>
          <Link
            href={planHrefFor(country)}
            className="micro-copy inline-flex items-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
          >
            Plan a trip to {country.name} <ArrowRight size={13} strokeWidth={1.5} />
          </Link>
        </FadeIn>

        {/* At a glance */}
        <FadeIn delay={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10 border border-ink/10 mb-14">
          <div className="bg-paper p-6 md:p-8">
            <p className="micro-copy text-[10px] text-ink-light mb-3">US State Department advisory</p>
            {advisory ? (
              <>
                <p className="font-serif italic text-3xl text-ink leading-tight mb-1">
                  Level {advisory.level}: {LEVEL_NOTE[advisory.level]}
                </p>
                <p className="font-sans text-xs text-ink-light mb-4">
                  {advisory.label} &middot; updated {formatNewsDate(advisory.publishedAt)}
                </p>
                <SourceLink href={advisory.url} source="state">Read the full advisory</SourceLink>
              </>
            ) : (
              <p className="font-sans text-sm text-ink-light">Not available yet.</p>
            )}
          </div>
          <div className="bg-paper p-6 md:p-8">
            <p className="micro-copy text-[10px] text-ink-light mb-3">Latest UK travel advice update</p>
            {latestFcdo ? (
              <>
                <p className="font-serif italic text-2xl text-ink leading-tight mb-2 line-clamp-3">{latestFcdo.summary}</p>
                <p className="font-sans text-xs text-ink-light mb-4">{formatNewsDate(latestFcdo.publishedAt)}</p>
                <SourceLink href={latestFcdo.url} source="fcdo">Read the full advice</SourceLink>
              </>
            ) : (
              <p className="font-sans text-sm text-ink-light">Not available yet.</p>
            )}
          </div>
        </FadeIn>

        {alerts.length > 0 && (
          <FadeIn delay={0.15} className="mb-14">
            <p className="micro-copy text-burnt-orange mb-4">Active alerts &middot; last 14 days</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <p className="micro-copy text-ink mb-4">Recent updates</p>
          {updates.length === 0 ? (
            <div className="border border-ink/10 p-12 text-center">
              <p className="font-serif italic text-2xl text-ink-light">Nothing to report yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {updates.map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          )}
        </FadeIn>

        <NewsNote />
      </section>
    </main>
  );
}
