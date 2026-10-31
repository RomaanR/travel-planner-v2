import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { getSampleSummary } from "@/lib/sampleTrip";
import { getBriefing, getPulse } from "@/lib/news/query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Page() {
  // Real details for the hero's sample-itinerary card (falls back if the DB is down).
  const [sample, news, pulse] = await Promise.all([getSampleSummary(), getBriefing(3), getPulse()]);
  return <HomePage sample={sample} news={news} pulse={pulse} />;
}
