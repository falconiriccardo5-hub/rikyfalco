import { useState } from 'react';
import { api, type ClientSummary, type Lead, type Payment, type Session } from '../lib/api';
import { addDays, fromCents, METHOD_LABEL, nowRomeLocal, toCents, todayRome } from '../lib/format';
import { Modal, useAction, useApi } from './ui';

function useForm<T extends Record<string, unknown>>(init: T) {
  const [v, setV] = useState(init);
  const bind = (k: keyof T) => ({
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value })),
  });
  return { v, setV, bind };
}

function Foot({ onClose, busy, label }: { onClose: () => void; busy: boolean; label: string }) {
  return (
    <div className="modal-foot">
      <button type="button" className="btn" onClick={onClose}>Annulla</button>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : label}</button>
    </div>
  );
}

// ───── Cliente (nuovo / modifica / conversione da contatto) ─────
export function ClientForm({ client, lead, onClose, onSaved }: { client?: ClientSummary; lead?: Lead; onClose: () => void; onSaved?: (id: string) => void }) {
  const today = todayRome();
  const src = client ?? lead;
  const { v, bind } = useForm({
    first_name: src?.first_name ?? '', last_name: src?.last_name ?? '', email: src?.email ?? '', phone: src?.phone ?? '',
    mode: client?.mode ?? 'misto', program_months: String(client?.program_months ?? 12), start_date: client?.start_date ?? today,
    price: client ? fromCents(client.price_total_cents) : '', installments: '12', first_due_date: client?.start_date ?? today, notes: src?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const editing = !!client;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      first_name: v.first_name, last_name: v.last_name, email: v.email, phone: v.phone, mode: v.mode,
      program_months: Number(v.program_months), start_date: v.start_date, price_total_cents: toCents(v.price || '0'), notes: v.notes,
      ...(editing ? {} : { installments: Number(v.installments) || 0, first_due_date: v.first_due_date }),
    };
    const r = await act(() => editing
      ? api.patch<{ ok: true }>(`/clients/${client!.id}`, body).then(() => ({ id: client!.id }))
      : lead ? api.post<{ id: string }>(`/leads/${lead.id}/convert`, body) : api.post<{ id: string }>('/clients', body),
    editing ? 'Cliente aggiornato' : 'Cliente creato');
    setBusy(false);
    if (r) { onSaved?.(r.id); onClose(); }
  };

  const rate = toCents(v.price || '0') / Math.max(1, Number(v.installments) || 1);
  return (
    <Modal title={editing ? 'Modifica cliente' : lead ? 'Converti in cliente' : 'Nuovo cliente'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="grid-2">
          <label className="field"><span>Nome *</span><input className="input" required maxLength={80} {...bind('first_name')} autoFocus /></label>
          <label className="field"><span>Cognome</span><input className="input" maxLength={80} {...bind('last_name')} /></label>
          <label className="field"><span>Email</span><input className="input" type="email" maxLength={200} {...bind('email')} /></label>
          <label className="field"><span>Telefono (WhatsApp)</span><input className="input" type="tel" maxLength={40} {...bind('phone')} placeholder="+39 ..." /></label>
        </div>
        <div className="grid-3">
          <label className="field"><span>Percorso</span>
            <select className="select" {...bind('mode')}><option value="live">Live</option><option value="online">Online</option><option value="misto">Misto</option></select></label>
          <label className="field"><span>Durata (mesi)</span><input className="input" type="number" min={1} max={60} required {...bind('program_months')} /></label>
          <label className="field"><span>Inizio</span><input className="input" type="date" required {...bind('start_date')} /></label>
        </div>
        <label className="field"><span>Prezzo totale del percorso (€)</span><input className="input" inputMode="decimal" placeholder="es. 1800" {...bind('price')} /></label>
        {!editing && (
          <div className="grid-2">
            <label className="field"><span>Numero di rate (0 = nessun piano)</span><input className="input" type="number" min={0} max={60} {...bind('installments')} /></label>
            <label className="field"><span>Prima scadenza</span><input className="input" type="date" {...bind('first_due_date')} /></label>
          </div>
        )}
        {!editing && Number(v.installments) > 0 && toCents(v.price || '0') > 0 && (
          <div className="callout">Verranno create {v.installments} rate mensili da circa {(rate / 100).toFixed(2).replace('.', ',')} €.</div>
        )}
        <label className="field"><span>Note</span><textarea className="textarea" maxLength={5000} {...bind('notes')} /></label>
        <Foot onClose={onClose} busy={busy} label={editing ? 'Salva' : 'Crea cliente'} />
      </form>
    </Modal>
  );
}

// ───── Rinnovo percorso ─────
export function RenewForm({ client, onClose }: { client: ClientSummary; onClose: () => void }) {
  const start = addDays(client.end_date, 1) < todayRome() ? todayRome() : addDays(client.end_date, 1);
  const { v, bind } = useForm({ program_months: String(client.program_months), price: fromCents(client.price_total_cents), installments: String(client.program_months), start_date: start });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  return (
    <Modal title={`Rinnova · ${client.name}`} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await act(() => api.post(`/clients/${client.id}/renew`, { program_months: Number(v.program_months), price_total_cents: toCents(v.price || '0'), installments: Number(v.installments), start_date: v.start_date, first_due_date: v.start_date }), 'Percorso rinnovato');
        setBusy(false); if (r) onClose();
      }}>
        <div className="grid-2">
          <label className="field"><span>Nuovo inizio</span><input className="input" type="date" required {...bind('start_date')} /></label>
          <label className="field"><span>Durata (mesi)</span><input className="input" type="number" min={1} max={60} required {...bind('program_months')} /></label>
          <label className="field"><span>Prezzo (€)</span><input className="input" inputMode="decimal" {...bind('price')} /></label>
          <label className="field"><span>Rate</span><input className="input" type="number" min={0} max={60} {...bind('installments')} /></label>
        </div>
        <Foot onClose={onClose} busy={busy} label="Rinnova" />
      </form>
    </Modal>
  );
}

