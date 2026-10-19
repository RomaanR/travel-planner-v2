import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { getSampleSummary } from "@/lib/sampleTrip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Page() {
  // Real details for the hero's sample-itinerary card (falls back if the DB is down).
  const sample = await getSampleSummary();
  return <HomePage sample={sample} />;
}
