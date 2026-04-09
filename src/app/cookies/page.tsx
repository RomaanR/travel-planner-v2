import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Cookie Policy",
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" label="HOME" />
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Cookie Policy
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
              This Cookie Policy explains how TravalBee (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
              browser storage technologies when you visit our website. We keep
              this simple: we do not use advertising or tracking cookies.
            </p>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. What Are Cookies?
              </h2>
              <p>
                Cookies are small text files placed on your device by a
                website. Similar technologies include browser{" "}
                <strong className="text-ink">localStorage</strong> and{" "}
                <strong className="text-ink">sessionStorage</strong>, which
                store data directly in your browser without sending it to a
                server. This policy covers all of these technologies.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. What We Use &amp; Why
              </h2>

              <div className="space-y-6">
                <div className="border-l-2 border-burnt-orange pl-5">
                  <p className="font-sans font-semibold text-ink mb-1">
                    Authentication Cookies: Clerk
                  </p>
                  <p className="mb-1">
                    <strong className="text-ink">Type:</strong> Strictly
                    necessary cookie &middot;{" "}
                    <strong className="text-ink">Duration:</strong> Session /
                    up to 7 days
                  </p>
                  <p>
                    When you sign in, our authentication provider (Clerk) sets
                    a secure, HttpOnly session cookie to keep you logged in.
                    This cookie is essential for the service to function:
                    without it, we cannot associate your saved itineraries with
                    your account. It cannot be disabled while you are signed in.
                    No personal data beyond your session token is stored in this
                    cookie.
                  </p>
                </div>

                <div className="border-l-2 border-ink/20 pl-5">
                  <p className="font-sans font-semibold text-ink mb-1">
                    Offline Itinerary Cache: localStorage
                  </p>
                  <p className="mb-1">
                    <strong className="text-ink">Type:</strong> Functional
                    storage &middot;{" "}
                    <strong className="text-ink">Key:</strong>{" "}
                    <code className="bg-paper-dark px-1 py-0.5 text-xs">
                      seek_wander_archive
                    </code>
                  </p>
                  <p>
                    We store a local copy of your saved itineraries in your
                    browser&apos;s localStorage so that your archive remains
                    accessible when you are offline or your network connection
                    is interrupted. This data lives entirely on your device and
                    is never transmitted to third-party advertising networks. You
                    can clear it at any time by clearing your browser&apos;s
                    site data.
                  </p>
                </div>

                <div className="border-l-2 border-ink/20 pl-5">
                  <p className="font-sans font-semibold text-ink mb-1">
                    Itinerary Request Cache: sessionStorage
                  </p>
                  <p className="mb-1">
                    <strong className="text-ink">Type:</strong> Functional
                    storage &middot;{" "}
                    <strong className="text-ink">Key:</strong>{" "}
                    <code className="bg-paper-dark px-1 py-0.5 text-xs">
                      itineraryRequest
                    </code>
                  </p>
                  <p>
                    When you submit a curation request, your form preferences
                    (destination, dates, pace, etc.) are temporarily held in
                    sessionStorage so they can be passed to the results page
                    without a round-trip to our servers. This data is
                    automatically cleared when you close your browser tab.
                  </p>
                </div>

                <div className="border-l-2 border-ink/20 pl-5">
                  <p className="font-sans font-semibold text-ink mb-1">
                    Analytics: Vercel Analytics
                  </p>
                  <p className="mb-1">
                    <strong className="text-ink">Type:</strong> Analytics
                    &middot;{" "}
                    <strong className="text-ink">Cookies set:</strong> None
                  </p>
                  <p>
                    We use Vercel Analytics to understand page traffic and
                    visitor counts. Vercel Analytics is privacy-first by design:
                    it does not use cookies, does not fingerprint
                    devices, and does not track users across sites. Data is
                    aggregated and anonymised. It is fully compliant with GDPR
                    and CCPA without requiring a consent banner.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. What We Do Not Use
              </h2>
              <p className="mb-3">We explicitly do not use:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Third-party advertising or retargeting cookies</li>
                <li>Social media tracking pixels (Facebook, TikTok, etc.)</li>
                <li>Cross-site behavioural tracking of any kind</li>
                <li>
                  Google Analytics, Hotjar, Mixpanel, or similar profiling
                  tools
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Your Choices
              </h2>
              <p className="mb-3">
                Because we only use strictly necessary and functional storage,
                there is no advertising to opt out of. However, you have full
                control over your browser storage:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">Clear local cache:</strong> In
                  your browser settings, navigate to Site Data or Storage and
                  clear data for{" "}
                  <code className="bg-paper-dark px-1 py-0.5 text-xs">
                    travel-planner-v2-pearl.vercel.app
                  </code>{" "}
                  (or your custom domain). This will remove the offline
                  itinerary cache and sign you out.
                </li>
                <li>
                  <strong className="text-ink">Sign out:</strong> Signing out
                  via the account menu will clear your Clerk session cookie.
                </li>
                <li>
                  <strong className="text-ink">Block cookies entirely:</strong>{" "}
                  You may configure your browser to block all cookies. Note
                  that doing so will prevent sign-in from working, as the Clerk
                  session cookie is required for authentication.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Third-Party Links
              </h2>
              <p>
                Our itineraries may include affiliate links to Booking.com.
                Clicking these links will take you to a third-party website
                governed by its own cookie and privacy policies. We have no
                control over cookies set by Booking.com or any other external
                site.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Changes to This Policy
              </h2>
              <p>
                We may update this Cookie Policy if we introduce new
                technologies or change our practices. The &quot;Last
                updated&quot; date at the top reflects the most recent
                revision. We will not add tracking or advertising cookies
                without updating this policy and, where required by law,
                seeking your consent.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Contact
              </h2>
              <p>
                If you have any questions about this Cookie Policy, email us
                at{" "}
                <a
                  href="mailto:travalbee@outlook.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  travalbee@outlook.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-ink/5 flex flex-wrap gap-6">
            <Link
              href="/privacy"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              &larr; Privacy Policy
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
