import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonthsISO, addDaysISO } from "@/lib/format";
import { accessToken, pushAppointment, deleteEvent } from "./integrations/google";
/**
 * Service layer — the ONLY place that writes business data.
 * Used by UI server actions today and by the AI API (phase 5) tomorrow.
 * Every write is validated here and audited by DB triggers.
 */
type SB = SupabaseClient;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const optText = z.string().trim().max(2000).optional().transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(100000);
export const METHODS = ["bonifico", "contanti", "carta", "paypal", "altro"] as const;
export const ClientInput = z.object({
  first_name: z.string().trim().min(1, "Nome obbligatorio").max(80),
  last_name: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Email non valida")]).optional().transform((v) => v || null),
  phone: optText,
  birth_date: z.union([z.literal(""), date]).optional().transform((v) => v || null),
  notes: optText,
});
export const ProgramInput = z.object({
  type: z.enum(["live", "online", "misto"]),
  duration: z.enum(["3m", "6m", "12m", "10l"]),
  start_date: date,
  end_date: z.union([z.literal(""), date]).optional(),
  total_price: money,
  lessons_total: z.coerce.number().int().min(0).max(500).default(0),
  installments: z.coerce.number().int().min(1).max(24).default(1),
  payment_method: z.enum(METHODS).default("bonifico"),
});
export function defaultEndDate(duration: string, start: string) {
  const m = { "3m": 3, "6m": 6, "12m": 12, "10l": 2 }[duration] ?? 3;
  return addMonthsISO(start, m);
}
function check<T>(res: { data: T; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
export async function createClient(sb: SB, raw: unknown) {
  const input = ClientInput.parse(raw);
  return check(await sb.from("clients").insert(input).select("id").single()) as { id: string };
}
export async function updateClient(sb: SB, id: string, raw: unknown) {
  const input = ClientInput.parse(raw);
  check(await sb.from("clients").update(input).eq("id", id));
}
export async function setArchived(sb: SB, id: string, archived: boolean) {
  check(await sb.from("clients").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id));
}
export async function deleteClient(sb: SB, id: string) {
  check(await sb.from("clients").delete().eq("id", id));
}
/** Creates the program and its installment schedule (one payment row per rata, monthly). */
export async function createProgram(sb: SB, clientId: string, raw: unknown) {
  const p = ProgramInput.parse(raw);
  const end_date = p.end_date || defaultEndDate(p.duration, p.start_date);
  if (end_date < p.start_date) throw new Error("La data fine deve essere successiva all'inizio");
  const program = check(
    await sb.from("programs").insert({ ...p, end_date, client_id: clientId }).select("id").single(),
  ) as { id: string };
  const base = Math.floor((p.total_price / p.installments) * 100) / 100;
  const rows = Array.from({ length: p.installments }, (_, i) => ({
    client_id: clientId, program_id: program.id, due_date: addMonthsISO(p.start_date, i),
    amount: i === p.installments - 1 ? Math.round((p.total_price - base * (p.installments - 1)) * 100) / 100 : base,
  }));
  if (p.total_price > 0) check(await sb.from("payments").insert(rows));
  return program;
}
export const ProgramUpdate = z.object({
  type: z.enum(["live", "online", "misto"]).optional(),
  start_date: date.optional(),
  end_date: date.optional(),
  lessons_total: z.coerce.number().int().min(0).max(500).optional(),
  total_price: money.optional(),
  manual_status: z.enum(["", "sospeso", "terminato"]).optional().transform((v) => (v === undefined ? undefined : v || null)),
});
export async function updateProgram(sb: SB, id: string, raw: unknown) {
  const input = ProgramUpdate.parse(raw);
  if (input.start_date && input.end_date && input.end_date < input.start_date) throw new Error("La data fine deve essere successiva all'inizio");
  check(await sb.from("programs").update(input).eq("id", id));
  // moving the end date re-opens the renewal reminder so the cron re-evaluates it
  if (input.end_date) check(await sb.from("reminders").delete().eq("program_id", id).in("type", ["rinnovo", "scadenza"]).eq("status", "aperto"));
}
export async function adjustLessons(sb: SB, programId: string, delta: number) {
  const cur = check(await sb.from("programs").select("lessons_completed,lessons_total").eq("id", programId).single()) as { lessons_completed: number; lessons_total: number };
  const next = Math.max(0, Math.min(cur.lessons_total || 999, cur.lessons_completed + delta));
  check(await sb.from("programs").update({ lessons_completed: next }).eq("id", programId));
}
export const PaymentRecord = z.object({
  paid_date: date,
  paid_amount: money,
  method: z.enum(METHODS),
});
export async function recordPayment(sb: SB, paymentId: string, raw: unknown) {
  const input = PaymentRecord.parse(raw);
  check(await sb.from("payments").update(input).eq("id", paymentId));
}
export async function undoPayment(sb: SB, paymentId: string) {
  check(await sb.from("payments").update({ paid_date: null, paid_amount: null, method: null }).eq("id", paymentId));
}
export const PaymentNew = z.object({ amount: money, due_date: date, program_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null) });
export async function addPayment(sb: SB, clientId: string, raw: unknown) {
  const input = PaymentNew.parse(raw);
  check(await sb.from("payments").insert({ ...input, client_id: clientId }));
}
export async function deletePayment(sb: SB, paymentId: string) {
  check(await sb.from("payments").delete().eq("id", paymentId));
}
export async function markNotifications(sb: SB, ids: string[] | "all") {
  let q = sb.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids !== "all") q = q.in("id", ids);
  check(await q);
}
export { addDaysISO };
/* ---------------- Appointments (synced to Google Calendar when connected) ---------------- */
export const AppointmentInput = z.object({
  client_id: z.string().uuid().nullable().optional(),
  starts_at: z.string().min(10),
  ends_at: z.string().min(10),
  type: z.enum(["allenamento", "consulenza", "check", "altro"]).default("allenamento"),
  notes: z.string().max(1000).nullable().optional(),
}).refine((a) => new Date(a.ends_at) > new Date(a.starts_at), "La fine deve essere dopo l'inizio");
async function syncOne(sb: SB, id: string) {
  const token = await accessToken(sb).catch(() => null);
  if (!token) return;
  const { data: a } = await sb.from("appointments").select("id,starts_at,ends_at,type,notes,google_event_id,client:clients(first_name,last_name)").eq("id", id).single();
  if (!a) return;
  const ev = await pushAppointment(token, a as never);
  if (ev.id !== a.google_event_id) await sb.from("appointments").update({ google_event_id: ev.id }).eq("id", id);
}
export async function createAppointment(sb: SB, raw: unknown) {
  const input = AppointmentInput.parse(raw);
  const a = check(await sb.from("appointments").insert(input).select("id,client_id").single()) as { id: string; client_id: string | null };
  const { data: c } = input.client_id ? await sb.from("clients").select("first_name,last_name").eq("id", input.client_id).single() : { data: null };
  await sb.from("notifications").insert({ type: "nuovo_appuntamento", title: `Nuovo appuntamento${c ? ` — ${c.first_name} ${c.last_name}` : ""}`, body: new Date(input.starts_at).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "medium", timeStyle: "short" }), client_id: input.client_id ?? null });
  await syncOne(sb, a.id).catch(() => {});
  return a;
}
export async function updateAppointment(sb: SB, id: string, raw: unknown) {
  const input = AppointmentInput.parse(raw);
  check(await sb.from("appointments").update(input).eq("id", id));
  await syncOne(sb, id).catch(() => {});
}
export async function deleteAppointment(sb: SB, id: string) {
  const { data } = await sb.from("appointments").select("google_event_id").eq("id", id).single();
  check(await sb.from("appointments").delete().eq("id", id));
  if (data?.google_event_id) { const t = await accessToken(sb).catch(() => null); if (t) await deleteEvent(t, data.google_event_id); }
}
/* ---------------- Settings & templates ---------------- */
export const SettingsInput = z.object({
  renewal_reminder_days: z.coerce.number().int().min(1).max(120),
  payment_reminder_days: z.coerce.number().int().min(1).max(60),
  backup_frequency: z.enum(["daily", "weekly", "off"]),
});
export async function saveSettings(sb: SB, raw: unknown) {
  const s = SettingsInput.parse(raw);
  const rows = Object.entries(s).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  check(await sb.from("settings").upsert(rows));
}
export const TemplateInput = z.object({ subject: z.string().max(200), body: z.string().min(1).max(5000), enabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on") });
export async function saveTemplate(sb: SB, key: string, raw: unknown) {
  if (!["rata", "rinnovo", "scadenza", "manuale"].includes(key)) throw new Error("Template sconosciuto");
  const t = TemplateInput.parse(raw);
  check(await sb.from("email_templates").update({ ...t, enabled: key === "manuale" ? true : t.enabled, updated_at: new Date().toISOString() }).eq("key", key));
}
