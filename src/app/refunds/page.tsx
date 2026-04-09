import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" label="HOME" />
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Refund Policy
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
              This Refund Policy applies to all paid subscriptions and one-time
              purchases made through TravalBee (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;). We want you to feel
              confident purchasing: if something is not right, we will
              make it right.
            </p>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. The Nature of Our Service
              </h2>
              <p>
                TravalBee delivers a digital service: the instant generation
                of a personalised travel itinerary. Because the curation is
                performed and delivered at the moment you submit your request,
                the core service is consumed upon delivery. We do not sell
                physical goods and there is nothing to &quot;return&quot; in
                the traditional sense. This policy is designed with that in
                mind, and we err on the side of generosity.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. Free Tier
              </h2>
              <p>
                Your first itinerary curation is provided free of charge. No
                payment information is required and no charges apply. There is
                nothing to refund for free-tier usage.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. Paid Subscriptions
              </h2>
              <p className="mb-3">
                If you upgrade to a paid plan, the following applies:
              </p>
              <ul className="list-disc pl-5 space-y-3">
                <li>
                  <strong className="text-ink">7-day satisfaction guarantee:</strong>{" "}
                  If you are not satisfied with the service for any reason
                  within 7 days of your first paid charge, contact us and we
                  will issue a full refund, no questions asked.
                </li>
                <li>
                  <strong className="text-ink">After 7 days:</strong>{" "}
                  Refunds are evaluated on a case-by-case basis. We will
                  consider refunds where a technical failure on our part
                  prevented you from using the service (e.g. a confirmed
                  outage or generation error that was not resolved).
                </li>
                <li>
                  <strong className="text-ink">Cancellations:</strong>{" "}
                  You may cancel your subscription at any time from your
                  account settings. Cancellation stops future charges
                  immediately. You will retain access to paid features until
                  the end of your current billing period. We do not prorate
                  or refund partial billing periods unless required by
                  applicable law.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Non-Refundable Circumstances
              </h2>
              <p className="mb-3">
                We do not issue refunds in the following circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  You changed your mind after an itinerary was successfully
                  generated and the service functioned as described
                </li>
                <li>
                  You did not use your subscription during the billing period
                </li>
                <li>
                  Refunds requested more than 30 days after the charge date
                  (except where required by law)
                </li>
                <li>
                  Accounts suspended for violation of our{" "}
                  <Link
                    href="/terms"
                    className="text-emerald-accent hover:text-ink transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. Itinerary Quality
              </h2>
              <p>
                Our itineraries are curated suggestions and should be verified
                independently before making travel arrangements. We do not
                guarantee the real-time accuracy of venue hours, availability,
                or pricing, as disclosed in our{" "}
                <Link
                  href="/terms"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  Terms of Service
                </Link>
                . A subjective preference for a different style of itinerary
                does not constitute a service failure and is not grounds for a
                refund. That said, if you feel your result was genuinely poor
                quality, reach out: we take this seriously.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. How to Request a Refund
              </h2>
              <p className="mb-3">
                Email us at{" "}
                <a
                  href="mailto:travalbee@outlook.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  travalbee@outlook.com
                </a>{" "}
                with the subject line{" "}
                <strong className="text-ink">&quot;Refund Request&quot;</strong>{" "}
                and include:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The email address associated with your account</li>
                <li>The date of the charge</li>
                <li>A brief description of the issue</li>
              </ul>
              <p className="mt-3">
                We aim to respond within{" "}
                <strong className="text-ink">2 business days</strong>. Approved
                refunds are processed via Stripe and typically appear on your
                statement within 5&ndash;10 business days, depending on your
                card issuer.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Statutory Rights
              </h2>
              <p>
                Nothing in this policy affects your statutory rights under
                applicable consumer protection law. If you are located in the
                European Union, you may have a right to withdraw from a digital
                service contract within 14 days of purchase under the EU
                Consumer Rights Directive, unless you have expressly consented
                to immediate delivery and acknowledged that your right of
                withdrawal is lost upon delivery. By initiating an itinerary
                generation, you provide such consent and acknowledgement.
              </p>
            </section>

            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                8. Contact
              </h2>
              <p>
                For billing and refund enquiries, contact us at{" "}
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
              href="/terms"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              &larr; Terms of Service
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
