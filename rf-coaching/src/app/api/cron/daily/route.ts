import { NextResponse } from "next/server";
import { adminClient } from "@/server/admin";
import { dailyJob } from "@/server/jobs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = adminClient("cron");
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurata" }, { status: 500 });
  return NextResponse.json(await dailyJob(sb));
}
