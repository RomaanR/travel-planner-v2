import Link from "next/link";
import { Linkedin } from "lucide-react";

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

const SOCIAL = [
  ["TravalBee", "https://www.linkedin.com/company/travalbee/"],
  ["OpsisX", "https://www.linkedin.com/company/opsisx/"],
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
      <div className="max-w-screen-xl mx-auto mt-8 pt-6 border-t border-ink/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm text-ink-light">
          <a href="mailto:contact@opsisx.com" className="hover:text-ink transition-colors">contact@opsisx.com</a>
          {SOCIAL.map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} on LinkedIn (opens in a new tab)`}
              className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              <Linkedin size={16} strokeWidth={1.5} aria-hidden />
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
