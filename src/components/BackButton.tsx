"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href = "/", label = "HOME" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 micro-copy text-ink-light hover:text-ink transition-colors mb-8"
    >
      <ChevronLeft size={13} strokeWidth={1.5} />
      {label}
    </Link>
  );
}
