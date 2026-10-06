import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { authUrl, googleConfigured } from "@/server/integrations/google";
import { randomToken } from "@/server/crypto";
export async function GET(req: Request) {
  await requireAdmin();
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) return NextResponse.redirect(new URL("/settings?google=not_configured", origin));
  const state = randomToken(24);
  (await cookies()).set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/google" });
  return NextResponse.redirect(authUrl(origin, state));
}
