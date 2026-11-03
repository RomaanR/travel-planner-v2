// Shared class strings for repeated UI patterns. Kept in a plain module (not a client component)
// so server components can import them.

/** Back / "go home" navigation: a filled orange button (square, like the site's other CTAs) so it is easy to see. White on #C2410C is 5.2:1. */
export const BACK_PILL =
  "inline-flex items-center gap-1.5 bg-burnt-orange px-4 min-h-[40px] micro-copy text-white " +
  "hover:bg-ink transition-colors duration-300 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-ink";