// ───── Appuntamento ─────
export function SessionForm({ session, clientId, date, onClose }: { session?: Session; clientId?: string; date?: string; onClose: () => void }) {
  const clients = useApi<ClientSummary[]>('/clients');
  const settings = useApi<{ default_duration: number }>('/settings');
  const defStart = date ? `${date}T18:00` : nowRomeLocal().slice(0, 11) + '18:00';
  const { v, setV, bind } = useForm({
    client_id: session?.client_id ?? clientId ?? '', kind: session?.kind ?? 'lezione', starts_at: session?.starts_at ?? defStart,
    duration_min: String(session?.duration_min ?? ''), mode: session?.mode ?? 'live', location: session?.location ?? '', notes: session?.notes ?? '', repeat_weeks: '1',
  });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const editing = !!session;
  const duration = Number(v.duration_min) || settings.data?.default_duration || 60;

  return (
    <Modal title={editing ? 'Modifica appuntamento' : 'Nuovo appuntamento'} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const body = { kind: v.kind, starts_at: v.starts_at, duration_min: duration, mode: v.mode, location: v.location, notes: v.notes };
        const r = await act(() => editing ? api.patch(`/sessions/${session!.id}`, body)
          : api.post('/sessions', { ...body, client_id: v.client_id, repeat_weeks: Number(v.repeat_weeks) || 1 }), editing ? 'Appuntamento aggiornato' : 'Appuntamento creato');
        setBusy(false); if (r) onClose();
      }}>
        {!editing && (
          <label className="field"><span>Cliente *</span>
            <select className="select" required {...bind('client_id')}>
              <option value="">Seleziona…</option>
              {clients.data?.filter((c) => !c.archived_at).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
        )}
        <div className="grid-3">
          <label className="field"><span>Tipo</span>
            <select className="select" {...bind('kind')}><option value="lezione">Lezione</option><option value="consulenza">Consulenza</option><option value="visita">Visita</option></select></label>
          <label className="field"><span>Modalità</span>
            <select className="select" {...bind('mode')}><option value="live">Live</option><option value="online">Online</option></select></label>
          <label className="field"><span>Durata (min)</span><input className="input" type="number" min={5} max={600} placeholder={String(settings.data?.default_duration ?? 60)} {...bind('duration_min')} /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Data e ora</span><input className="input" type="datetime-local" required value={v.starts_at} onChange={(e) => setV((s) => ({ ...s, starts_at: e.target.value.slice(0, 16) }))} /></label>
          {!editing ? (
            <label className="field"><span>Ripeti ogni settimana</span>
              <select className="select" {...bind('repeat_weeks')}>{[1, 2, 4, 8, 12, 16, 24, 52].map((n) => <option key={n} value={n}>{n === 1 ? 'No' : `${n} settimane`}</option>)}</select></label>
          ) : <div />}
        </div>
        <label className="field"><span>Luogo / link</span><input className="input" maxLength={200} {...bind('location')} /></label>
        <label className="field"><span>Note</span><textarea className="textarea" maxLength={2000} {...bind('notes')} /></label>
        <Foot onClose={onClose} busy={busy} label={editing ? 'Salva' : 'Crea'} />
      </form>
    </Modal>
  );
}

