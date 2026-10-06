"use client";
import { Pencil, Plus, Minus, Check, RotateCcw, Trash2, Archive, ArchiveRestore, RefreshCcw, Mail } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { ActionForm, ActButton } from "@/components/forms/action-form";
import { ClientFields } from "@/components/forms/client-fields";
import { ProgramFields } from "@/components/forms/program-fields";
import { Field, cx } from "@/components/ui";
import * as A from "@/server/actions";
import type { ClientRow, PaymentRow, ProgramRow } from "@/server/queries";
const pill = "press inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition hover:bg-white/5";
const icon = "press grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-fg disabled:opacity-40";
export function EditClient({ client }: { client: ClientRow }) {
  return (
    <Sheet title="Modifica cliente" triggerClassName={pill} trigger={<><Pencil size={15} /> Modifica</>}>
      <ActionForm action={A.updateClientAction.bind(null, client.id)}><ClientFields c={client} /></ActionForm>
    </Sheet>
  );
}
export function EditProgram({ program: p }: { program: ProgramRow }) {
  return (
    <Sheet title="Modifica percorso" triggerClassName={icon} trigger={<Pencil size={14} />}>
      <ActionForm action={A.updateProgramAction.bind(null, p.id, p.client_id)}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipologia" className="col-span-2">
            <select name="type" defaultValue={p.type} className="field"><option value="live">Live</option><option value="online">Online</option><option value="misto">Misto</option></select>
          </Field>
          <Field label="Data inizio"><input type="date" name="start_date" defaultValue={p.start_date} className="field" /></Field>
          <Field label="Data fine"><input type="date" name="end_date" defaultValue={p.end_date} className="field" /></Field>
          <Field label="Prezzo totale (€)"><input type="number" step="0.01" name="total_price" defaultValue={p.total_price} className="field" /></Field>
          <Field label="Lezioni acquistate"><input type="number" name="lessons_total" defaultValue={p.lessons_total} className="field" /></Field>
          <Field label="Stato" className="col-span-2">
            <select name="manual_status" defaultValue={p.manual_status ?? ""} className="field">
              <option value="">Automatico (in base alle date)</option><option value="sospeso">Sospeso</option><option value="terminato">Terminato</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted">Il prezzo modificato non ricalcola le rate già create: aggiungile o eliminale dalla timeline.</p>
      </ActionForm>
    </Sheet>
  );
}
export function NewProgram({ clientId, today, renewal }: { clientId: string; today: string; renewal: boolean }) {
  return (
    <Sheet title={renewal ? "Rinnova percorso" : "Nuovo percorso"} triggerClassName={cx(pill, "!h-9 !px-3.5 !text-[13px]", renewal && "border-accent/40 bg-accent/10 text-accent-3 shadow-[0_0_20px_-6px_rgba(139,92,246,.9)]")}
      trigger={<>{renewal ? <RefreshCcw size={14} /> : <Plus size={14} />} {renewal ? "Rinnova" : "Nuovo percorso"}</>}>
      <ActionForm action={A.createProgramAction.bind(null, clientId)} submit="Crea percorso"><ProgramFields today={today} /></ActionForm>
    </Sheet>
  );
}
export function Lessons({ programId, clientId }: { programId: string; clientId: string }) {
  return (
    <div className="flex gap-1.5">
      <ActButton act={() => A.lessonAction(programId, clientId, -1)} className={icon} title="Togli lezione"><Minus size={14} /></ActButton>
      <ActButton act={() => A.lessonAction(programId, clientId, 1)} className={cx(icon, "border-accent/40 bg-accent/10 text-accent-3")} title="Lezione effettuata"><Plus size={14} /></ActButton>
    </div>
  );
}
export function PayButton({ payment: p, defaultMethod, today }: { payment: PaymentRow; defaultMethod: string; today: string }) {
  return (
    <Sheet title="Registra pagamento" triggerClassName={cx(pill, "!h-9 !px-3.5 !text-[13px]", p.status === "scaduto" && "border-danger/40 text-danger")} trigger={<><Check size={14} /> Pagato</>}>
      <ActionForm action={A.recordPaymentAction.bind(null, p.id, p.client_id)} submit="Conferma pagamento">
        <Field label="Importo ricevuto (€)"><input type="number" step="0.01" name="paid_amount" defaultValue={p.amount} className="field" /></Field>
        <Field label="Data pagamento"><input type="date" name="paid_date" defaultValue={today} className="field" /></Field>
        <Field label="Metodo">
          <select name="method" defaultValue={defaultMethod} className="field">
            <option value="bonifico">Bonifico</option><option value="contanti">Contanti</option><option value="carta">Carta</option><option value="paypal">PayPal</option><option value="altro">Altro</option>
          </select>
        </Field>
      </ActionForm>
    </Sheet>
  );
}
export function UndoPay({ id, clientId }: { id: string; clientId: string }) {
  return <ActButton act={() => A.undoPaymentAction(id, clientId)} className={icon} title="Annulla pagamento" confirm="Annullare la registrazione di questo pagamento?"><RotateCcw size={14} /></ActButton>;
}
export function DeletePayment({ id, clientId }: { id: string; clientId: string }) {
  return <ActButton act={() => A.deletePaymentAction(id, clientId)} className={cx(icon, "hidden sm:grid")} title="Elimina rata" confirm="Eliminare questa rata?"><Trash2 size={14} /></ActButton>;
}
export function AddPayment({ clientId, programId, today }: { clientId: string; programId?: string; today: string }) {
  return (
    <Sheet title="Aggiungi rata" triggerClassName={cx(pill, "!h-8 !px-3 !text-[13px]")} trigger={<><Plus size={14} /> Rata</>}>
      <ActionForm action={A.addPaymentAction.bind(null, clientId)} submit="Aggiungi">
        <input type="hidden" name="program_id" value={programId ?? ""} />
        <Field label="Importo (€)"><input type="number" step="0.01" name="amount" required className="field" /></Field>
        <Field label="Scadenza"><input type="date" name="due_date" defaultValue={today} required className="field" /></Field>
      </ActionForm>
    </Sheet>
  );
}
export function ClientDanger({ id, archived }: { id: string; archived: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 border-t hairline pt-6">
      <ActButton act={() => A.archiveClientAction(id, !archived)} className={cx(pill, "!h-9 !text-[13px] text-muted")}>
        {archived ? <><ArchiveRestore size={14} /> Ripristina</> : <><Archive size={14} /> Archivia</>}
      </ActButton>
      {archived && (
        <ActButton act={() => A.deleteClientAction(id)} confirm="Eliminare definitivamente il cliente e tutti i suoi dati? L'operazione resta nel registro attività." className={cx(pill, "!h-9 !text-[13px] border-danger/30 text-danger")}>
          <Trash2 size={14} /> Elimina definitivamente
        </ActButton>
      )}
    </div>
  );
}
export function SendEmail({ clientId, email, subject, body, configured }: { clientId: string; email: string | null; subject: string; body: string; configured: boolean }) {
  return (
    <Sheet title="Invia email" triggerClassName={pill} trigger={<><Mail size={15} /> Email</>}>
      {!email ? <p className="text-sm text-muted">Il cliente non ha un indirizzo email. Aggiungilo da &quot;Modifica&quot;.</p> : (
        <ActionForm action={A.sendEmailAction.bind(null, clientId)} submit={configured ? "Invia" : "Registra tentativo"}>
          <p className="text-sm text-muted">A: <span className="text-fg">{email}</span></p>
          {!configured && <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">Provider email non configurato: l&apos;email non verrà inviata (verrà registrata come &quot;non configurato&quot;).</p>}
          <Field label="Oggetto"><input name="subject" defaultValue={subject} required className="field" /></Field>
          <Field label="Testo"><textarea name="body" rows={9} defaultValue={body} required className="field" /></Field>
          <p className="text-xs text-muted">Variabili: {"{{nome}}"} {"{{cognome}}"}</p>
        </ActionForm>
      )}
    </Sheet>
  );
}
