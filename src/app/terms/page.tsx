import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" label="HOME" />
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Terms of Service
          </h1>
          <div className="w-12 h-px bg-burnt-orange mb-10" />

          <div className="space-y-8 font-sans text-sm text-ink-light leading-relaxed">
            <p>
              <strong className="text-ink">Last updated:</strong>{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <p>
              Please read these Terms of Service carefully before using
              TravalBee. By accessing or using the Service, you agree to be
              bound by these Terms.
            </p>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using TravalBee (&quot;the Service&quot;),
                you agree to be bound by these Terms of Service. If you do not
                agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. Description of Service &amp; AI Disclaimer
              </h2>
              <p className="mb-3">
                TravalBee generates personalised travel itineraries based on
                your preferences. The Service utilises third-party artificial
                intelligence (&quot;AI&quot;), specifically Anthropic&apos;s
                Claude, to produce these itineraries.
              </p>
              <p className="mb-3">
                <strong className="text-ink">
                  Important: AI outputs may be unpredictable, incomplete, or
                  inaccurate.
                </strong>{" "}
                AI-generated content may suggest venues, restaurants, or
                attractions that are closed, non-existent, or misrepresented.
                All itineraries are curated suggestions only and must be
                independently verified before making any travel arrangements,
                bookings, or commitments.
              </p>
              <p>
                <strong className="text-ink">
                  You assume all risk for relying on AI-generated content.
                </strong>{" "}
                TravalBee does not guarantee the accuracy, availability,
                safety, or suitability of any recommended venue, restaurant,
                accommodation, or activity.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. User Accounts
              </h2>
              <p>
                You may create an account to save and manage itineraries. You
                are responsible for maintaining the confidentiality of your
                account credentials and for all activity that occurs under your
                account. You must be at least 16 years old (or 13 outside the
                EEA) to use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Acceptable Use
              </h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>
                  Attempt to circumvent rate limits, security measures, or
                  access controls
                </li>
                <li>Scrape, crawl, or automate access to the Service</li>
                <li>
                  Resell or redistribute generated itineraries commercially
                  without prior written permission
                </li>
                <li>
                  Submit inputs designed to generate content that is illegal,
                  violent, hateful, sexually explicit, or otherwise in
                  violation of the usage policies of our AI providers
                  (including{" "}
                  <a
                    href="https://www.anthropic.com/legal/aup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-accent hover:text-ink transition-colors"
                  >
                    Anthropic&apos;s Acceptable Use Policy
                  </a>
                  )
                </li>
                <li>
                  Use the Service in any manner that could damage, disable,
                  overburden, or impair our infrastructure
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Affiliate Links
              </h2>
              <p>
                The Service may include affiliate links to third-party booking
                platforms (e.g. Booking.com). We may earn a commission from
                qualifying purchases made through these links. The price you
                pay is not affected by our affiliate relationship.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Limitation of Liability
              </h2>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, express or
                implied. To the fullest extent permitted by law, TravalBee
                shall not be liable for any direct, indirect, incidental,
                special, or consequential damages arising from your use of the
                Service, including but not limited to travel disruptions, venue
                closures, inaccurate AI-generated information, or losses
                arising from reliance on itinerary content.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Intellectual Property
              </h2>
              <p>
                Generated itineraries are provided for your personal,
                non-commercial use. The TravalBee brand, design system,
                software, and underlying technology remain the exclusive
                intellectual property of TravalBee. Unauthorised
                reproduction or commercial use is prohibited.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                8. Changes to Terms
              </h2>
              <p>
                We may update these Terms at any time. The &quot;Last
                updated&quot; date at the top of this page reflects the most
                recent revision. Continued use of the Service after changes are
                posted constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                9. Contact
              </h2>
              <p>
                For questions about these Terms, email us at{" "}
                <a
                  href="mailto:travalbee@outlook.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  travalbee@outlook.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                10. Governing Law
              </h2>
              <p>
                These Terms of Service shall be governed by and construed in
                accordance with the laws of the State of{" "}
                <strong className="text-ink">New Jersey</strong>, without
                regard to its conflict of law provisions. Any disputes arising
                under or in connection with these Terms shall be subject to the
                exclusive jurisdiction of the courts located in New Jersey.
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-ink/5 flex flex-wrap gap-6">
            <Link
              href="/refunds"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              href="/"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              Back to TravalBee
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
