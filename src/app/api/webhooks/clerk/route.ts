import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

// Clerk sends webhook events signed with a secret via Svix.
// This route handles user.created to instantly create a UserProfile row
// so new users see "5 remaining" before they ever visit the dashboard.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return new Response("Missing webhook secret", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId        = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text(); // raw body required for svix signature check

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: { type: string; data: { id: string } };

  try {
    evt = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: { id: string } };
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const clerkUserId = evt.data.id;
    try {
      await prisma.userProfile.upsert({
        where:  { id: clerkUserId },
        create: { id: clerkUserId, availableCredits: 5 },
        update: {}, // no-op if somehow already exists
      });
      console.log(`[clerk-webhook] UserProfile created for ${clerkUserId}`);
    } catch (err) {
      console.error("[clerk-webhook] Failed to create UserProfile:", err);
      return new Response("DB error", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
