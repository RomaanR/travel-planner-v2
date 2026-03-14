import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seek Wander — Luxury AI Travel Curation",
  description:
    "Your personal AI concierge for ultra-curated, editorial travel experiences. Built for the discerning traveler.",
  openGraph: {
    title: "Seek Wander",
    description: "Luxury AI travel curation for the discerning traveler.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seek Wander",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="bg-paper text-ink antialiased">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider>{children}</ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
