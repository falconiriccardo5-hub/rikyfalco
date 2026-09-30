"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
/** One source of truth: any change in the DB (from Mac, iPhone, AI or cron) refreshes every open device. */
export function RealtimeSync() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const sb = supabaseBrowser();
    const refresh = () => { clearTimeout(timer.current); timer.current = setTimeout(() => router.refresh(), 300); };
    const ch = sb.channel("rf-sync");
    for (const table of ["clients", "programs", "payments", "appointments", "notifications"]) ch.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    ch.subscribe();
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => { sb.removeChannel(ch); document.removeEventListener("visibilitychange", onFocus); };
  }, [router]);
  return null;
}
