import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // One-time payment — no customer record needed. The clerkUserId in metadata
  // is the sole identifier used by the webhook to credit the right user.
  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price:    process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url:          `${baseUrl}/itinerary?credited=1`,
    cancel_url:           `${baseUrl}/pricing?cancelled=1`,
    metadata:             { clerkUserId: userId },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
