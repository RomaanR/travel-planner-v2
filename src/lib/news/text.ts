// Feed text → safe plain text. Nothing from a feed is ever rendered as HTML.

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Strips tags (including script/style bodies), decodes entities, collapses whitespace. */
export function toPlainText(input: unknown): string {
  if (input === null || input === undefined) return "";
  const raw = typeof input === "string" ? input : JSON.stringify(input);
  return decodeEntities(
    raw
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|br|h\d)>|<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncates at a sentence or word boundary, never mid-word. */
export function clip(text: string, max = 400): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : max).trim()}…`;
}

/** Only http(s) links from feeds are kept — anything else (javascript:, data:) is dropped. */
export function safeUrl(input: unknown, fallback: string): string {
  try {
    const u = new URL(String(input));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}
