"use client";

import { Download, FileDown } from "lucide-react";

/** "icon" is a compact square button (icon only) for tight headers; the default shows the label. */
export default function ExportPdfButton({ variant = "label" }: { variant?: "label" | "icon" }) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => window.print()}
        aria-label="Download PDF"
        title="Download PDF"
        className="print:hidden shrink-0 inline-flex items-center justify-center w-11 h-11 border border-ink/20 text-ink hover:bg-ink hover:text-paper transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange"
      >
        <Download size={20} strokeWidth={1.5} aria-hidden />
      </button>
    );
  }

  return (
    <button
      onClick={() => window.print()}
      className="print:hidden micro-copy inline-flex items-center gap-2 border border-ink/20 px-5 py-3 text-ink hover:bg-ink hover:text-paper transition-all duration-300"
    >
      <FileDown size={13} strokeWidth={1.5} />
      Download PDF
    </button>
  );
}
