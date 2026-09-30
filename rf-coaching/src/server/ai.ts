import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as svc from "./services";
import { todayISO, addDaysISO } from "@/lib/format";
/**
 * AI action layer: AI REQUEST → AUTH (api token) → VALIDATION (zod) → SERVICES → AUDIT (trigger, source=ai) → BACKUP.
 * The AI can only call these actions — never raw SQL or files.
 * Every write action supports dry_run: it returns the before/after without writing.
 */
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const method = z.enum(svc.METHODS);
async function resolveClient(sb: SupabaseClient, id?: string, name?: string) {
  if (id) {
    const { data } = await sb.from("clients").select("id,first_name,last_name,email").eq("id", id).maybeSingle();
    if (!data) throw new Error("Cliente non trovato");
    return data;
  }
  const words = (name ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) throw new Error("Serve client_id o client_name");
  const { data } = await sb.from("clients").select("id,first_name,last_name,email").is("archived_at", null);
  const hits = (data ?? []).filter((c) => words.every((w) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(w)));
  if (hits.length === 0) throw new Error(`Nessun cliente corrisponde a "${name}"`);
  if (hits.length > 1) throw new Error(`Nome ambiguo: ${hits.map((h) => `${h.first_name} ${h.last_name} (${h.id})`).join(", ")}`);
  return hits[0];
}
async function currentProgram(sb: SupabaseClient, clientId: string, programId?: string) {
  let q = sb.from("programs").select("*").eq("client_id", clientId).order("start_date", { ascending: false }).limit(1);
  if (programId) q = sb.from("programs").select("*").eq("id", programId).eq("client_id", clientId).limit(1);
  const { data } = await q;
  if (!data?.[0]) throw new Error("Nessun percorso trovato per il cliente");
  return data[0];
}
const who = { client_id: uuid.optional(), client_name: z.string().max(120).optional() };
export const ACTIONS = {
  find_client: {
    description: "Cerca clienti per nome, email o telefono.",
    input: z.object({ query: z.string().min(1).max(120) }),
    write: false,
    async run(sb: SupabaseClient, i: { query: string }) {
      const q = i.query.toLowerCase();
      const { data } = await sb.from("clients").select("id,first_name,last_name,email,phone,archived_at");
      return (data ?? []).filter((c) => [c.first_name, c.last_name, `${c.first_name} ${c.last_name}`, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)));
    },
  },
  get_client: {
    description: "Scheda completa: dati, percorso corrente, rate, prossimi appuntamenti.",
    input: z.object(who),
    write: false,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string }) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      const [p, pay, ap] = await Promise.all([
        sb.from("program_overview").select("*").eq("client_id", c.id).order("start_date", { ascending: false }),
        sb.from("payment_overview").select("id,amount,due_date,paid_date,paid_amount,method,status").eq("client_id", c.id).order("due_date"),
        sb.from("appointments").select("id,starts_at,ends_at,type").eq("client_id", c.id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(10),
      ]);
      return { client: c, programs: p.data, payments: pay.data, upcoming_appointments: ap.data };
    },
  },
  list_due: {
    description: "Rate scadute/in arrivo e percorsi in scadenza entro N giorni (default 30).",
    input: z.object({ days: z.number().int().min(1).max(365).default(30) }),
    write: false,
    async run(sb: SupabaseClient, i: { days: number }) {
      const until = addDaysISO(todayISO(), i.days);
      const [pay, pr] = await Promise.all([
        sb.from("payment_overview").select("id,client_id,first_name,last_name,amount,due_date,status").is("paid_date", null).lte("due_date", until).order("due_date"),
        sb.from("program_overview").select("id,client_id,first_name,last_name,end_date,days_left,status").is("manual_status", null).lte("end_date", until).order("end_date"),
      ]);
      return { payments: pay.data, programs: pr.data };
    },
  },
  record_payment: {
    description: "Registra un pagamento. Se non passi payment_id usa la prima rata non pagata (o quella del mese indicato, es. '2026-10').",
    input: z.object({ ...who, amount: z.number().positive(), method, paid_date: date.optional(), payment_id: uuid.optional(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() }),
    write: true,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string; amount: number; method: (typeof svc.METHODS)[number]; paid_date?: string; payment_id?: string; month?: string }, dry: boolean) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      let q = sb.from("payments").select("*").eq("client_id", c.id).is("paid_date", null).order("due_date").limit(1);
      if (i.payment_id) q = sb.from("payments").select("*").eq("id", i.payment_id).eq("client_id", c.id).limit(1);
      else if (i.month) q = sb.from("payments").select("*").eq("client_id", c.id).is("paid_date", null).gte("due_date", `${i.month}-01`).lte("due_date", `${i.month}-31`).limit(1);
      const { data } = await q;
      const p = data?.[0];
      if (!p) throw new Error("Nessuna rata aperta corrispondente");
      const after = { paid_date: i.paid_date ?? todayISO(), paid_amount: i.amount, method: i.method };
      if (!dry) await svc.recordPayment(sb, p.id, after);
      return { client: `${c.first_name} ${c.last_name}`, payment_id: p.id, due_date: p.due_date, before: { paid_date: p.paid_date, paid_amount: p.paid_amount, method: p.method }, after };
    },
  },
  update_program_dates: {
    description: "Sposta inizio e/o fine del percorso corrente (o di program_id). Ricalcola stati e reminder.",
    input: z.object({ ...who, program_id: uuid.optional(), start_date: date.optional(), end_date: date.optional() }).refine((v) => v.start_date || v.end_date, "Serve start_date o end_date"),
    write: true,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string; program_id?: string; start_date?: string; end_date?: string }, dry: boolean) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      const p = await currentProgram(sb, c.id, i.program_id);
      const after = { ...(i.start_date && { start_date: i.start_date }), ...(i.end_date && { end_date: i.end_date }) };
      if (!dry) await svc.updateProgram(sb, p.id, { start_date: i.start_date ?? p.start_date, end_date: i.end_date ?? p.end_date });
      return { client: `${c.first_name} ${c.last_name}`, program_id: p.id, before: { start_date: p.start_date, end_date: p.end_date }, after };
    },
  },
  adjust_lessons: {
    description: "Aggiunge (delta positivo) o toglie lezioni effettuate al percorso corrente.",
    input: z.object({ ...who, delta: z.number().int().min(-50).max(50) }),
    write: true,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string; delta: number }, dry: boolean) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      const p = await currentProgram(sb, c.id);
      const next = Math.max(0, Math.min(p.lessons_total || 999, p.lessons_completed + i.delta));
      if (!dry) await svc.adjustLessons(sb, p.id, i.delta);
      return { client: `${c.first_name} ${c.last_name}`, before: p.lessons_completed, after: next, total: p.lessons_total };
    },
  },
  add_note: {
    description: "Aggiunge una nota datata alla scheda cliente.",
    input: z.object({ ...who, note: z.string().min(1).max(2000) }),
    write: true,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string; note: string }, dry: boolean) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      const { data: full } = await sb.from("clients").select("*").eq("id", c.id).single();
      const notes = [full.notes, `[${todayISO()}] ${i.note}`].filter(Boolean).join("\n");
      if (!dry) { const { error } = await sb.from("clients").update({ notes }).eq("id", c.id); if (error) throw new Error(error.message); }
      return { client: `${c.first_name} ${c.last_name}`, before: full.notes, after: notes };
    },
  },
  create_appointment: {
    description: "Crea un appuntamento (starts_at ISO con fuso, es. 2026-10-02T18:00:00+02:00).",
    input: z.object({ ...who, starts_at: z.string().datetime({ offset: true }), duration_min: z.number().int().min(15).max(480).default(60), type: z.enum(["allenamento", "consulenza", "check", "altro"]).default("allenamento"), notes: z.string().max(1000).optional() }),
    write: true,
    async run(sb: SupabaseClient, i: { client_id?: string; client_name?: string; starts_at: string; duration_min: number; type: string; notes?: string }, dry: boolean) {
      const c = await resolveClient(sb, i.client_id, i.client_name);
      const row = { client_id: c.id, starts_at: new Date(i.starts_at).toISOString(), ends_at: new Date(new Date(i.starts_at).getTime() + i.duration_min * 60000).toISOString(), type: i.type, notes: i.notes ?? null };
      if (dry) return { client: `${c.first_name} ${c.last_name}`, after: row };
      const a = await svc.createAppointment(sb, row);
      return { client: `${c.first_name} ${c.last_name}`, appointment_id: a.id, after: row };
    },
  },
} as const;
export type ActionName = keyof typeof ACTIONS;
export function describeActions() {
  return Object.fromEntries(Object.entries(ACTIONS).map(([k, a]) => [k, { description: a.description, write: a.write, input: z.toJSONSchema(a.input) }]));
}
