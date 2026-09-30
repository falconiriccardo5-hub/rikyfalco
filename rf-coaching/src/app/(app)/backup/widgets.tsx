"use client";
import { useActionState, useTransition, useState } from "react";
import { backupNowAction, restoreAction } from "@/server/actions";
import { Button, Card, Field } from "@/components/ui";
export function BackupNow() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-danger">{msg}</span>}
      <Button variant="primary" disabled={pending} onClick={() => start(async () => { const r = await backupNowAction(); setMsg(r?.error ?? null); })}>
        {pending ? "Backup in corso…" : "Backup ora"}
      </Button>
    </div>
  );
}
export function Restore({ backups }: { backups: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(restoreAction, undefined);
  return (
    <Card className="p-5 sm:p-6">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-muted sm:col-span-2">
          Il ripristino sostituisce clienti, percorsi, pagamenti e appuntamenti con quelli del backup scelto. Prima viene salvata automaticamente una copia di sicurezza dello stato attuale.
        </p>
        <Field label="Da un backup salvato">
          <select name="backup_id" className="field" defaultValue=""><option value="">— scegli —</option>{backups.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
        </Field>
        <Field label="Oppure da file JSON"><input type="file" name="file" accept="application/json,.json" className="field !py-2 text-sm" /></Field>
        <Field label='Scrivi "RIPRISTINA" per confermare'><input name="confirm" autoComplete="off" className="field" /></Field>
        <div className="flex items-end"><Button variant="danger" className="w-full" disabled={pending}>{pending ? "Ripristino…" : "Ripristina"}</Button></div>
        {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        {state?.ok && <p className="text-sm text-ok sm:col-span-2">Ripristino completato. Copia di sicurezza salvata nello storico.</p>}
      </form>
    </Card>
  );
}
