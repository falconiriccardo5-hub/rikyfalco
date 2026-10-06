"use client";
import { Field } from "@/components/ui";
type Appt = { client_id: string | null; starts_at: string; ends_at: string; type: string; notes: string | null };
const romeParts = (iso: string) => {
  const d = new Date(iso);
  return { date: d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }), time: d.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }) };
};
export function AppointmentFields({ clients, fixedClientId, a, today }: { clients?: { id: string; name: string }[]; fixedClientId?: string; a?: Appt; today: string }) {
  const p = a ? romeParts(a.starts_at) : { date: today, time: "18:00" };
  const dur = a ? Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000) : 60;
  return (
    <div className="grid grid-cols-2 gap-4">
      {fixedClientId ? <input type="hidden" name="client_id" value={fixedClientId} /> : (
        <Field label="Cliente" className="col-span-2">
          <select name="client_id" defaultValue={a?.client_id ?? ""} className="field">
            <option value="">— Nessun cliente —</option>
            {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Data"><input type="date" name="date" required defaultValue={p.date} className="field" /></Field>
      <Field label="Ora"><input type="time" name="time" required defaultValue={p.time} step={300} className="field" /></Field>
      <Field label="Durata">
        <select name="duration" defaultValue={String(dur)} className="field">
          {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </Field>
      <Field label="Tipo">
        <select name="type" defaultValue={a?.type ?? "allenamento"} className="field">
          <option value="allenamento">Allenamento</option><option value="consulenza">Consulenza</option><option value="check">Check</option><option value="altro">Altro</option>
        </select>
      </Field>
      <Field label="Note" className="col-span-2"><textarea name="notes" rows={2} defaultValue={a?.notes ?? ""} className="field resize-none" /></Field>
    </div>
  );
}
