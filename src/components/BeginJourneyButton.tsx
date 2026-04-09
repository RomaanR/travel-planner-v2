"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

const CLS =
  "micro-copy inline-flex items-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-burnt-orange/90 transition-colors duration-300 cursor-pointer";

export default function BeginJourneyButton() {
  return (
    <>
      <SignedIn>
        <Link href="/curate" className={CLS}>
          Begin Your Journey <span>&rarr;</span>
        </Link>
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/curate">
          <button className={CLS}>
            Begin Your Journey <span>&rarr;</span>
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
