import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Plans for TravalBee, the luxury itinerary planner. Start free; Premium adds longer trips and more itineraries each month.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
