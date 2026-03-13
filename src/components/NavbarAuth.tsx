"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function NavbarAuth() {
  return (
    <div className="flex items-center">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="micro-copy border border-ink/20 px-5 py-2.5 text-ink hover:bg-ink hover:text-paper transition-all duration-300 cursor-pointer">
            SIGN IN
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
