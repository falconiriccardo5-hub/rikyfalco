import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarClock, CalendarPlus, Check, ClipboardList, MessageCircle, RefreshCw, UserCheck, UserPlus, Users, Wallet, X } from 'lucide-react';
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

  const next = data?.clients.filter((c) => c.next_session).sort((x, y) => x.next_session!.starts_at.localeCompare(y.next_session!.starts_at))[0];
  const todo = data ? [
    { icon: Wallet, label: 'Rate scadute', n: data.todo.overdue.length, tone: 'red', to: '/payments' },
    { icon: UserCheck, label: 'Presenze da confermare', n: data.todo.to_confirm.length, tone: 'violet', to: '/calendar' },
    { icon: RefreshCw, label: 'Percorsi in scadenza', n: data.todo.expiring.length, tone: 'amber', to: '/clients' },
    { icon: MessageCircle, label: 'Messaggi da inviare', n: data.pending_messages, tone: 'violet', to: '/messages' },
  ] : [];

  return (
    <div className="dash">
      <div className="dash-hero">
      <SpotCard className="hero fade-in">
        <Globe className="globe" />
        <div className="hero-content">
          <div className="label" style={{ letterSpacing: '.18em' }}>{data ? longDay(data.today).toUpperCase() : ' '}</div>
          <h1>{greeting()}, {first}. <Wizard className="wizard" /></h1>
        </div>
        <div className="chips hero-content" style={{ marginTop: 28 }}>
          <button className="chip action" onClick={() => open.session()}><CalendarPlus /> Nuovo appuntamento</button>
          <button className="chip action" onClick={open.visit}><ClipboardList /> Nuova visita</button>
          <button className="chip action" onClick={open.client}><UserPlus /> Nuovo cliente</button>
          <Link to="/report" className="chip action"><BarChart3 /> Report</Link>
        </div>
      </SpotCard>
      </div>

      <aside className="dash-rail" aria-label="Riepilogo">
        <div className="card rail-feature fade-in">
          <div className="glass-stack" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="rail-title">Prossima lezione <span className="spark">✦</span></div>
          {!data ? <div className="skeleton" style={{ height: 40, marginTop: 10 }} />
            : next ? (
              <Link to={`/clients/${next.id}`} className="rail-next">
                <b>{next.name}</b>
                <span>{shortDay(next.next_session!.starts_at)} · ore {time(next.next_session!.starts_at)}</span>
              </Link>
            ) : (
              <div className="rail-next"><span>Nessuna lezione in programma.</span>
                <button className="btn btn-sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={() => open.session()}><CalendarPlus /> Programma</button></div>
            )}
        </div>

        <div className="card rail-card fade-in">
          <div className="rail-title">Da gestire</div>
          {todo.map(({ icon: Icon, label, n, tone, to }) => (
            <Link key={label} to={to} className="rail-row">
              <Icon /><span className="grow">{label}</span>
              {n > 0 ? <span className={`rail-count ${tone}`}>{n}</span> : <Check className="ok" aria-label="Nessuno" />}
            </Link>
          ))}
          {!data && <div className="skeleton" style={{ height: 120 }} />}
        </div>

        <div className="card rail-card fade-in">
          <div className="rail-title">Panoramica</div>
          <Link to="/clients" className="rail-row"><Users /><span className="grow">Clienti attivi</span><b>{data?.clients_count ?? '–'}</b></Link>
          <Link to="/calendar" className="rail-row"><CalendarClock /><span className="grow">Lezioni oggi</span><b>{data?.lessons_today ?? '–'}</b></Link>
          <Link to="/payments" className="rail-row"><Wallet /><span className="grow">Da incassare</span>
            {data && (data.overdue_total_cents > 0 ? <b className="red">{euro(data.overdue_total_cents)}</b> : <b className="green">Tutto incassato</b>)}</Link>
        </div>

        <Link to="/messages" className="card rail-cta fade-in">
          <span className="cta-icon"><MessageCircle /></span>
          <span className="grow"><b>Messaggi pronti</b><span>{data?.pending_messages ? `${data.pending_messages} da inviare su WhatsApp` : 'Solleciti e promemoria già scritti'}</span></span>
          <ArrowRight />
        </Link>
      </aside>

      <div className="dash-main">
      <SectionTitle idx={1} total={2}>I tuoi clienti</SectionTitle>
      {!data ? <div className="client-grid"><div className="skeleton" style={{ height: 260 }} /></div>
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
      </div>
      {paying && <PayForm payment={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
