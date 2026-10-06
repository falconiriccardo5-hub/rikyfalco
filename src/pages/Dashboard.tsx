import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, RefreshCw, UserCheck, Wallet, X } from 'lucide-react';
import Globe from '../components/Globe';
import Wizard from '../components/Wizard';
import ClientCard from '../components/ClientCard';
import { MeCtx, useOpen } from '../components/Layout';
import { PayForm } from '../components/Forms';
import { api, type ClientSummary, type Payment, type Session } from '../lib/api';
import { euro, greeting, itDate, KIND_LABEL, longDay, shortDay, time } from '../lib/format';
import { Empty, ErrorBox, SectionTitle, SpotCard, useAction, useApi } from '../components/ui';
import { useState } from 'react';

type Dash = {
  today: string; clients: ClientSummary[]; clients_count: number; lessons_today: number; overdue_total_cents: number; pending_messages: number;
  todo: { overdue: (Payment & { name: string; days: number })[]; to_confirm: (Session & { person: string })[]; expiring: { id: string; name: string; end_date: string }[] };
};

export default function Dashboard() {
  const { data, error } = useApi<Dash>('/dashboard');
  const me = useContext(MeCtx);
  const open = useOpen();
  const act = useAction();
  const [paying, setPaying] = useState<Payment | null>(null);

  if (error) return <ErrorBox error={error} />;
  const first = (me?.coach_name || 'Riccardo').split(' ')[0];
  const todoCount = data ? data.todo.overdue.length + data.todo.to_confirm.length + data.todo.expiring.length : 0;

  return (
    <>
      <SpotCard className="hero fade-in">
        <Globe className="globe" />
        <div className="hero-content">
          <div className="label" style={{ letterSpacing: '.18em' }}>{data ? longDay(data.today).toUpperCase() : ' '}</div>
          <h1>{greeting()}, {first}. <Wizard className="wizard" /></h1>
        </div>
        <div className="chips hero-content" style={{ marginTop: 28 }}>
          <span className="chip static">{data?.clients_count ?? '–'} clienti</span>
          <span className="chip static">{data?.lessons_today ?? '–'} lezioni oggi</span>
          {data && (data.overdue_total_cents > 0
            ? <Link to="/payments" className="chip" style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>{euro(data.overdue_total_cents)} da incassare</Link>
            : <span className="chip static">Tutto incassato</span>)}
          {!!data?.pending_messages && <Link to="/messages" className="chip">{data.pending_messages} messaggi da inviare</Link>}
        </div>
      </SpotCard>

      <SectionTitle idx={1} total={2}>I tuoi clienti</SectionTitle>
      {!data ? <div className="client-grid"><div className="skeleton" style={{ height: 380 }} /></div>
        : data.clients.length === 0 ? (
          <div className="card"><Empty>Nessun cliente attivo. <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={open.client}>Aggiungi il primo</button></Empty></div>
        ) : (
          <div className="client-grid">{data.clients.map((c, i) => <ClientCard key={c.id} c={c} delay={i * 50} />)}</div>
        )}

      <SectionTitle idx={2} total={2}>Da gestire</SectionTitle>
      <div className="card list fade-in">
        {data && todoCount === 0 && <Empty icon={<Check />}>Tutto in ordine, niente da gestire.</Empty>}
        {data?.todo.overdue.map((p) => (
          <div className="list-row" key={p.id}>
            <div className="row-icon red"><Wallet /></div>
            <div className="grow">
              <Link to={`/clients/${p.client_id}`} className="title">{p.name}</Link>
              <div className="sub">Rata di {euro(p.amount_cents)} scaduta da {p.days} gg</div>
            </div>
            <div className="actions">
              <Link to="/messages" className="icon-btn" title="Messaggio di sollecito" aria-label="Messaggio di sollecito"><MessageCircle /></Link>
              <button className="btn btn-danger" onClick={() => setPaying(p)}><Check /> Pagata</button>
            </div>
          </div>
        ))}
        {data?.todo.to_confirm.map((s) => (
          <div className="list-row" key={s.id}>
            <div className="row-icon violet"><UserCheck /></div>
            <div className="grow">
              <div className="title">{s.person || 'Appuntamento'}</div>
              <div className="sub">Presenza {KIND_LABEL[s.kind].toLowerCase()} · {shortDay(s.starts_at)} {time(s.starts_at)}</div>
            </div>
            <div className="actions">
              <button className="icon-btn" title="Assente / saltata" aria-label="Segna come saltata" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'saltata' }), 'Segnata come saltata')}><X /></button>
              <button className="icon-btn green" title="Presente / svolta" aria-label="Segna come svolta" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'svolta' }), 'Presenza confermata')}><Check /></button>
            </div>
          </div>
        ))}
        {data?.todo.expiring.map((c) => (
          <div className="list-row" key={c.id}>
            <div className="row-icon amber"><RefreshCw /></div>
            <div className="grow">
              <Link to={`/clients/${c.id}`} className="title">{c.name}</Link>
              <div className="sub">Percorso in scadenza il {itDate(c.end_date)}</div>
            </div>
            <div className="actions"><Link to={`/clients/${c.id}`} className="btn">Rinnova</Link></div>
          </div>
        ))}
      </div>
      {paying && <PayForm payment={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
