import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stripe/portal
// Creates a Stripe Customer Portal session and redirects the user to it.
// The portal handles cancellation, reactivation, and billing history.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!profile?.stripeCustomerId) {
    // No Stripe customer on record — user never completed a checkout
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   profile.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.redirect(portalSession.url);
}
