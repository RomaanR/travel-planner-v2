import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact the TravalBee team. Send us a message and we will reply by email.",
  alternates: { canonical: "/support" },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
