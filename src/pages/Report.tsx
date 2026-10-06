import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { ErrorBox, Loading, SpotCard, useApi } from '../components/ui';
import { addMonths, euro, itDate, METHOD_LABEL, monthName, todayRome } from '../lib/format';

type R = {
  month: string; incassato: number; incassato_prev: number; pagamenti_count: number; da_incassare: number; scaduto: number;
  rinnovi: { fatti: number; totale: number }; lezioni: { svolte: number; saltate: number; in_calendario: number };
  chart: { month: string; paid: number }[]; clienti: { nuovi: number; iniziati: number; rinnovi: number };
  per_metodo: Record<string, number>; ricevuti: { id: string; name: string; label: string; paid_at: string; amount_cents: number; method: string | null }[];
};

export default function Report() {
  const cur = todayRome().slice(0, 7);
  const [month, setMonth] = useState(cur);
  const { data, error } = useApi<R>(`/report?month=${month}`);
  if (error) return <ErrorBox error={error} />;
  const [y, m] = month.split('-').map(Number);
  const delta = data && data.incassato_prev ? Math.round(((data.incassato - data.incassato_prev) / data.incassato_prev) * 100) : null;
  const max = data ? Math.max(1, ...data.chart.map((c) => c.paid)) : 1;

  return (
    <>
      <div className="page-head fade-in">
        <div><div className="label">Report mensile</div><h1 style={{ textTransform: 'capitalize' }}>{monthName(m - 1)} {y}</h1></div>
        <div className="row wrap no-print">
          <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mese precedente"><ChevronLeft /></button>
          {month < cur && <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mese successivo"><ChevronRight /></button>}
          <a className="btn btn-lg" href={`/api/report/export?month=${month}`} download><Download /> Excel</a>
          <button className="btn btn-lg" onClick={() => window.print()}><Printer /> PDF</button>
        </div>
      </div>
      {!data ? <Loading /> : (
        <>
          <div className="kpis fade-in">
            <SpotCard className="kpi hover"><div className="label">Incassato</div><div className="val sm green">{euro(data.incassato)}</div>
              <div className="note">{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`} sul mese prima · {data.pagamenti_count} pagamenti</div></SpotCard>
            <SpotCard className="kpi hover"><div className="label">Da incassare</div><div className={`val sm ${data.da_incassare ? 'red' : ''}`}>{euro(data.da_incassare)}</div>
              <div className="note">di cui {euro(data.scaduto)} scaduti</div></SpotCard>
            <SpotCard className="kpi hover"><div className="label">Rinnovi</div><div className="val sm">{data.rinnovi.totale ? `${Math.round((data.rinnovi.fatti / data.rinnovi.totale) * 100)}%` : '—'}</div>
              <div className="note">{data.rinnovi.fatti} su {data.rinnovi.totale} percorsi in scadenza</div></SpotCard>
            <SpotCard className="kpi hover"><div className="label">Lezioni fatte</div><div className="val sm">{data.lezioni.svolte}</div>
              <div className="note">{data.lezioni.saltate} saltate · {data.lezioni.in_calendario} in calendario</div></SpotCard>
          </div>

          <h3 style={{ fontWeight: 500, fontSize: 19, margin: '50px 0 18px' }}>Incassi ultimi 12 mesi</h3>
          <SpotCard className="pad glow fade-in" style={{ padding: '28px 28px 20px' }}>
            <div className="bars12">
              {data.chart.map((c) => (
                <div className="b" key={c.month}>
                  <div className={`fill ${c.month === month ? 'cur' : ''}`} style={{ height: `${(c.paid / max) * 85}%` }}><span className="tip">{euro(c.paid)}</span></div>
                  <div className="l">{monthName(Number(c.month.slice(5)) - 1)[0].toUpperCase()}</div>
                </div>
              ))}
            </div>
          </SpotCard>

          <div className="grid-2 fade-in" style={{ marginTop: 50, gap: 18 }}>
            <div className="card pad"><div className="label">Clienti</div>
              <p style={{ fontSize: 17, margin: '22px 0 0' }}>{data.clienti.nuovi} nuovi clienti · {data.clienti.iniziati} percorsi iniziati ({data.clienti.rinnovi} rinnovi)</p></div>
            <div className="card pad"><div className="label">Incassi per metodo</div>
              {Object.keys(data.per_metodo).length === 0 ? <p className="muted" style={{ fontSize: 17, margin: '22px 0 0' }}>Nessun incasso.</p> : (
                <div className="stack" style={{ marginTop: 18 }}>
                  {Object.entries(data.per_metodo).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <div key={k} className="spread"><span>{METHOD_LABEL[k] ?? k}</span><span>{euro(v)}</span></div>
                  ))}
                </div>)}
            </div>
          </div>

          <h3 style={{ fontWeight: 500, fontSize: 19, margin: '50px 0 18px' }}>Pagamenti ricevuti</h3>
          <div className="card list fade-in">
            {data.ricevuti.length === 0 ? <div className="muted" style={{ padding: '24px 28px', fontSize: 17 }}>Nessun pagamento nel mese.</div> : data.ricevuti.map((p) => (
              <div className="list-row" key={p.id}>
                <div className="grow"><div className="title">{p.name}</div><div className="sub">{itDate(p.paid_at)} · {p.label} · {METHOD_LABEL[p.method || 'altro']}</div></div>
                <span style={{ fontSize: 17 }}>{euro(p.amount_cents)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
