import Link from "next/link";

const LINKS = [
  ["News", "/news"],
  ["Pricing", "/pricing"],
  ["FAQ", "/faq"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Cookies", "/cookies"],
  ["Refunds", "/refunds"],
  ["Support", "/support"],
] as const;

/** Site-wide footer. The company line follows the usual "product of" pattern: quiet, linked, never in the nav. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-paper-dark px-8 md:px-16 py-12 print:hidden">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="font-serif italic text-3xl text-ink mb-1">TravalBee</p>
          <p className="micro-copy text-ink-light">Curated Luxury Journeys</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="micro-copy text-ink-light hover:text-ink transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="max-w-screen-xl mx-auto mt-8 pt-6 border-t border-ink/5">
        <p className="font-sans text-sm text-ink-light">
          &copy; {new Date().getFullYear()} TravalBee. A product of{" "}
          <a
            href="https://opsisx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline underline-offset-2 hover:text-burnt-orange transition-colors"
          >
            OpsisX LLC
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
