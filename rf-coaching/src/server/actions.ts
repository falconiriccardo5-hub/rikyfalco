"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import * as svc from "./services";
import * as visits from "./visits";
import { sha256, randomToken } from "./crypto";
import { disconnect as googleDisconnect } from "./integrations/google";
import { runBackup } from "./backup";
import { render, sendAndLog, varsFor } from "./integrations/email";
import { syncCalendar } from "./jobs";
export type ActionState = { error?: string; ok?: boolean } | undefined;
const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")));
const errMsg = (e: unknown) => {
  if (e && typeof e === "object" && "issues" in e) return (e as { issues: { message: string }[] }).issues.map((i) => i.message).join(" · ");
  return e instanceof Error ? e.message : "Errore imprevisto";
};
const refresh = (clientId?: string) => {
  revalidatePath("/", "layout");
  if (clientId) revalidatePath(`/clients/${clientId}`);
};
export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password" };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message.includes("rate") ? "Troppi tentativi, riprova tra poco" : "Credenziali non valide" };
  redirect("/dashboard");
}
export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  let id: string;
  try {
    const data = obj(fd);
    const c = await svc.createClient(supabase, data);
    id = c.id;
    if (data.with_program === "on") await svc.createProgram(supabase, id, data);
  } catch (e) { return { error: errMsg(e) }; }
  refresh();
  redirect(`/clients/${id}`);
}
export async function updateClientAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.updateClient(supabase, id, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(id); return { ok: true };
}
export async function archiveClientAction(id: string, archived: boolean) {
  const { supabase } = await requireAdmin();
  await svc.setArchived(supabase, id, archived); refresh(id);
}
export async function deleteClientAction(id: string) {
  const { supabase } = await requireAdmin();
  await svc.deleteClient(supabase, id); refresh(); redirect("/clients");
}
export async function createProgramAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.createProgram(supabase, clientId, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(clientId); return { ok: true };
}
export async function updateProgramAction(programId: string, clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.updateProgram(supabase, programId, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(clientId); return { ok: true };
}
export async function lessonAction(programId: string, clientId: string, delta: number) {
  const { supabase } = await requireAdmin();
  await svc.adjustLessons(supabase, programId, delta); refresh(clientId);
}
export async function recordPaymentAction(paymentId: string, clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.recordPayment(supabase, paymentId, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(clientId); return { ok: true };
}
export async function undoPaymentAction(paymentId: string, clientId: string) {
  const { supabase } = await requireAdmin();
  await svc.undoPayment(supabase, paymentId); refresh(clientId);
}
export async function addPaymentAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.addPayment(supabase, clientId, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(clientId); return { ok: true };
}
export async function deletePaymentAction(paymentId: string, clientId: string) {
  const { supabase } = await requireAdmin();
  await svc.deletePayment(supabase, paymentId); refresh(clientId);
}
export async function markReadAction(id: string | "all") {
  const { supabase } = await requireAdmin();
  await svc.markNotifications(supabase, id === "all" ? "all" : [id]); refresh();
}
export async function runAutomationsAction() {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("run_daily_automations");
  if (error) throw new Error(error.message);
  refresh();
}
/* ---------------- Phase 4-5 ---------------- */
const localToISO = (d: string, t: string) => {
  // interpret date+time as Europe/Rome wall-clock
  const guess = new Date(`${d}T${t}:00Z`);
  const rome = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (rome.getTime() - utc.getTime())).toISOString();
};
function apptFromForm(fd: FormData) {
  const d = String(fd.get("date")); const t = String(fd.get("time")); const mins = Number(fd.get("duration") || 60);
  const starts_at = localToISO(d, t);
  return { client_id: String(fd.get("client_id") || "") || null, starts_at, ends_at: new Date(new Date(starts_at).getTime() + mins * 60000).toISOString(), type: String(fd.get("type") || "allenamento"), notes: String(fd.get("notes") || "") || null };
}
export async function createAppointmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.createAppointment(supabase, apptFromForm(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(String(fd.get("client_id") || "") || undefined); return { ok: true };
}
export async function updateAppointmentAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.updateAppointment(supabase, id, apptFromForm(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(); return { ok: true };
}
export async function deleteAppointmentAction(id: string) {
  const { supabase } = await requireAdmin();
  await svc.deleteAppointment(supabase, id); refresh();
}
export async function syncCalendarAction() {
  const { supabase } = await requireAdmin();
  await syncCalendar(supabase); refresh();
}
export async function sendEmailAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from("clients").select("first_name,last_name,email").eq("id", clientId).single();
  if (!c?.email) return { error: "Il cliente non ha un indirizzo email" };
  const v = varsFor(c);
  const subject = render(String(fd.get("subject") || ""), v).trim();
  const text = render(String(fd.get("body") || ""), v).trim();
  if (!subject || !text) return { error: "Oggetto e testo sono obbligatori" };
  const r = await sendAndLog(supabase, { to: c.email, subject, text, clientId, type: "manuale" });
  refresh(clientId);
  return r.ok ? { ok: true } : { error: r.error };
}
export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.saveSettings(supabase, obj(fd)); } catch (e) { return { error: errMsg(e) }; }
  refresh(); return { ok: true };
}
export async function saveTemplateAction(key: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { await svc.saveTemplate(supabase, key, { subject: fd.get("subject") ?? "", body: fd.get("body") ?? "", enabled: fd.get("enabled") ?? "" }); } catch (e) { return { error: errMsg(e) }; }
  refresh(); return { ok: true };
}
export async function backupNowAction(): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try {
    const r = await runBackup(supabase, "manuale"); refresh();
    return r.ok ? { ok: true } : { error: r.error };
  } catch (e) { return { error: errMsg(e) }; }
}
export async function restoreAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (fd.get("confirm") !== "RIPRISTINA") return { error: "Scrivi RIPRISTINA per confermare" };
  let snap: unknown;
  const file = fd.get("file"); const backupId = String(fd.get("backup_id") || "");
  try {
    if (backupId) {
      const { data } = await supabase.from("backups").select("snapshot").eq("id", backupId).single();
      snap = data?.snapshot;
    } else if (file instanceof File && file.size > 0) {
      if (file.size > 20_000_000) return { error: "File troppo grande" };
      snap = JSON.parse(await file.text());
    }
    if (!snap) return { error: "Seleziona un backup o carica un file JSON" };
    const { error } = await supabase.rpc("restore_snapshot", { snap });
    if (error) return { error: error.message };
  } catch (e) { return { error: errMsg(e) }; }
  refresh(); return { ok: true };
}
export async function googleDisconnectAction() {
  const { supabase } = await requireAdmin();
  await googleDisconnect(supabase); refresh();
}
export async function createTokenAction(_: { token?: string; error?: string } | undefined, fd: FormData): Promise<{ token?: string; error?: string }> {
  const { supabase } = await requireAdmin();
  const name = String(fd.get("name") || "").trim() || "Claude";
  const token = "rfc_" + randomToken(32);
  const { error } = await supabase.from("api_tokens").insert({ name, token_hash: sha256(token), prefix: token.slice(0, 10) });
  if (error) return { error: error.message };
  refresh(); return { token };
}
export async function revokeTokenAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("api_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id); refresh();
}
export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const p = String(fd.get("password") || ""); const c = String(fd.get("confirm") || "");
  if (p.length < 12) return { error: "Minimo 12 caratteri" };
  if (p !== c) return { error: "Le password non coincidono" };
  const { error } = await supabase.auth.updateUser({ password: p });
  return error ? { error: error.message } : { ok: true };
}
export async function signOutEverywhereAction() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
// ---- Visite
export async function createVisitAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  let id: string;
  try { id = (await visits.createVisit(supabase, clientId, obj(fd))).id; } catch (e) { return { error: errMsg(e) }; }
  refresh(clientId);
  redirect(`/visite/${id}`);
}
export async function saveVisitAction(id: string, answers: unknown, opts: { complete?: boolean; visit_date?: string }): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try { refresh(await visits.saveVisit(supabase, id, answers, opts)); } catch (e) { return { error: errMsg(e) }; }
  revalidatePath(`/visite/${id}`);
  return { ok: true };
}
export async function reopenVisitAction(id: string) {
  const { supabase } = await requireAdmin();
  refresh(await visits.reopenVisit(supabase, id)); revalidatePath(`/visite/${id}`);
}
export async function sendBackVisitAction(id: string) {
  const { supabase } = await requireAdmin();
  refresh(await visits.sendBackToClient(supabase, id)); revalidatePath(`/visite/${id}`);
}
export async function deleteVisitAction(id: string) {
  const { supabase } = await requireAdmin();
  const clientId = await visits.deleteVisit(supabase, id);
  refresh(clientId); redirect(`/clients/${clientId}`);
}
export async function visitLinkAction(clientId: string): Promise<{ token?: string; error?: string }> {
  const { supabase } = await requireAdmin();
  try { return { token: await visits.ensurePortalToken(supabase, clientId) }; } catch (e) { return { error: errMsg(e) }; }
}
export async function runVisitAutomationsAction() {
  const { supabase } = await requireAdmin();
  await supabase.rpc("run_visit_automations"); refresh();
}
// Portale cliente: nessun login, il token del link identifica il cliente (controllo nelle funzioni SQL).
export async function submitClientVisitAction(token: string, visitId: string, answers: unknown, final: boolean): Promise<ActionState> {
  try { await visits.submitClientVisit(await supabaseServer(), token, visitId, answers, final); } catch (e) { return { error: errMsg(e) }; }
  if (final) revalidatePath(`/visita/${token}`);
  return { ok: true };
}
