"use client";

import { FileDown } from "lucide-react";

export default function ExportPdfButton() {
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
