import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; ms: number; detail?: string };

async function timed(name: string, run: () => Promise<string | undefined>): Promise<Check> {
  const t0 = Date.now();
  try {
    const detail = await run();
    return { name, ok: true, ms: Date.now() - t0, detail };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t0, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Public health probe for the daily guardian and uptime pings. It reports only
 * whether each dependency answers, never any data, so it is safe unauthenticated.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const checks: Check[] = [
    await timed("env", async () => {
      const missing = (["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"] as const).filter((k) => !process.env[k]);
      if (missing.length) throw new Error(`variabili mancanti: ${missing.join(", ")}`);
      return "tutte le variabili richieste sono presenti";
    }),
    await timed("supabase-rest", async () => {
      if (!url || !anon) throw new Error("Supabase non configurato");
      const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: anon }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`PostgREST ha risposto ${res.status}`);
      return "raggiungibile";
    }),
    await timed("supabase-auth", async () => {
      if (!url) throw new Error("Supabase non configurato");
      const res = await fetch(`${url}/auth/v1/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Auth ha risposto ${res.status}`);
      return "raggiungibile";
    }),
  ];
  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    { ok, checkedAt: new Date().toISOString(), commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null, checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