// ───── Incasso rata ─────
export function PayForm({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { v, bind } = useForm({ amount: fromCents(payment.amount_cents), method: 'bonifico', paid_at: todayRome() });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const partial = toCents(v.amount || '0') < payment.amount_cents;
  return (
    <Modal title="Registra incasso" onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await act(() => api.post(`/payments/${payment.id}/pay`, { amount_cents: toCents(v.amount), method: v.method, paid_at: v.paid_at }), 'Incasso registrato');
        setBusy(false); if (r) onClose();
      }}>
        <div className="grid-3">
          <label className="field"><span>Importo (€)</span><input className="input" inputMode="decimal" required {...bind('amount')} autoFocus /></label>
          <label className="field"><span>Metodo</span>
            <select className="select" {...bind('method')}>{Object.entries(METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="field"><span>Data</span><input className="input" type="date" required {...bind('paid_at')} /></label>
        </div>
        {partial && <div className="callout warn">Pagamento parziale: il residuo resterà come nuova rata con la stessa scadenza.</div>}
        <Foot onClose={onClose} busy={busy} label="Registra" />
      </form>
    </Modal>
  );
}

// ───── Nuova rata / modifica rata ─────
export function PaymentForm({ clientId, payment, onClose }: { clientId: string; payment?: Payment; onClose: () => void }) {
  const { v, bind } = useForm({ label: payment?.label ?? 'Rata', amount: payment ? fromCents(payment.amount_cents) : '', due_date: payment?.due_date ?? todayRome(), notes: payment?.notes ?? '' });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  return (
    <Modal title={payment ? 'Modifica rata' : 'Nuova rata'} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const body = { label: v.label, amount_cents: toCents(v.amount), due_date: v.due_date, notes: v.notes };
        const r = await act(() => payment ? api.patch(`/payments/${payment.id}`, body) : api.post('/payments', { ...body, client_id: clientId }), 'Rata salvata');
        setBusy(false); if (r) onClose();
      }}>
        <label className="field"><span>Descrizione</span><input className="input" maxLength={120} {...bind('label')} /></label>
        <div className="grid-2">
          <label className="field"><span>Importo (€)</span><input className="input" inputMode="decimal" required {...bind('amount')} /></label>
          <label className="field"><span>Scadenza</span><input className="input" type="date" required {...bind('due_date')} /></label>
        </div>
        <label className="field"><span>Note</span><textarea className="textarea" maxLength={1000} {...bind('notes')} /></label>
        <Foot onClose={onClose} busy={busy} label="Salva" />
      </form>
    </Modal>
  );
}

// ───── Contatto / visita conoscitiva ─────
export function LeadForm({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const { v, bind } = useForm({
    first_name: lead?.first_name ?? '', last_name: lead?.last_name ?? '', email: lead?.email ?? '', phone: lead?.phone ?? '',
    source: lead?.source ?? '', notes: lead?.notes ?? '', visit_at: '', mode: 'live',
  });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  return (
    <Modal title={lead ? 'Modifica contatto' : 'Nuova visita'} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const base = { first_name: v.first_name, last_name: v.last_name, email: v.email, phone: v.phone, source: v.source, notes: v.notes };
        const r = await act(() => lead ? api.patch(`/leads/${lead.id}`, base)
          : api.post('/leads', { ...base, ...(v.visit_at ? { visit_at: v.visit_at, mode: v.mode } : {}) }), 'Contatto salvato');
        setBusy(false); if (r) onClose();
      }}>
        <div className="grid-2">
          <label className="field"><span>Nome *</span><input className="input" required maxLength={80} {...bind('first_name')} autoFocus /></label>
          <label className="field"><span>Cognome</span><input className="input" maxLength={80} {...bind('last_name')} /></label>
          <label className="field"><span>Email</span><input className="input" type="email" maxLength={200} {...bind('email')} /></label>
          <label className="field"><span>Telefono</span><input className="input" type="tel" maxLength={40} {...bind('phone')} /></label>
        </div>
        <label className="field"><span>Come ti ha conosciuto</span><input className="input" maxLength={80} placeholder="Instagram, passaparola…" {...bind('source')} /></label>
        {!lead && (
          <div className="grid-2">
            <label className="field"><span>Data visita (crea evento)</span><input className="input" type="datetime-local" {...bind('visit_at')} /></label>
            <label className="field"><span>Modalità</span><select className="select" {...bind('mode')}><option value="live">Live</option><option value="online">Online</option></select></label>
          </div>
        )}
        <label className="field"><span>Note</span><textarea className="textarea" maxLength={5000} {...bind('notes')} /></label>
        <Foot onClose={onClose} busy={busy} label="Salva" />
      </form>
    </Modal>
  );
}
