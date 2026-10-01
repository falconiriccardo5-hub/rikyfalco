import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ask } from "@/server/assistant";

export const dynamic = "force-dynamic";

const Body = z.object({ message: z.string().min(1).max(500) });

/** Assistente dell'app: accessibile solo alla sessione admin, come il resto di /(app). */
export async function POST(req: Request) {
  const { supabase } = await requireAdmin();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "messaggio non valido" }, { status: 400 });
  try {
    return NextResponse.json(await ask(supabase, parsed.data.message));
  } catch {
    return NextResponse.json({ error: "non sono riuscito a leggere i dati" }, { status: 500 });
  }
}
