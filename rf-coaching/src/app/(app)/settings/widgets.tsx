"use client";
import { useActionState, useState } from "react";
import { Copy, Check } from "lucide-react";
import * as A from "@/server/actions";
import { Button, Field } from "@/components/ui";
import { ActButton } from "@/components/forms/action-form";
const Msg = ({ s }: { s?: { error?: string; ok?: boolean } }) => (s?.error ? <p className="text-sm text-danger">{s.error}</p> : s?.ok ? <p className="text-sm text-ok">Salvato ✓</p> : null);
export function ReminderForm({ renewal, payment, backup }: { renewal: number; payment: number; backup: string }) {
  const [s, act, p] = useActionState(A.saveSettingsAction, undefined);
  return (
    <form action={act} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <Field label="Reminder rinnovo (giorni prima)"><input type="number" name="renewal_reminder_days" min={1} max={120} defaultValue={renewal} className="field" /></Field>
      <Field label="Reminder rata (giorni prima)"><input type="number" name="payment_reminder_days" min={1} max={60} defaultValue={payment} className="field" /></Field>
      <Field label="Backup automatico">
        <select name="backup_frequency" defaultValue={backup} className="field"><option value="daily">Ogni giorno</option><option value="weekly">Ogni settimana</option><option value="off">Disattivato</option></select>
      </Field>
      <Button variant="primary" disabled={p}>{p ? "…" : "Salva"}</Button>
      <div className="sm:col-span-4"><Msg s={s} /></div>
    </form>
  );
}
export function TemplateForm({ k, title, subject, body, enabled }: { k: string; title: string; subject: string; body: string; enabled: boolean }) {
  const [s, act, p] = useActionState(A.saveTemplateAction.bind(null, k), undefined);
  return (
    <form action={act} className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        {k !== "manuale" && <label className="flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" name="enabled" value="on" defaultChecked={enabled} className="size-4 accent-[#8b5cf6]" /> Invio automatico</label>}
      </div>
      <input name="subject" defaultValue={subject} placeholder="Oggetto" className="field" />
      <textarea name="body" rows={7} defaultValue={body} className="field text-sm" />
      <div className="flex items-center justify-between gap-3"><Msg s={s} /><Button size="sm" variant="ghost" disabled={p} className="ml-auto">{p ? "…" : "Salva template"}</Button></div>
    </form>
  );
}
export function PasswordForm() {
  const [s, act, p] = useActionState(A.changePasswordAction, undefined);
  return (
    <form action={act} className="space-y-3">
      <input type="password" name="password" placeholder="Nuova password (min 12 caratteri)" autoComplete="new-password" className="field" />
      <input type="password" name="confirm" placeholder="Ripeti password" autoComplete="new-password" className="field" />
      <div className="flex items-center justify-between gap-3"><Msg s={s} /><Button size="sm" variant="primary" disabled={p} className="ml-auto">Aggiorna</Button></div>
    </form>
  );
}
export function SignOutAll() {
  return <ActButton act={A.signOutEverywhereAction} confirm="Disconnettere tutti i dispositivi?" className="press h-8 rounded-full border border-line px-3.5 text-[13px] hover:bg-white/5">Esci da tutti i dispositivi</ActButton>;
}
export function GoogleButtons({ connected, configured }: { connected: boolean; configured: boolean }) {
  if (connected) return <ActButton act={A.googleDisconnectAction} confirm="Scollegare Google? Backup su Drive e sync Calendar si fermeranno." className="press h-10 rounded-full border border-danger/30 px-4 text-sm text-danger hover:bg-danger/10">Disconnetti</ActButton>;
  return configured
    ? <a href="/api/google/connect" className="press inline-flex h-11 items-center rounded-full bg-fg px-5 text-sm font-medium text-bg hover:shadow-[0_0_30px_-4px_rgba(167,139,250,.8)]">Connetti Google</a>
    : <span className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm text-dim">Connetti Google</span>;
}
export function TokenCreate() {
  const [s, act, p] = useActionState(A.createTokenAction, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <form action={act} className="flex gap-2">
        <input name="name" placeholder="Nome token (es. Claude)" className="field" />
        <Button variant="ghost" disabled={p}>Crea token</Button>
      </form>
      {s?.error && <p className="text-sm text-danger">{s.error}</p>}
      {s?.token && (
        <div className="rounded-2xl border border-accent/30 bg-accent/[.07] p-4 text-sm">
          <p className="mb-2">Copialo ora: non verrà più mostrato.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2">{s.token}</code>
            <button type="button" onClick={() => { navigator.clipboard.writeText(s.token!); setCopied(true); }} className="press grid size-9 place-items-center rounded-full border border-line">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>
        </div>
      )}
    </div>
  );
}
export function RevokeToken({ id }: { id: string }) {
  return <ActButton act={() => A.revokeTokenAction(id)} confirm="Revocare questo token?" className="text-[13px] text-danger">Revoca</ActButton>;
}
