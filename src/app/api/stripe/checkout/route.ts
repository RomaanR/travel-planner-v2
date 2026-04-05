import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Subscription model — $10.99/month recurring.
    // clerkUserId is stored in both session metadata AND subscription_data.metadata
    // so it flows through to all future invoice events (invoice.payment_succeeded).
    const session = await stripe.checkout.sessions.create({
      mode:                  "subscription",
      payment_method_types:  ["card"],
      line_items: [
        {
          price:    process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url:           `${baseUrl}/dashboard?subscribed=1`,
      cancel_url:            `${baseUrl}/pricing?cancelled=1`,
      metadata:              { clerkUserId: userId },
      subscription_data:     { metadata: { clerkUserId: userId } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
