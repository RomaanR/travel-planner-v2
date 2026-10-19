import { auth } from "@clerk/nextjs/server";
import {
  canAccessGeneration,
  getGeneration,
  isValidRequestId,
  toSnapshot,
} from "@/lib/generationStore";

export const dynamic = "force-dynamic";

// GET /api/generations/{requestId}
// Current state of a generation — used by the page to resume after its live
// stream was cut (iOS backgrounding, network drop, tab reload). Read-only.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isValidRequestId(params.id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { userId } = await auth();
  const record = await getGeneration(params.id);

  // Missing, expired and someone else's all look the same.
  if (!record || !canAccessGeneration(record, userId ?? null)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(toSnapshot(record), {
    headers: { "Cache-Control": "no-store" },
  });
}
