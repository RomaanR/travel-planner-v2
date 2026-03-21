import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Terms of Service
          </h1>
          <div className="w-12 h-px bg-burnt-orange mb-10" />

          <div className="prose-sw space-y-8 font-sans text-sm text-ink-light leading-relaxed">
            <p>
              <strong className="text-ink">Last updated:</strong>{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using Seek Wander (&quot;the Service&quot;),
                you agree to be bound by these Terms of Service. If you do not
                agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. Description of Service
              </h2>
              <p>
                Seek Wander generates personalised travel itineraries based on
                your preferences. Itineraries are curated suggestions and
                should be verified independently before making travel
                arrangements. We do not guarantee the accuracy, availability,
                or suitability of any recommended venue, restaurant, or
                accommodation.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. User Accounts
              </h2>
              <p>
                You may create an account to save and manage itineraries.
                You are responsible for maintaining the confidentiality of
                your account credentials. You must be at least 16 years old
                to use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Acceptable Use
              </h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Use the Service for any unlawful purpose
                </li>
                <li>
                  Attempt to circumvent rate limits or security measures
                </li>
                <li>
                  Scrape, crawl, or automate access to the Service
                </li>
                <li>
                  Resell or redistribute generated itineraries commercially
                  without permission
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Affiliate Links
              </h2>
              <p>
                The Service may include affiliate links to third-party
                booking platforms (e.g. Booking.com). We may earn a commission
                from qualifying purchases. These links do not affect the
                price you pay.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Limitation of Liability
              </h2>
              <p>
                The Service is provided &quot;as is&quot; without warranties
                of any kind. Seek Wander shall not be liable for any
                direct, indirect, incidental, or consequential damages
                arising from your use of the Service, including but not
                limited to travel disruptions, venue closures, or inaccurate
                information.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Intellectual Property
              </h2>
              <p>
                Generated itineraries are provided for your personal use.
                The Seek Wander brand, design, and underlying technology
                remain the intellectual property of Seek Wander.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                8. Changes to Terms
              </h2>
              <p>
                We may update these Terms at any time. Continued use of the
                Service after changes constitutes acceptance of the revised
                Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                9. Contact
              </h2>
              <p>
                For questions about these Terms, email us at{" "}
                <a
                  href="mailto:hello@seekwander.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  hello@seekwander.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-ink/5">
            <Link
              href="/"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              &larr; Back to Seek Wander
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
