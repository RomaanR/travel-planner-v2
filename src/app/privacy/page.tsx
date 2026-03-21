import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Privacy Policy
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
                1. Information We Collect
              </h2>
              <p>
                When you use Seek Wander, we collect information you provide
                directly: your destination preferences, travel dates, party
                size, pace, budget tier, dietary requirements, and interests.
                If you create an account via our authentication provider
                (Clerk), we store your user identifier to associate saved
                itineraries with your account.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  To generate personalised travel itineraries based on your
                  preferences
                </li>
                <li>
                  To save and retrieve your itineraries when you are signed in
                </li>
                <li>
                  To improve our service quality and monitor usage patterns
                  (anonymised analytics)
                </li>
                <li>
                  To enforce rate limits and prevent abuse of the service
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. Data Storage &amp; Security
              </h2>
              <p>
                Your itinerary data is stored securely in a PostgreSQL database
                hosted by Supabase. Authentication is handled by Clerk, a
                third-party identity provider. We do not store passwords
                directly. All data is transmitted over HTTPS.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Third-Party Services
              </h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">Google Maps Platform</strong>{" "}
                  &mdash; for destination search, maps, and place information
                </li>
                <li>
                  <strong className="text-ink">Clerk</strong> &mdash; for
                  user authentication
                </li>
                <li>
                  <strong className="text-ink">Booking.com</strong> &mdash;
                  affiliate hotel links (we earn a commission if you book)
                </li>
                <li>
                  <strong className="text-ink">Vercel</strong> &mdash;
                  application hosting
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Cookies &amp; Local Storage
              </h2>
              <p>
                We use browser local storage to cache your saved itineraries
                for offline access. Clerk may set authentication cookies.
                We do not use third-party tracking cookies or advertising
                pixels.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Your Rights
              </h2>
              <p>
                You may delete any saved itinerary from your archive at any
                time. To request deletion of your account and all associated
                data, please contact us at the email below.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Contact
              </h2>
              <p>
                For privacy-related enquiries, email us at{" "}
                <a
                  href="mailto:privacy@seekwander.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  privacy@seekwander.com
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
