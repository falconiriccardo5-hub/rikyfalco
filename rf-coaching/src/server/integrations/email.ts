import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtDateLong, eur } from "@/lib/format";
/** Provider-agnostic email layer. Pick the provider with EMAIL_PROVIDER (default: resend). */
export type EmailMessage = { to: string; subject: string; text: string; replyTo?: string };
export interface EmailProvider { name: string; send(m: EmailMessage): Promise<void> }
const from = () => process.env.EMAIL_FROM || "Riccardo Falconi Coaching <onboarding@resend.dev>";
const html = (text: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px">${text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`;
async function ok(r: Response) { if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
const resend: EmailProvider = {
  name: "resend",
  async send(m) {
    await ok(await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: [m.to], subject: m.subject, text: m.text, html: html(m.text), reply_to: m.replyTo }),
    }));
  },
};
const sendgrid: EmailProvider = {
  name: "sendgrid",
  async send(m) {
    await ok(await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ personalizations: [{ to: [{ email: m.to }] }], from: { email: from().replace(/.*<|>/g, "") }, subject: m.subject,
        content: [{ type: "text/plain", value: m.text }, { type: "text/html", value: html(m.text) }] }),
    }));
  },
};
const mailgun: EmailProvider = {
  name: "mailgun",
  async send(m) {
    const body = new URLSearchParams({ from: from(), to: m.to, subject: m.subject, text: m.text, html: html(m.text) });
    await ok(await fetch(`https://api.eu.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: "POST", headers: { Authorization: "Basic " + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64") }, body,
    }));
  },
};
export function emailProvider(): EmailProvider | null {
  const p = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  if (p === "resend" && process.env.RESEND_API_KEY) return resend;
  if (p === "sendgrid" && process.env.SENDGRID_API_KEY) return sendgrid;
  if (p === "mailgun" && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return mailgun;
  return null; // SMTP: add an adapter here (e.g. nodemailer) implementing EmailProvider
}
export const emailConfigured = () => emailProvider() !== null;
export function render(tpl: string, vars: Record<string, string | number | null | undefined>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
export function varsFor(c: { first_name: string; last_name: string }, extra: { end_date?: string; due_date?: string; amount?: number } = {}) {
  return { nome: c.first_name, cognome: c.last_name, data_fine: fmtDateLong(extra.end_date), data_scadenza: fmtDateLong(extra.due_date), importo: extra.amount != null ? eur(extra.amount).replace("€", "").trim() : "" };
}
/** Sends and always writes an email_logs row (inviata / errore / non_configurato). */
export async function sendAndLog(sb: SupabaseClient, m: EmailMessage & { clientId: string; type: string; reminderId?: string }) {
  const provider = emailProvider();
  const base = { client_id: m.clientId, type: m.type, to_email: m.to, subject: m.subject, reminder_id: m.reminderId ?? null };
  if (!provider) {
    await sb.from("email_logs").insert({ ...base, status: "non_configurato" });
    return { ok: false as const, error: "Provider email non configurato" };
  }
  try {
    await provider.send(m);
    await sb.from("email_logs").insert({ ...base, status: "inviata", sent_at: new Date().toISOString() });
    return { ok: true as const };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await sb.from("email_logs").insert({ ...base, status: "errore", error });
    return { ok: false as const, error };
  }
}
