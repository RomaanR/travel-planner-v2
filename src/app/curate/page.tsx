export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CurateClient from "./CurateClient";

export default async function CuratePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  return <CurateClient />;
}
