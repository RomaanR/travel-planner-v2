import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  return Response.json({
    userId: userId ?? null,
    adminId: process.env.ADMIN_USER_ID ?? null,
    match: userId === process.env.ADMIN_USER_ID,
  });
}
