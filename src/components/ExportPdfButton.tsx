"use client";

import { FileDown } from "lucide-react";

export default function ExportPdfButton() {
  const handleDownloadPdf = () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport
      ? viewport.getAttribute("content") ?? "width=device-width, initial-scale=1"
      : "width=device-width, initial-scale=1";

    // Swap to desktop viewport — forces a full DOM reflow at 1024px width
    // before the print renderer captures the layout. CSS min-width overrides
    // in @media print are ignored by iOS Safari and Android Chrome; a real
    // viewport meta change is the only reliable mechanism.
    if (viewport) {
      viewport.setAttribute("content", "width=1024, maximum-scale=1.0");
    }

    // 300 ms: enough for a DOM reflow + repaint to complete on mobile
    setTimeout(() => {
      window.print();

      // Restore the mobile viewport after the print dialog opens
      setTimeout(() => {
        if (viewport) {
          viewport.setAttribute("content", originalContent);
        }
      }, 1000);
    }, 300);
  };

  return (
    <button
      onClick={handleDownloadPdf}
      className="print:hidden micro-copy inline-flex items-center gap-2 border border-ink/20 px-5 py-3 text-ink hover:bg-ink hover:text-paper transition-all duration-300"
    >
      <FileDown size={13} strokeWidth={1.5} />
      Download PDF
    </button>
  );
}
