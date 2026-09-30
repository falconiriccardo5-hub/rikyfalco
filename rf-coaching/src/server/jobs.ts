import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { render, sendAndLog, varsFor, emailConfigured } from "./integrations/email";
import { runBackup } from "./backup";
import { accessToken, pushAppointment } from "./integrations/google";
import { todayISO, addDaysISO } from "@/lib/format";
/** Sends the automatic emails for reminders opened in the last 7 days (each reminder at most once). */
export async function sendReminderEmails(sb: SupabaseClient) {
  if (!emailConfigured()) return { sent: 0, skipped: "provider non configurato" };
  const { data: tpls } = await sb.from("email_templates").select("*").eq("enabled", true);
  const byKey = new Map((tpls ?? []).map((t) => [t.key, t]));
  if (!byKey.size) return { sent: 0, skipped: "nessun template attivo" };
  const since = addDaysISO(todayISO(), -7);
  const { data: rems } = await sb.from("reminders")
    .select("id,type,client_id,program_id,payment_id,created_at,clients(first_name,last_name,email,archived_at),programs(end_date),payments(due_date,amount,paid_date)")
    .eq("status", "aperto").in("type", ["rata", "rinnovo", "scadenza"]).gte("created_at", since);
  const { data: done } = await sb.from("email_logs").select("reminder_id").eq("status", "inviata").not("reminder_id", "is", null);
  const sentIds = new Set((done ?? []).map((d) => d.reminder_id));
  let sent = 0; const errors: string[] = [];
  for (const r of (rems ?? []) as unknown as { id: string; type: string; client_id: string; clients: { first_name: string; last_name: string; email: string | null; archived_at: string | null } | null; programs: { end_date: string } | null; payments: { due_date: string; amount: number; paid_date: string | null } | null }[]) {
    const t = byKey.get(r.type); const c = r.clients;
    if (!t || !c?.email || c.archived_at || sentIds.has(r.id) || r.payments?.paid_date) continue;
    const v = varsFor(c, { end_date: r.programs?.end_date, due_date: r.payments?.due_date, amount: r.payments?.amount });
    const res = await sendAndLog(sb, { to: c.email, subject: render(t.subject, v), text: render(t.body, v), clientId: r.client_id, type: r.type, reminderId: r.id });
    if (res.ok) sent++; else errors.push(res.error);
  }
  return { sent, errors };
}
export async function syncCalendar(sb: SupabaseClient) {
  const token = await accessToken(sb);
  if (!token) return { pushed: 0, skipped: "Google Calendar non collegato" };
  const { data } = await sb.from("appointments").select("id,starts_at,ends_at,type,notes,google_event_id,client:clients(first_name,last_name)")
    .is("google_event_id", null).gte("starts_at", new Date().toISOString()).limit(50);
  let pushed = 0;
  for (const a of (data ?? []) as never[]) {
    const ev = await pushAppointment(token, a);
    await sb.from("appointments").update({ google_event_id: ev.id }).eq("id", (a as { id: string }).id);
    pushed++;
  }
  return { pushed };
}
/** 08:00 Europe/Rome — called by Vercel Cron. Each step is isolated so one failure doesn't block the others. */
export async function dailyJob(sb: SupabaseClient) {
  const report: Record<string, unknown> = { started_at: new Date().toISOString() };
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { report[name] = await fn(); } catch (e) { report[name] = { error: (e as Error).message }; }
  };
  await step("reminders", async () => (await sb.rpc("run_daily_automations")).data);
  await step("emails", () => sendReminderEmails(sb));
  await step("backup", async () => {
    const { data } = await sb.from("settings").select("value").eq("key", "backup_frequency").maybeSingle();
    const freq = (data?.value as string) ?? "daily";
    const isMonday = new Date().getDay() === 1;
    if (freq === "off" || (freq === "weekly" && !isMonday)) return { skipped: freq };
    return runBackup(sb, "automatico");
  });
  await step("calendar", () => syncCalendar(sb));
  await step("prune", async () => (await sb.rpc("prune_backups")).error?.message ?? "ok");
  report.finished_at = new Date().toISOString();
  await sb.from("settings").upsert({ key: "last_daily_job", value: report, updated_at: new Date().toISOString() });
  return report;
}
