import { NextResponse } from "next/server";
import { adminClient } from "@/server/admin";
import { snapshot } from "@/server/backup";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Off-site backup feed for the daily guardian workflow. The in-app backup keeps
 * snapshots inside Supabase (and Drive); this lets a second, independent copy be
 * archived outside it, so the data survives losing the Supabase project itself.
 * Authenticated with the same `Authorization: Bearer $CRON_SECRET` as the cron route.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = adminClient("cron");
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurata" }, { status: 500 });
  try {
    const snap = await snapshot(sb);
    return NextResponse.json(snap, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
