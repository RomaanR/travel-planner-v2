import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import * as Sentry from "@sentry/nextjs";
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

export function generateMetadata(): Metadata {
  return {
    title: {
      default: "TravalBee | Bespoke Travel Curation",
      template: "%s | TravalBee",
    },
    description:
      "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
    openGraph: {
      title: "TravalBee | Bespoke Travel Curation",
      description:
        "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
      type: "website",
      siteName: "TravalBee",
    },
    twitter: {
      card: "summary_large_image",
      title: "TravalBee | Bespoke Travel Curation",
      description:
        "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "TravalBee",
    },
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

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
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          toastOptions={{
            style: {
              background: "#F5F0E8",
              color: "#0A0A0A",
              border: "1px solid rgba(10, 10, 10, 0.1)",
              borderRadius: "0",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontSize: "0.8125rem",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
