"use client";
import { useState, useTransition } from "react";
import { Link2, Plus, RefreshCcw, RotateCcw, Send, Trash2, Check } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { ActionForm, ActButton } from "@/components/forms/action-form";
import { Field } from "@/components/ui";
import { VisitForm } from "@/components/visits/visit-form";
import type { VisitAnswers, VisitSection } from "@/lib/visit-template";
import * as A from "@/server/actions";

const pill = "press inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition hover:bg-white/5 disabled:opacity-50";
const small = "press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] text-muted transition hover:text-fg disabled:opacity-50";

export function RunVisitAutomations() {
  return <ActButton act={A.runVisitAutomationsAction} className={small} title="Crea ora i check in scadenza"><RefreshCcw size={13} /> Aggiorna</ActButton>;
}

export function NewVisit({ clientId, today, suggested }: { clientId: string; today: string; suggested: "iniziale" | "check" }) {
  return (
    <Sheet title="Nuova visita" triggerClassName={small} trigger={<><Plus size={13} /> Nuova visita</>}>
      <ActionForm action={A.createVisitAction.bind(null, clientId)} submit="Crea visita">
        <Field label="Modulo">
          <select name="kind" defaultValue={suggested} className="field">
            <option value="iniziale">Visita iniziale (anamnesi)</option>
            <option value="check">Check / monitoraggio</option>
          </select>
        </Field>
        <Field label="Data della visita"><input type="date" name="visit_date" defaultValue={today} required className="field" /></Field>
        <p className="text-xs text-muted">Il modulo usa il Modello visita. Il cliente compila le sue sezioni dal link, tu completi misure, osservazioni, macro e voti.</p>
      </ActionForm>
    </Sheet>
  );
}

export function VisitEditor({ id, sections, initial, date, completed }: {
  id: string; sections: VisitSection[]; initial: VisitAnswers; date: string; completed: boolean;
}) {
  const [visitDate, setVisitDate] = useState(date);
  return (
    <div className="space-y-6">
      <Field label="Data della visita" className="max-w-[220px]">
        <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="field" />
      </Field>
      <VisitForm sections={sections} initial={initial}
        onSave={(answers, final) => A.saveVisitAction(id, answers, { complete: final && !completed, visit_date: visitDate })}
        actions={completed ? { final: "Salva modifiche" } : { draft: "Salva bozza", final: "Completa visita", confirmFinal: "Segnare la visita come completata?" }} />
    </div>
  );
}

export function ClientLink({ clientId }: { clientId: string }) {
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  const copy = () => start(async () => {
    const res = await A.visitLinkAction(clientId);
    if (!res.token) return setMsg(res.error ?? "Errore");
    const url = `${window.location.origin}/visita/${res.token}`;
    try { await navigator.clipboard.writeText(url); setMsg("Link copiato"); } catch { window.prompt("Copia il link per il cliente", url); }
  });
  return (
    <button type="button" onClick={copy} disabled={pending} className={pill} title="Link personale del cliente per compilare il modulo">
      {msg === "Link copiato" ? <Check size={15} /> : <Link2 size={15} />} {msg ?? "Copia link cliente"}
    </button>
  );
}

export function ClientAreaLink({ clientId }: { clientId: string }) {
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  const open = () => start(async () => {
    const res = await A.visitLinkAction(clientId);
    if (!res.token) return setMsg(res.error ?? "Errore");
    const url = `${window.location.origin}/c/${res.token}`;
    try { await navigator.clipboard.writeText(url); setMsg("Link copiato"); } catch { window.prompt("Copia il link dell'area cliente", url); }
  });
  return (
    <button type="button" onClick={open} disabled={pending} className={pill} title="Link personale con percorso, date e pagamenti">
      {msg === "Link copiato" ? <Check size={15} /> : <Link2 size={15} />} {msg ?? "Area cliente"}
    </button>
  );
}

export function VisitActions({ id, status }: { id: string; status: string }) {
  return (
    <>
      {status === "completata" && <ActButton act={() => A.reopenVisitAction(id)} className={pill}><RotateCcw size={15} /> Riapri</ActButton>}
      {status === "compilata_cliente" && (
        <ActButton act={() => A.sendBackVisitAction(id)} className={pill} confirm="Rimandare il modulo al cliente? Potrà modificarlo di nuovo.">
          <Send size={15} /> Rimanda al cliente
        </ActButton>
      )}
      <ActButton act={() => A.deleteVisitAction(id)} className={pill + " text-danger"} confirm="Eliminare definitivamente questa visita?">
        <Trash2 size={15} /> Elimina
      </ActButton>
    </>
  );
}
