import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { supportRatelimit } from "@/lib/ratelimit";

const SupportSchema = z.object({
  email:   z.string().email("Please enter a valid email address.").max(254),
  message: z.string().min(10, "Message must be at least 10 characters.").max(3000),
});

export async function POST(req: NextRequest) {
  // ── Rate limit by IP ────────────────────────────────────────────────────────
  // x-forwarded-for is set by Vercel edge. Absent on localhost — reject rather
  // than fall back to a shared bucket that would let bots self-rate-limit.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) {
    return Response.json(
      { error: "Unable to verify request origin." },
      { status: 429 }
    );
  }

  const { success, limit, remaining, reset } = await supportRatelimit.limit(ip);
  if (!success) {
    return Response.json(
      { error: "Our concierge is momentarily overwhelmed. Please try again shortly." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit":     String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset":     String(reset),
        },
      }
    );
  }

  // ── Parse & validate body ───────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = SupportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, message } = parsed.data;

  // ── Persist to database ─────────────────────────────────────────────────────
  await prisma.supportTicket.create({ data: { email, message } });

  return Response.json({ success: true });
}
