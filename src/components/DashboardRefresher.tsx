"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible component mounted on the dashboard.
 * Calls router.refresh() on mount and whenever the tab regains focus so that
 * server-computed stats (credits, destinations, days) always reflect the
 * latest DB state — even after navigating away and coming back.
 */
export default function DashboardRefresher() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();

    const handleFocus = () => router.refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [router]);

  return null;
}
