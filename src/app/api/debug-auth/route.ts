import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const raw   = process.env.ADMIN_USER_ID ?? null;
  const trimmed = raw?.trim() ?? null;
  const { userId } = await auth();
  return Response.json({
    userId,
    adminIdRaw: raw,
    adminIdTrimmed: trimmed,
    rawLength: raw?.length ?? 0,
    trimmedLength: trimmed?.length ?? 0,
    match: userId === trimmed,
  });
}
