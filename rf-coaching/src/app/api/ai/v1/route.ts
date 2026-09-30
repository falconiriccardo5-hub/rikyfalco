import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/server/admin";
import { sha256 } from "@/server/crypto";
import { ACTIONS, describeActions, type ActionName } from "@/server/ai";
import { runBackup } from "@/server/backup";
import { syncCalendar } from "@/server/jobs";
export const dynamic = "force-dynamic";
const hits = new Map<string, number[]>();
async function auth(req: Request) {
  const sb = adminClient("ai");
  if (!sb) return { error: NextResponse.json({ error: "API AI non configurata (SUPABASE_SERVICE_ROLE_KEY mancante)" }, { status: 503 }) };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "token mancante" }, { status: 401 }) };
  const { data } = await sb.from("api_tokens").select("id,revoked_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!data || data.revoked_at) return { error: NextResponse.json({ error: "token non valido" }, { status: 401 }) };
  const now = Date.now(); const list = (hits.get(data.id) ?? []).filter((t) => now - t < 60000);
  if (list.length >= 60) return { error: NextResponse.json({ error: "rate limit" }, { status: 429 }) };
  hits.set(data.id, [...list, now]);
  await sb.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { sb };
}
export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  return NextResponse.json({ version: 1, usage: "POST { action, input, dry_run? }", actions: describeActions() });
}
const Body = z.object({ action: z.string(), input: z.record(z.string(), z.unknown()).default({}), dry_run: z.boolean().default(false) });
export async function POST(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const sb = a.sb!;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "body non valido", details: parsed.error.issues }, { status: 400 });
  const { action, input, dry_run } = parsed.data;
  const def = ACTIONS[action as ActionName];
  if (!def) return NextResponse.json({ error: `azione sconosciuta: ${action}`, actions: Object.keys(ACTIONS) }, { status: 400 });
  const inp = def.input.safeParse(input);
  if (!inp.success) return NextResponse.json({ error: "input non valido", details: inp.error.issues }, { status: 400 });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (def.run as any)(sb, inp.data, dry_run);
    const post: Record<string, unknown> = {};
    if (def.write && !dry_run) {
      try { post.backup = await runBackup(sb, "automatico"); } catch (e) { post.backup = { error: (e as Error).message }; }
      if (action === "create_appointment") { try { post.calendar = await syncCalendar(sb); } catch (e) { post.calendar = { error: (e as Error).message }; } }
    }
    return NextResponse.json({ ok: true, action, dry_run, result, ...post, audit: def.write && !dry_run ? "registrato in Attività (fonte: AI Assistant)" : undefined });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 422 });
  }
}
