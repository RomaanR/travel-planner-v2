import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper pt-28 pb-20 px-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" label="HOME" />
          <p className="micro-copy text-ink-light mb-4">Legal</p>
          <h1 className="font-serif italic text-5xl md:text-6xl text-ink leading-none mb-10">
            Privacy Policy
          </h1>
          <div className="w-12 h-px bg-burnt-orange mb-10" />

          <div className="space-y-8 font-sans text-sm text-ink-light leading-relaxed">

            <p>
              <strong className="text-ink">Last updated: 1 May 2026</strong>
            </p>

            <p>
              TravalBee is a product of OpsisX LLC. In this policy, &quot;we&quot;, &quot;us&quot; and &quot;our&quot; mean OpsisX LLC, which is committed to
              protecting your personal data and respecting your privacy. This policy explains
              exactly what information we collect, why we collect it, how we use and protect it,
              how long we keep it, and your rights under applicable privacy laws — including the
              UK GDPR, EU GDPR, California Consumer Privacy Act (CCPA/CPRA), Brazil&apos;s LGPD,
              Canada&apos;s PIPEDA, and Australia&apos;s Privacy Act.
            </p>

            <p>
              OpsisX LLC is the <strong className="text-ink">data controller</strong> for the personal
              data you provide to us. If you have any questions about this policy or wish to
              exercise your rights, contact us at{" "}
              <a
                href="mailto:contact@opsisx.com"
                className="text-emerald-accent hover:text-ink transition-colors"
              >
                contact@opsisx.com
              </a>
              .
            </p>

            {/* ── 1. What Data We Collect ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                1. What Personal Data We Collect
              </h2>
              <p className="mb-3">
                We collect only what is necessary to provide the service. Here is a specific
                breakdown:
              </p>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-ink mb-1">Account Information</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Email address (provided through our sign-in provider)</li>
                    <li>A unique account identifier</li>
                    <li>If you sign in using a social login provider, your name and profile photo as returned by that provider</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-ink mb-1">Itinerary Preferences You Provide</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Travel destination, departure and return dates</li>
                    <li>Travel party type (solo, couple, family, group)</li>
                    <li>Travel pace, budget tier, dietary requirements, and interests</li>
                    <li>Accommodation status and hotel name (if you choose to provide it)</li>
                    <li>Preferred transport mode and walking tolerance</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-ink mb-1">Generated Itineraries</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      The full itinerary content we generate for you is stored in our database
                      linked to your user identifier, so you can access it later. This includes
                      destination names, activity descriptions, and place data.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-ink mb-1">Technical &amp; Operational Data</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>IP address, browser type, device type, and operating system</li>
                    <li>Request timestamps and pages visited</li>
                    <li>Anonymised usage analytics (page views, generation counts) &mdash; no cross-site tracking</li>
                    <li>Short-lived security counters, keyed by user identifier or IP address, used to prevent abuse and automatically expiring after one hour</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-ink mb-1">Browser Local Storage</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      We store a cached copy of your saved itineraries in your browser&apos;s
                      local storage
                      to enable offline access. This data never leaves your device and is
                      cleared when you clear your browser storage.
                    </li>
                  </ul>
                </div>
              </div>

              <p className="mt-4">
                <strong className="text-ink">We do not collect</strong> payment card numbers
                (handled entirely by our PCI-DSS certified payment partners), passport or
                government ID details, precise GPS location, or any sensitive special-category
                data as defined under GDPR Article 9.
              </p>
            </section>

            {/* ── 2. Legal Basis for Processing (GDPR) ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                2. Legal Basis for Processing (GDPR &amp; UK GDPR)
              </h2>
              <p className="mb-3">
                If you are in the European Economic Area (EEA) or United Kingdom, we rely on
                the following legal bases under GDPR Article 6:
              </p>
              <ul className="list-disc pl-5 space-y-3">
                <li>
                  <strong className="text-ink">Performance of a contract</strong> &mdash;
                  processing your travel preferences and generating your itinerary is necessary
                  to provide the service you requested.
                </li>
                <li>
                  <strong className="text-ink">Legitimate interests</strong> &mdash;
                  we process technical and operational data to maintain security, prevent fraud
                  and abuse, enforce fair-use limits, and improve the service. Our legitimate interests
                  do not override your fundamental rights.
                </li>
                <li>
                  <strong className="text-ink">Legal obligation</strong> &mdash;
                  we may retain certain records (such as usage records without personal identifiers)
                  where required by applicable law.
                </li>
                <li>
                  <strong className="text-ink">Consent</strong> &mdash;
                  where we rely on consent (e.g., optional analytics), you may withdraw it at
                  any time without affecting the lawfulness of processing before withdrawal.
                </li>
              </ul>
            </section>

            {/* ── 3. How We Use Your Data ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                3. How We Use Your Data
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To generate personalised travel itineraries based on your stated preferences</li>
                <li>To save and retrieve your itineraries when you are signed in</li>
                <li>To authenticate your identity and manage your account session</li>
                <li>To enforce fair-use limits and prevent abuse of the service</li>
                <li>To monitor service health, fix errors, and improve quality</li>
                <li>To display anonymised analytics about overall usage trends</li>
                <li>
                  To present hotel and accommodation recommendations and earn affiliate commission
                  if you complete a booking via our links &mdash; this does not affect the price
                  you pay
                </li>
              </ul>
              <p className="mt-3">
                <strong className="text-ink">We do not</strong> sell your personal data. We do
                not use your data for targeted advertising. We do not build profiles about you
                beyond what is needed to run this service.
              </p>
            </section>

            {/* ── 4. Service Providers & Data Recipients ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                4. Service Providers &amp; Data Recipients
              </h2>
              <p>
                We share limited personal data with trusted service providers who help us
                operate TravalBee. These include providers of hosting, user authentication,
                database storage, payments, email delivery, analytics and error monitoring,
                maps and place information, and the technology that generates your itinerary
                from your trip preferences. They may use your data only to provide their
                services to us, under agreements that require them to protect it and not to
                use it for their own purposes. Where a provider has its own privacy policy,
                that policy also applies to the data it handles.
              </p>
              <p className="mt-3">
                Some hotel links on TravalBee are affiliate links. If you book through one,
                we may earn a commission at no extra cost to you. Booking partners receive
                only standard browser information, such as the page you came from, and not
                the details of your account or itinerary.
              </p>
            </section>

            {/* ── 5. International Data Transfers ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                5. International Data Transfers
              </h2>
              <p>
                TravalBee operates globally and uses service providers based in the
                United States. If you are located in the EEA, UK, or other regions with
                data transfer restrictions, your personal data may be transferred to and
                processed in the United States or other countries that may not offer the
                same level of data protection as your home country.
              </p>
              <p className="mt-3">
                Where we transfer data internationally, we rely on appropriate safeguards,
                including Standard Contractual Clauses (SCCs) approved by the European
                Commission, the UK&apos;s International Data Transfer Agreement (IDTA), or
                other legally recognised transfer mechanisms. Our service providers that process data outside your region are subject to SCCs or equivalent safeguards. You may request a copy of the relevant safeguards by contacting
                us.
              </p>
            </section>

            {/* ── 6. Data Retention ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                6. Data Retention
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">Account &amp; itinerary data:</strong>{" "}
                  retained for as long as your account is active. If you request deletion of
                  your account, all personal data and associated itineraries will be
                  permanently removed from our database within{" "}
                  <strong className="text-ink">30 days</strong>.
                </li>
                <li>
                  <strong className="text-ink">Temporary technical data:</strong>{" "}
                  automatically deleted within 14 days.
                </li>
                <li>
                  <strong className="text-ink">Security counters:</strong>{" "}
                  expire automatically after 1 hour.
                </li>
                <li>
                  <strong className="text-ink">Usage records:</strong>{" "}
                  retained for internal financial record-keeping. These logs contain
                  destination names and aggregate cost figures but no other personal data.
                </li>
                <li>
                  <strong className="text-ink">Infrastructure and provider logs:</strong>{" "}
                  retained per each provider&apos;s own retention policy (typically 30–90 days).
                </li>
              </ul>
            </section>

            {/* ── 7. Cookies & Local Storage ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                7. Cookies &amp; Local Storage
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">Authentication cookies:</strong>{" "}
                  set by our sign-in system to manage your login session. These are strictly necessary and
                  cannot be opted out of while signed in.
                </li>
                <li>
                  <strong className="text-ink">Local storage (offline cache):</strong>{" "}
                  we store your saved itineraries in your browser&apos;s local storage for
                  offline access. This is first-party only and never transmitted to third
                  parties.
                </li>
                <li>
                  <strong className="text-ink">Analytics:</strong>{" "}
                  Our analytics tool uses cookieless, privacy-preserving techniques to measure
                  aggregate page performance. No cross-site tracking cookies are used.
                </li>
              </ul>
              <p className="mt-3">
                We do not use third-party advertising cookies, retargeting pixels, or
                social media tracking cookies.
              </p>
            </section>

            {/* ── 8. Your Rights ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                8. Your Rights
              </h2>
              <p className="mb-3">
                Depending on where you live, you have the following rights regarding your
                personal data. We honour these rights for all users worldwide, not just those
                in regulated jurisdictions.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-ink">Right to Access</p>
                  <p>
                    You can request a copy of the personal data we hold about you, including
                    what categories of data we have, where it came from, and how it is used.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Rectification</p>
                  <p>
                    You can ask us to correct any inaccurate personal data we hold about you.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Erasure (&quot;Right to be Forgotten&quot;)</p>
                  <p>
                    You can request the deletion of your account and all personal data we hold
                    about you. We will process this within{" "}
                    <strong className="text-ink">30 days</strong> and confirm once complete.
                    Note that anonymised data (e.g., aggregate usage records with no personal
                    identifiers) is not subject to erasure requests.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Restriction of Processing</p>
                  <p>
                    You can ask us to restrict how we process your data in certain circumstances,
                    such as while a dispute is being resolved.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Data Portability</p>
                  <p>
                    You can request a machine-readable export of your personal data (e.g., your
                    saved itineraries in JSON format).
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Object</p>
                  <p>
                    You can object to processing of your personal data where we rely on
                    legitimate interests as the legal basis. We will stop processing unless we
                    can demonstrate compelling legitimate grounds that override your interests.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Opt Out of Sale (CCPA &mdash; California)</p>
                  <p>
                    We <strong className="text-ink">do not sell</strong> your personal
                    information. We do not share it with third parties for cross-context
                    behavioural advertising.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Right to Non-Discrimination</p>
                  <p>
                    We will never discriminate against you for exercising any privacy right.
                    Exercising your rights will not affect your access to the service.
                  </p>
                </div>
              </div>
            </section>

            {/* ── 9. How to Exercise Your Rights ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                9. How to Exercise Your Rights
              </h2>
              <p className="mb-3">
                To exercise any of the rights listed above — including requesting deletion of
                your account and all associated data — please email us at:
              </p>
              <p className="mb-3">
                <a
                  href="mailto:contact@opsisx.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  contact@opsisx.com
                </a>
              </p>
              <p className="mb-3">
                Please include your registered email address and a brief description of your
                request. We may need to verify your identity before processing the request
                to protect your data from unauthorised access.
              </p>
              <p>
                <strong className="text-ink">Response times:</strong> We will acknowledge
                your request within <strong className="text-ink">72 hours</strong> and
                respond in full within <strong className="text-ink">30 days</strong>
                (as required by GDPR and UK GDPR). For CCPA requests, we will respond within
                45 days. If we need additional time due to complexity, we will notify you of
                the extension before the deadline.
              </p>
            </section>

            {/* ── 10. Supervisory Authority & Complaints ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                10. Supervisory Authority &amp; Complaints
              </h2>
              <p className="mb-3">
                If you believe we have not handled your personal data in accordance with
                applicable privacy law, you have the right to lodge a complaint with the
                relevant supervisory authority in your jurisdiction. Examples include:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">United Kingdom:</strong>{" "}
                  Information Commissioner&apos;s Office (ICO) &mdash;{" "}
                  <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">ico.org.uk</a>
                </li>
                <li>
                  <strong className="text-ink">European Union:</strong>{" "}
                  your national Data Protection Authority (DPA) &mdash; find your authority at{" "}
                  <a href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">edpb.europa.eu</a>
                </li>
                <li>
                  <strong className="text-ink">Australia:</strong>{" "}
                  Office of the Australian Information Commissioner (OAIC) &mdash;{" "}
                  <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">oaic.gov.au</a>
                </li>
                <li>
                  <strong className="text-ink">Canada:</strong>{" "}
                  Office of the Privacy Commissioner of Canada &mdash;{" "}
                  <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">priv.gc.ca</a>
                </li>
                <li>
                  <strong className="text-ink">Brazil:</strong>{" "}
                  Autoridade Nacional de Prote&ccedil;&atilde;o de Dados (ANPD) &mdash;{" "}
                  <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">gov.br/anpd</a>
                </li>
                <li>
                  <strong className="text-ink">California (USA):</strong>{" "}
                  California Privacy Protection Agency (CPPA) &mdash;{" "}
                  <a href="https://cppa.ca.gov" target="_blank" rel="noopener noreferrer" className="text-emerald-accent hover:text-ink transition-colors">cppa.ca.gov</a>
                </li>
              </ul>
              <p className="mt-3">
                We ask that you contact us first at{" "}
                <a href="mailto:contact@opsisx.com" className="text-emerald-accent hover:text-ink transition-colors">contact@opsisx.com</a>{" "}
                so that we have an opportunity to resolve your concern directly.
              </p>
            </section>

            {/* ── 11. Automated Decision-Making ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                11. Automated Decision-Making
              </h2>
              <p>
                We use third-party artificial intelligence technology to generate travel itinerary
                content. This is an assistive tool — the output is a creative suggestion based
                on your stated preferences and does not produce any legal or similarly
                significant decision about you. No automated profiling is used to make
                decisions that affect your rights or access to services.
              </p>
            </section>

            {/* ── 12. Children's Privacy ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                12. Children&apos;s Privacy
              </h2>
              <p>
                TravalBee is not directed at children. We do not knowingly collect personal
                data from anyone under the age of <strong className="text-ink">13</strong>,
                or under <strong className="text-ink">16</strong> in the EEA and UK. If you
                believe a child has provided us with personal information, please contact us
                at{" "}
                <a href="mailto:contact@opsisx.com" className="text-emerald-accent hover:text-ink transition-colors">contact@opsisx.com</a>{" "}
                and we will delete it promptly.
              </p>
            </section>

            {/* ── 13. Security ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                13. Security
              </h2>
              <p>
                We implement appropriate technical and organisational measures to protect your
                personal data against unauthorised access, disclosure, alteration, or
                destruction. These include HTTPS encryption for all data in transit,
                encryption at rest, strict separation of secrets and access keys, role-based access controls, and measures to prevent abuse. No method of transmission or storage is 100%
                secure; if you have concerns about a specific security issue, please contact
                us immediately.
              </p>
            </section>

            {/* ── 14. Changes ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                14. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last
                updated&quot; date at the top of this page reflects the most recent revision.
                For material changes, we will notify signed-in users by email where we hold
                your address. Continued use of the service after changes are posted
                constitutes your acceptance of the revised policy.
              </p>
            </section>

            {/* ── 15. Contact ── */}
            <section>
              <h2 className="font-serif italic text-2xl text-ink mb-3">
                15. Contact Us
              </h2>
              <p className="mb-2">
                For any privacy-related questions, data access requests, or deletion requests:
              </p>
              <p>
                <strong className="text-ink">Email:</strong>{" "}
                <a
                  href="mailto:contact@opsisx.com"
                  className="text-emerald-accent hover:text-ink transition-colors"
                >
                  contact@opsisx.com
                </a>
              </p>
              <p className="mt-3 text-xs text-ink-light">
                We will respond to all privacy requests within 30 days. For urgent matters
                regarding a potential data breach affecting you, please mark your email
                &quot;URGENT &mdash; Data Privacy&quot; and we will prioritise your request.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-ink/5">
            <Link
              href="/"
              className="micro-copy text-ink-light hover:text-ink transition-colors"
            >
              &larr; Back to TravalBee
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
