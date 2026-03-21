import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
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
  title: {
    default: "Seek Wander | Bespoke Travel Curation",
    template: "%s | Seek Wander",
  },
  description:
    "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
  openGraph: {
    title: "Seek Wander | Bespoke Travel Curation",
    description:
      "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
    type: "website",
    siteName: "Seek Wander",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seek Wander | Bespoke Travel Curation",
    description:
      "Bespoke travel itineraries with hidden gems, curated dining, and every detail handled for the discerning traveler.",
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
      </body>
    </html>
  );
}
