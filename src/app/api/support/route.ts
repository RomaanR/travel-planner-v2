import { NextRequest } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { supportRatelimit } from "@/lib/ratelimit";

const SupportSchema = z.object({
  email:   z.string().email("Please enter a valid email address.").max(254),
  message: z.string().min(1, "Please enter a message.").max(3000),
});

export async function POST(req: NextRequest) {
  // ── Rate limit by IP ────────────────────────────────────────────────────────
  // x-forwarded-for is set by Vercel edge. Falls back to "127.0.0.1" in local
  // dev so the form is testable without a tunnel. In production, a missing
  // header is rejected (no shared anonymous bucket).
  const isDev = process.env.NODE_ENV === "development";
  const ip    = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
             ?? (isDev ? "127.0.0.1" : null);

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
    // Flatten to a single string so the client can display it directly
    const firstError = Object.values(parsed.error.flatten().fieldErrors)
      .flat()[0] ?? "Please check your details and try again.";
    return Response.json({ error: firstError }, { status: 400 });
  }

  const { email, message } = parsed.data;

  // ── Persist to database ─────────────────────────────────────────────────────
  await prisma.supportTicket.create({ data: { email, message } });

  // ── Send notification email ─────────────────────────────────────────────────
  // Fire-and-forget — a failed email never blocks the user's success response.
  // The ticket is already saved to the DB, so no data is lost if Resend is down.
  const resend = new Resend(process.env.RESEND_API_KEY);
  resend.emails.send({
    from:    "onboarding@resend.dev",
    to:      "travalbee@outlook.com",
    replyTo: email,
    subject: `New Support Ticket — ${email}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#F5F0E8;color:#0A0A0A;">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#6B6B6B;margin:0 0 8px;">
          TravalBee &mdash; Client Support
        </p>
        <h1 style="font-size:28px;font-style:italic;font-weight:400;margin:0 0 24px;">
          New Support Ticket
        </h1>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#6B6B6B;padding:0 0 4px;">From</td>
          </tr>
          <tr>
            <td style="font-size:15px;padding:0 0 24px;border-bottom:1px solid rgba(10,10,10,0.1);">${email}</td>
          </tr>
          <tr>
            <td style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#6B6B6B;padding:16px 0 4px;">Message</td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${message}</td>
          </tr>
        </table>
        <p style="margin-top:32px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#6B6B6B;">
          Reply directly to this email to respond to the client.
        </p>
      </div>
    `,
  }).catch((err) => console.error("[support] Resend failed:", err));

  return Response.json({ success: true });
}
