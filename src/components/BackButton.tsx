"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href = "/", label = "HOME" }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    // Preserve scroll position on the referring page by using native browser history.
    // Fall back to the static href when there is no history entry (direct navigation).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(href);
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 micro-copy text-ink-light hover:text-ink transition-colors mb-8"
    >
      <ChevronLeft size={13} strokeWidth={1.5} />
      {label}
    </button>
  );
}
