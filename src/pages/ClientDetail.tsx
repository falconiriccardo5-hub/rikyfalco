import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, CalendarPlus, Check, ChevronLeft, Mail, MessageCircle, Pencil, Phone, Plus, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { ClientForm, PaymentForm, PayForm, RenewForm, SessionForm } from '../components/Forms';
import { useOpen } from '../components/Layout';
import { PayBanner, Segments } from '../components/ClientCard';
import { Confirm, Empty, ErrorBox, Loading, useAction, useApi } from '../components/ui';
import { api, type ClientSummary, type Payment, type Session } from '../lib/api';
import { euro, initials, itDate, KIND_LABEL, METHOD_LABEL, MODE_LABEL, nowRomeLocal, shortDay, STATUS_LABEL, time, waNumber } from '../lib/format';

type Detail = { client: ClientSummary; payments: Payment[]; sessions: Session[]; activity: { id: number; ts: string; action: string; summary: string }[] };

const PAY_PILL: Record<string, [string, string]> = { pagato: ['green', 'Pagato'], scaduto: ['red', 'Scaduto'], da_incassare: ['amber', 'In arrivo'], programmato: ['gray', 'Programmato'] };
const SES_PILL: Record<string, [string, string]> = { programmata: ['violet', 'Programmata'], svolta: ['green', 'Svolta'], saltata: ['red', 'Saltata'], annullata: ['gray', 'Annullata'] };

