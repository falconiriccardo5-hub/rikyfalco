import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { exchangeCode } from "@/server/integrations/google";
export async function GET(req: Request) {
  const { supabase } = await requireAdmin();
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("g_state")?.value;
  jar.delete({ name: "g_state", path: "/api/google" });
  const back = (q: string) => NextResponse.redirect(new URL(`/settings?google=${q}`, url.origin));
  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("invalid_state");
  try { await exchangeCode(supabase, code, url.origin); } catch (e) { return back("error&msg=" + encodeURIComponent((e as Error).message)); }
  return back("connected");
}
