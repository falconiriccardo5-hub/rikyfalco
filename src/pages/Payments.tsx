import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, RotateCcw } from 'lucide-react';
import { PayForm } from '../components/Forms';
import { Empty, ErrorBox, Loading, PageHead, SpotCard, useAction, useApi } from '../components/ui';
import { api, type Payment } from '../lib/api';
import { daysDiff, euro, itDate, METHOD_LABEL, MONTHS_SHORT, todayRome } from '../lib/format';

type Data = {
  kpi: { incassato_mese: number; da_incassare: number; scaduto: number; programmato: number };
  chart: { month: string; paid: number; expected: number }[];
  payments: (Payment & { name: string; archived_at: string | null })[];
};

const TABS = [['da_incassare', 'Da incassare'], ['scaduti', 'Scaduti'], ['in_arrivo', 'In arrivo'], ['programmati', 'Programmati'], ['pagati', 'Pagati']] as const;

export default function Payments() {
  const { data, error } = useApi<Data>('/payments');
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('da_incassare');
  const [paying, setPaying] = useState<Payment | null>(null);
  const act = useAction();

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const today = todayRome();
  const list = data.payments.filter((p) => {
    switch (tab) {
      case 'da_incassare': return p.state === 'scaduto' || p.state === 'da_incassare';
      case 'scaduti': return p.state === 'scaduto';
      case 'in_arrivo': return p.state === 'da_incassare';
      case 'programmati': return p.state === 'programmato';
      case 'pagati': return p.state === 'pagato';
    }
  });
  if (tab === 'pagati') list.sort((a, b) => (b.paid_at! > a.paid_at! ? 1 : -1));
  const max = Math.max(1, ...data.chart.flatMap((c) => [c.paid, c.expected]));

  return (
    <>
      <PageHead label="RATE E INCASSI" title="Pagamenti" />
      <div className="kpis fade-in">
        <SpotCard className="kpi hover"><div className="label">Incassato questo mese</div><div className="val">{euro(data.kpi.incassato_mese)}</div></SpotCard>
        <SpotCard className="kpi hover"><div className="label">Da incassare</div><div className="val">{euro(data.kpi.da_incassare)}</div></SpotCard>
        <SpotCard className={`kpi hover ${data.kpi.scaduto ? 'danger' : ''}`}><div className="label">Scaduto</div><div className="val">{euro(data.kpi.scaduto)}</div></SpotCard>
        <SpotCard className="kpi hover"><div className="label">Programmato</div><div className="val">{euro(data.kpi.programmato)}</div></SpotCard>
      </div>

      <SpotCard className="pad glow fade-in" style={{ marginTop: 50, padding: '34px 34px 30px' }}>
        <div className="label">Ultimi 6 mesi</div>
        <div className="bars" style={{ marginTop: 20 }}>
          {data.chart.map((c) => (
            <div className="col" key={c.month}>
              <div className="pair" title={`Incassato ${euro(c.paid)} · Previsto ${euro(c.expected)}`}>
                <div className="bar exp" style={{ height: `${(c.expected / max) * 100}%` }} />
                <div className="bar paid" style={{ height: `${(c.paid / max) * 100}%` }} />
              </div>
              <div className="m">{MONTHS_SHORT[Number(c.month.slice(5)) - 1]}</div>
            </div>
          ))}
        </div>
        <div className="legend" style={{ marginTop: 18 }}><span><i className="paid" />Incassato</span><span><i className="exp" />Previsto</span></div>
      </SpotCard>

      <div className="chips fade-in" style={{ margin: '50px 0 22px' }}>
        {TABS.map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="card list fade-in">
        {list.length === 0 ? <Empty>Nessun pagamento in questa sezione.</Empty> : list.map((p) => {
          const late = daysDiff(p.due_date, today);
          return (
            <div className="list-row" key={p.id}>
              <div className="grow">
                <Link to={`/clients/${p.client_id}`} className="title">{p.name}</Link>
                <div className="sub">
                  {p.paid_at ? `Pagato il ${itDate(p.paid_at)} · ${METHOD_LABEL[p.method || 'altro']}` : `Scadenza ${itDate(p.due_date)}`}
                  {p.state === 'scaduto' && ` · scaduta da ${late} giorni`}
                  {p.state === 'da_incassare' && (late === 0 ? ' · scade oggi' : ` · tra ${-late} giorni`)}
                  {p.label && ` · ${p.label}`}
                </div>
              </div>
              <div className="actions">
                <span style={{ fontSize: 19, fontWeight: 500 }}>{euro(p.paid_amount_cents ?? p.amount_cents)}</span>
                {p.state === 'scaduto' && <span className="pill red">Scaduto</span>}
                {p.state === 'da_incassare' && <span className="pill amber">In arrivo</span>}
                {p.state === 'pagato' && <span className="pill green">Pagato</span>}
                {p.state === 'scaduto' && <Link to="/messages" className="icon-btn sm" aria-label="Sollecito"><MessageCircle /></Link>}
                {p.paid_at
                  ? <button className="icon-btn sm" title="Annulla incasso" aria-label="Annulla incasso" onClick={() => act(() => api.post(`/payments/${p.id}/unpay`), 'Incasso annullato')}><RotateCcw /></button>
                  : <>
                      <button className="btn btn-danger" onClick={() => act(() => api.post(`/payments/${p.id}/pay`, { method: 'bonifico' }), 'Incasso registrato')}><Check /> Pagata</button>
                      <button className="btn" onClick={() => setPaying(p)}><Check /> Importo…</button>
                    </>}
              </div>
            </div>
          );
        })}
      </div>
      {paying && <PayForm payment={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
