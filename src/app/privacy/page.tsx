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
              Seek Wander (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
              is committed to protecting your privacy. This policy explains what
              information we collect, how we use it, and your rights in relation
              to it.
            </p>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. Information We Collect
              </h2>
              <p className="mb-3">
                When you use Seek Wander, we collect information you provide
                directly: your destination preferences, travel dates, party
                size, pace, budget tier, dietary requirements, and interests.
                If you create an account via our authentication provider
                (Clerk), we store your user identifier to associate saved
                itineraries with your account.
              </p>
              <p>
                <strong className="text-ink">Log Data &amp; Telemetry:</strong>{" "}
                Our infrastructure providers (Vercel, Clerk) automatically
                collect basic log data, including IP addresses, browser
                types, device identifiers, and request timestamps,
                strictly for security, rate-limiting, and operational purposes.
                This data is processed by those providers in accordance with
                their own privacy policies and is not used for advertising or
                sold to third parties.
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
              <p className="mb-3">We use the following third-party services:</p>
              <ul className="list-disc pl-5 space-y-3">
                <li>
                  <strong className="text-ink">Anthropic (Claude)</strong>
                  {" "}is our AI provider used to generate your travel
                  itinerary. When you submit a request, your travel preferences
                  (destination, dates, pace, dietary needs, interests) are
                  securely transmitted to Anthropic solely for the purpose of
                  generating your itinerary.{" "}
                  <strong className="text-ink">
                    We do not permit Anthropic to use your data to train their
                    public models.
                  </strong>{" "}
                  Data is processed under Anthropic&apos;s API terms, which
                  prohibit training on API inputs by default.
                </li>
                <li>
                  <strong className="text-ink">Google Maps Platform</strong>
                  {" "}for destination search, maps, and place information
                </li>
                <li>
                  <strong className="text-ink">Clerk</strong>
                  {" "}for user authentication and identity management
                </li>
                <li>
                  <strong className="text-ink">Booking.com</strong>
                  {" "}affiliate hotel links. We may earn a commission if you
                  complete a booking. Clicking these links is subject to
                  Booking.com&apos;s own privacy policy.
                </li>
                <li>
                  <strong className="text-ink">Vercel</strong>
                  {" "}application hosting and edge delivery
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Cookies &amp; Local Storage
              </h2>
              <p>
                We use browser local storage to cache your saved itineraries
                for offline access. Clerk may set authentication cookies
                necessary for session management. We do not use third-party
                tracking cookies or advertising pixels.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Your Rights
              </h2>
              <p>
                You may delete any saved itinerary from your archive at any
                time. If you are located in the EEA or UK, you have the right
                to access, rectify, port, or erase your personal data. To
                exercise any of these rights or to request deletion of your
                account and all associated data, please contact us at the
                address below.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. The
                &quot;Last updated&quot; date at the top of this page reflects
                the most recent revision. Continued use of the Service after
                changes are posted constitutes your acceptance of the revised
                policy.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                8. Data Retention
              </h2>
              <p>
                We retain your account data and saved itineraries for as long
                as your account remains active. If you request deletion of your
                account, all personal data and associated itineraries will be
                permanently removed from our Supabase database within{" "}
                <strong className="text-ink">30 days</strong> of the request.
                Anonymised, aggregated usage data (such as cost logs with no
                personal identifiers) may be retained for operational purposes.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                9. Children&apos;s Privacy
              </h2>
              <p>
                Seek Wander is not intended for use by anyone under the age of{" "}
                <strong className="text-ink">13</strong>, or under{" "}
                <strong className="text-ink">16</strong> in the European
                Economic Area. We do not knowingly collect personal information
                from children. If you believe a child has provided us with
                personal information, please contact us immediately and we will
                take steps to delete that information promptly.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                10. Contact
              </h2>
              <p>
                For privacy-related enquiries or data deletion requests, email
                us at{" "}
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