export default function ClientDetail() {
  const { id } = useParams();
  const { data, error } = useApi<Detail>(`/clients/${id}`);
  const [tab, setTab] = useState<'pagamenti' | 'lezioni' | 'note' | 'storico'>('pagamenti');
  const [modal, setModal] = useState<null | 'edit' | 'renew' | 'delete' | 'payment' | { pay: Payment } | { editPay: Payment } | { delPay: Payment } | { session: Session }>(null);
  const act = useAction();
  const nav = useNavigate();
  const open = useOpen();

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const { client: c, payments, sessions } = data;
  const now = nowRomeLocal();
  const paid = payments.filter((p) => p.paid_at).reduce((s, p) => s + (p.paid_amount_cents ?? p.amount_cents), 0);
  const total = payments.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <>
      <Link to="/clients" className="row muted fade-in" style={{ gap: 6, marginBottom: 24, width: 'fit-content' }}><ChevronLeft size={18} /> Clienti</Link>
      <div className="page-head fade-in" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 20 }}>
          <div className="avatar lg">{initials(c.first_name, c.last_name)}</div>
          <div>
            <div className="row" style={{ gap: 12 }}><h1 style={{ margin: 0 }}>{c.name}</h1></div>
            <div className="row wrap muted" style={{ gap: 14, marginTop: 8 }}>
              <span className={`pill ${({ attivo: 'green', in_scadenza: 'amber', scaduto: 'red', archiviato: 'gray', non_iniziato: 'violet' })[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              <span>{MODE_LABEL[c.mode]} · {c.program_months} mesi</span>
              <span>{itDate(c.start_date)} → {itDate(c.end_date)}</span>
            </div>
          </div>
        </div>
        <div className="row wrap">
          {c.phone && <a className="icon-btn" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="WhatsApp"><MessageCircle /></a>}
          {c.phone && <a className="icon-btn" href={`tel:${c.phone}`} title="Chiama" aria-label="Chiama"><Phone /></a>}
          {c.email && <a className="icon-btn" href={`mailto:${c.email}`} title="Email" aria-label="Email"><Mail /></a>}
          <button className="btn" onClick={() => setModal('edit')}><Pencil /> Modifica</button>
          <button className="btn" onClick={() => setModal('renew')}><RefreshCw /> Rinnova</button>
        </div>
      </div>

      <div className="kpis fade-in" style={{ marginBottom: 22 }}>
        <div className="card kpi"><div className="label">Mese</div><div className="val sm">{c.month}<span className="dim"> / {c.program_months}</span></div><div style={{ marginTop: 16 }}><Segments total={c.program_months} current={c.month} /></div></div>
        <div className="card kpi"><div className="label">Lezioni svolte</div><div className="val sm">{c.lessons_done}</div><div className="note">{c.lessons_missed} saltate · prossima {c.next_session ? `${shortDay(c.next_session.starts_at)} ${time(c.next_session.starts_at)}` : '—'}</div></div>
        <div className="card kpi"><div className="label">Incassato</div><div className="val sm">{euro(paid)}</div><div className="note">su {euro(total)} · {c.payments_paid}/{c.payments_total} rate</div></div>
        <div className={`card kpi ${c.overdue_cents ? 'danger' : ''}`}><div className="label">Scaduto</div><div className="val sm">{euro(c.overdue_cents)}</div><div className="note">{c.overdue_count} rate</div></div>
      </div>
      <div className="fade-in"><PayBanner c={c} /></div>

      <div className="tabs" style={{ marginTop: 34 }}>
        {(['pagamenti', 'lezioni', 'note', 'storico'] as const).map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>

      {tab === 'pagamenti' && (
        <>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn" onClick={() => setModal('payment')}><Plus /> Aggiungi rata</button></div>
          <div className="card list">
            {payments.length === 0 ? <Empty>Nessuna rata.</Empty> : payments.map((p) => (
              <div className="list-row" key={p.id}>
                <div className="grow">
                  <div className="title">{p.label} · {euro(p.amount_cents)}</div>
                  <div className="sub">Scadenza {itDate(p.due_date)}{p.paid_at && ` · incassato ${euro(p.paid_amount_cents ?? p.amount_cents)} il ${itDate(p.paid_at)} (${METHOD_LABEL[p.method || 'altro']})`}</div>
                </div>
                <span className={`pill ${PAY_PILL[p.state][0]}`}>{PAY_PILL[p.state][1]}</span>
                <div className="actions">
                  {p.paid_at
                    ? <button className="icon-btn sm" title="Annulla incasso" aria-label="Annulla incasso" onClick={() => act(() => api.post(`/payments/${p.id}/unpay`), 'Incasso annullato')}><RotateCcw /></button>
                    : <button className="btn btn-sm btn-green" onClick={() => setModal({ pay: p })}><Check /> Incassa</button>}
                  <button className="icon-btn sm" aria-label="Modifica rata" onClick={() => setModal({ editPay: p })}><Pencil /></button>
                  <button className="icon-btn sm" aria-label="Elimina rata" onClick={() => setModal({ delPay: p })}><Trash2 /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'lezioni' && (
        <>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn" onClick={() => open.session(c.id)}><CalendarPlus /> Nuovo appuntamento</button></div>
          <div className="card list">
            {sessions.length === 0 ? <Empty>Nessun appuntamento.</Empty> : sessions.map((s) => (
              <div className="list-row" key={s.id}>
                <div className="grow" style={{ cursor: 'pointer' }} onClick={() => setModal({ session: s })}>
                  <div className="title">{KIND_LABEL[s.kind]} · {shortDay(s.starts_at)} {time(s.starts_at)}</div>
                  <div className="sub">{s.mode === 'online' ? 'Online' : 'Live'} · {s.duration_min} min{s.location && ` · ${s.location}`}{s.gcal_status === 'error' && ' · ⚠ sync Google non riuscita'}</div>
                </div>
                <span className={`pill ${SES_PILL[s.status][0]}`}>{SES_PILL[s.status][1]}</span>
                {s.status === 'programmata' && s.starts_at < now && (
                  <div className="actions">
                    <button className="icon-btn sm" aria-label="Saltata" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'saltata' }))}><X /></button>
                    <button className="icon-btn sm green" aria-label="Svolta" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'svolta' }))}><Check /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'note' && <div className="card pad" style={{ whiteSpace: 'pre-wrap' }}>{c.notes || <span className="muted">Nessuna nota. Usa “Modifica” per aggiungerne.</span>}</div>}

      {tab === 'storico' && (
        <div className="card list">
          {data.activity.length === 0 ? <Empty>Nessuna attività.</Empty> : data.activity.map((a) => (
            <div className="list-row" key={a.id}><div className="grow"><div>{a.summary}</div><div className="sub">{new Date(a.ts).toLocaleString('it-IT')}</div></div></div>
          ))}
        </div>
      )}

      <div className="row wrap" style={{ marginTop: 40, gap: 10 }}>
        <button className="btn" onClick={() => act(() => api.post(`/clients/${c.id}/archive`, { archive: !c.archived_at }), c.archived_at ? 'Cliente riattivato' : 'Cliente archiviato')}>
          {c.archived_at ? <><ArchiveRestore /> Riattiva</> : <><Archive /> Archivia</>}
        </button>
        <button className="btn btn-danger" onClick={() => setModal('delete')}><Trash2 /> Elimina definitivamente</button>
      </div>

      {modal === 'edit' && <ClientForm client={c} onClose={() => setModal(null)} />}
      {modal === 'renew' && <RenewForm client={c} onClose={() => setModal(null)} />}
      {modal === 'payment' && <PaymentForm clientId={c.id} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && 'pay' in modal && <PayForm payment={modal.pay} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && 'editPay' in modal && <PaymentForm clientId={c.id} payment={modal.editPay} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && 'session' in modal && <SessionForm session={modal.session} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && 'delPay' in modal && (
        <Confirm title="Elimina rata" danger confirmLabel="Elimina" text={`Eliminare “${modal.delPay.label}” da ${euro(modal.delPay.amount_cents)}?`}
          onConfirm={() => act(() => api.del(`/payments/${modal.delPay.id}`), 'Rata eliminata')} onClose={() => setModal(null)} />
      )}
      {modal === 'delete' && (
        <Confirm title="Elimina cliente" danger confirmLabel="Elimina per sempre" requireText={c.name}
          text={<>Verranno eliminati cliente, rate, appuntamenti e messaggi. Gli eventi Google collegati verranno rimossi. <b>L'operazione non è reversibile</b> (salvo ripristino da backup). Se vuoi solo nasconderlo usa “Archivia”.</>}
          onConfirm={async () => { const r = await act(() => api.del(`/clients/${c.id}?confirm=${encodeURIComponent(c.name)}`), 'Cliente eliminato'); if (r) nav('/clients'); }}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}
