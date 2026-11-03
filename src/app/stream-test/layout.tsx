import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

// Developer test page for the streaming pipeline: admin only. Everyone else gets the same neutral 404
// as any unknown URL, so the page's existence (and the internals it names) are not exposed.
export const dynamic = "force-dynamic";

export default async function StreamTestLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const adminId = process.env.ADMIN_USER_ID?.trim();
  if (!adminId || userId !== adminId) notFound();
  return <>{children}</>;
}
