import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { appBaseUrl } from "@/lib/appUrl";

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
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  try {
    const baseUrl = appBaseUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   profile.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.redirect(portalSession.url);
  } catch (err) {
    console.error("[stripe/portal] Failed to create portal session:", err);
    // Operator hint (kept out of the visitor-facing message): if this keeps failing, check that the
    // Stripe Customer Portal is activated in the Stripe dashboard (Settings → Billing → Customer portal).
    // Return a readable error rather than crashing silently
    return NextResponse.json(
      { error: "We could not open your billing page right now. Please try again shortly or contact support." },
      { status: 500 }
    );
  }
}
