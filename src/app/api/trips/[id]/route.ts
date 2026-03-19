import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// ─── DELETE /api/trips/[id] ───────────────────────────────────────────────────
// Permanently deletes a trip from the authenticated user's archive.
//
// Security model:
//  1. 401 if the caller has no Clerk session (unauthenticated)
//  2. Neutral 404 for both "trip does not exist" AND "trip belongs to another
//     user" — identical surface so the existence of any given ID is never leaked
//  3. deleteMany({ where: { id, userId } }) enforces ownership at the DB layer,
//     eliminating any TOCTOU window between the read-check and the delete.

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // ── 1. Auth guard ────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // ── 2. Ownership verification (neutral 404) ───────────────────────────────────
  // Read before delete so we can distinguish "not found / wrong owner" from a
  // successful path — both return 404 to the client (no info leak).
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.userId !== userId) {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  // ── 3. Atomic ownership-enforced delete ──────────────────────────────────────
  // deleteMany accepts compound where clauses, making the userId constraint
  // enforced at the DB level even if the read above were somehow stale.
  await prisma.trip.deleteMany({ where: { id, userId } });

  return Response.json({ success: true }, { status: 200 });
}
