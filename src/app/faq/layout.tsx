import type { Metadata } from "next";
import { FAQS } from "@/content/faqs";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about how TravalBee works: creating itineraries, saving and sharing them, travel news and advisories, pricing, privacy and refunds.",
  alternates: { canonical: "/faq" },
};

/** Safe to embed in a <script> tag: "<" cannot close the tag. */
function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const plain = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.flatMap((s) => s.items).map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: plain(i.a) },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
      {children}
    </>
  );
}
