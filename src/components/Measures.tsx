import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Confirm, Empty, ErrorBox, Loading, Modal, useAction, useApi } from './ui';
import { api, type ClientSummary, type Measurement } from '../lib/api';
import { itDate, todayRome } from '../lib/format';
import { ageAt, CHART_GROUPS, compute, GIRTHS, mean, METRICS, parseNum, SKINFOLDS, type Metric, type Num } from '../lib/measures';

const COLORS = ['#8b7bff', '#34d399', '#f59e0b', '#f472b6', '#38bdf8', '#f87171', '#a3e635'];
const fmt = (n: Num, d = 1) => (n === null ? '—' : n.toLocaleString('it-IT', { maximumFractionDigits: d }));
const shortDate = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}/${d.slice(2, 4)}`;

// ───── Modulo: nuova misurazione / modifica ─────
export function MeasureForm({ clientId, measurement, onClose }: { clientId?: string; measurement?: Measurement; onClose: () => void }) {
  const clients = useApi<ClientSummary[]>('/clients');
  const act = useAction();
  const editing = !!measurement;
  const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));
  const [client, setClient] = useState(measurement?.client_id ?? clientId ?? '');
  const [date, setDate] = useState(measurement?.measured_at ?? todayRome());
  const [ageTxt, setAgeTxt] = useState<string | null>(measurement ? str(measurement.age) : null); // null = automatica dalla data di nascita
  const [weight, setWeight] = useState(str(measurement?.weight_kg));
  const [sf, setSf] = useState<Record<string, string[]>>(() => Object.fromEntries(SKINFOLDS.map((s) => [s.key, [0, 1, 2].map((i) => str(measurement?.skinfolds[s.key]?.[i]))])));
  const [gi, setGi] = useState<Record<string, string>>(() => Object.fromEntries(GIRTHS.map((g) => [g.key, str(measurement?.girths[g.key])])));
  const [notes, setNotes] = useState(measurement?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const birth = clients.data?.find((c) => c.id === client)?.birth_date;
  const auto = ageAt(birth, date);
  const age = ageTxt === null ? auto : parseNum(ageTxt) === null ? null : Math.round(parseNum(ageTxt)!);

  const data = {
    measured_at: date, age, weight_kg: parseNum(weight),
    skinfolds: Object.fromEntries(SKINFOLDS.map((s) => [s.key, sf[s.key].map(parseNum)])),
    girths: Object.fromEntries(GIRTHS.map((g) => [g.key, parseNum(gi[g.key])])),
  };
  const c = compute(data);

  return (
    <Modal title={editing ? 'Modifica misurazione' : 'Nuova misurazione'} onClose={onClose} wide>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const body = { ...data, notes };
        const r = await act(() => editing ? api.patch(`/measurements/${measurement!.id}`, body) : api.post('/measurements', { ...body, client_id: client }), editing ? 'Misurazione aggiornata' : 'Misurazione salvata');
        setBusy(false); if (r) onClose();
      }}>
        <div className="grid-3">
          {!editing && !clientId ? (
            <label className="field"><span>Cliente *</span>
              <select className="select" required value={client} onChange={(e) => setClient(e.target.value)}>
                <option value="">Seleziona…</option>
                {clients.data?.filter((x) => !x.archived_at).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select></label>
          ) : <div />}
          <label className="field"><span>Data della visita</span><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field"><span>Peso (kg)</span><input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        </div>
        <label className="field"><span>Età {ageTxt === null && auto !== null ? '(dalla data di nascita)' : ''}</span>
          <input className="input" inputMode="numeric" style={{ maxWidth: 140 }} value={ageTxt ?? str(auto)} onChange={(e) => setAgeTxt(e.target.value)} /></label>

        <div className="label">Pliche (mm) · 3 rilevazioni</div>
        <div className="meas-grid">
          <span /><b>1ª</b><b>2ª</b><b>3ª</b><b>Media</b>
          {SKINFOLDS.map((s) => (
            <MeasRow key={s.key} label={s.label} values={sf[s.key]} avg={mean(data.skinfolds[s.key])}
              onChange={(i, v) => setSf((p) => ({ ...p, [s.key]: p[s.key].map((x, j) => (j === i ? v : x)) }))} />
          ))}
        </div>
        <div className="callout" style={{ margin: 0 }}>
          Somma <b>{fmt(c.sum, 2)}</b> mm · % massa grassa <b>{fmt(c.pct, 2)}</b> · massa grassa <b>{fmt(c.fatKg, 2)}</b> kg · massa magra <b>{fmt(c.leanKg, 2)}</b> kg
          {c.pct === null && <div className="muted" style={{ marginTop: 6 }}>Servono le 5 pliche e l'età (e il peso per i kg).</div>}
        </div>

        <div className="label">Circonferenze (cm)</div>
        <div className="grid-4">
          {GIRTHS.map((g) => (
            <label className="field" key={g.key}><span>{g.label}</span>
              <input className="input" inputMode="decimal" value={gi[g.key]} onChange={(e) => setGi((p) => ({ ...p, [g.key]: e.target.value }))} /></label>
          ))}
        </div>
        <label className="field"><span>Note</span><textarea className="textarea" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !client}>{busy ? <span className="spinner" /> : 'Salva'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MeasRow({ label, values, avg, onChange }: { label: string; values: string[]; avg: Num; onChange: (i: number, v: string) => void }) {
  return (
    <>
      <span>{label}</span>
      {values.map((v, i) => <input key={i} className="input" inputMode="decimal" aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(i, e.target.value)} />)}
      <span className="muted">{fmt(avg, 2)}</span>
    </>
  );
}

// ───── Grafico a linee (SVG) ─────
function Chart({ title, metrics, rows }: { title: string; metrics: Metric[]; rows: { date: string; vals: Record<string, Num> }[] }) {
  const series = metrics.map((m, i) => ({ m, color: COLORS[i % COLORS.length], pts: rows.map((r, x) => ({ x, y: r.vals[m.key] ?? null, date: r.date })) }));
  const ys = series.flatMap((s) => s.pts.map((p) => p.y).filter((y): y is number => y !== null));
  if (ys.length === 0) return null;
  const W = 520, H = 190, L = 42, R = 12, T = 12, B = 26;
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const px = (x: number) => L + (rows.length === 1 ? (W - L - R) / 2 : (x / (rows.length - 1)) * (W - L - R));
  const py = (y: number) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  return (
    <div className="card pad meas-chart">
      <div className="label">{title} <span className="muted">({metrics[0].unit})</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafico ${title}`}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={py(t)} y2={py(t)} stroke="currentColor" opacity=".12" /><text x={L - 6} y={py(t) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity=".6">{fmt(t)}</text></g>)}
        {rows.map((r, x) => (x === 0 || x === rows.length - 1 || rows.length <= 8 || x % Math.ceil(rows.length / 8) === 0)
          && <text key={r.date} x={px(x)} y={H - 7} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".6">{shortDate(r.date)}</text>)}
        {series.map((s) => {
          const pts = s.pts.filter((p): p is typeof p & { y: number } => p.y !== null);
          return (
            <g key={s.m.key}>
              <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" points={pts.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} />
              {pts.map((p) => <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r="3.5" fill={s.color}><title>{`${s.m.label}: ${fmt(p.y, 2)} ${s.m.unit} · ${itDate(p.date)}`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      {metrics.length > 1 && <div className="row wrap" style={{ gap: 14, fontSize: 13 }}>{series.map((s) => <span key={s.m.key}><i className="dot" style={{ background: s.color }} /> {s.m.label}</span>)}</div>}
    </div>
  );
}

// ───── Confronto tra due date ─────
function Compare({ list }: { list: Measurement[] }) {
  const asc = [...list].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const [a, setA] = useState(asc.length > 1 ? asc[0].id : '');
  const [b, setB] = useState(asc.length ? asc[asc.length - 1].id : '');
  const ma = asc.find((m) => m.id === a), mb = asc.find((m) => m.id === b);
  if (asc.length < 2) return null;
  const val = (m: Measurement | undefined, x: Metric) => (m ? x.get(m, compute(m)) : null);
  const rows = METRICS.filter((x) => val(ma, x) !== null || val(mb, x) !== null);
  const sel = (v: string, set: (s: string) => void, label: string) => (
    <label className="field"><span>{label}</span>
      <select className="select" value={v} onChange={(e) => set(e.target.value)}>{asc.map((m) => <option key={m.id} value={m.id}>{itDate(m.measured_at)}</option>)}</select></label>
  );
  return (
    <div className="card pad stack">
      <div className="label">Confronto tra due visite</div>
      <div className="grid-2">{sel(a, setA, 'Visita di partenza')}{sel(b, setB, 'Visita da confrontare')}</div>
      <div className="table-wrap"><table className="meas-table">
        <thead><tr><th /><th>{ma ? shortDate(ma.measured_at) : ''}</th><th>{mb ? shortDate(mb.measured_at) : ''}</th><th>Differenza</th></tr></thead>
        <tbody>{rows.map((x) => {
          const va = val(ma, x), vb = val(mb, x), d = va !== null && vb !== null ? Math.round((vb - va) * 100) / 100 : null;
          return <tr key={x.key}><td>{x.label} <span className="muted">({x.unit})</span></td><td>{fmt(va, 2)}</td><td>{fmt(vb, 2)}</td><td><b>{d === null ? '—' : `${d > 0 ? '+' : ''}${fmt(d, 2)}`}</b></td></tr>;
        })}</tbody>
      </table></div>
    </div>
  );
}

// ───── Pannello completo di un cliente: elenco, grafici, confronto ─────
export function MeasuresPanel({ clientId }: { clientId: string }) {
  const { data, error } = useApi<Measurement[]>(`/measurements?client_id=${clientId}`);
  const [form, setForm] = useState<null | 'new' | Measurement>(null);
  const [del, setDel] = useState<Measurement | null>(null);
  const act = useAction();
  const asc = useMemo(() => [...(data ?? [])].sort((a, b) => a.measured_at.localeCompare(b.measured_at)), [data]);
  const rows = useMemo(() => asc.map((m) => { const c = compute(m); return { date: m.measured_at, vals: Object.fromEntries(METRICS.map((x) => [x.key, x.get(m, c)])) as Record<string, Num> }; }), [asc]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => setForm('new')}><Plus /> Nuova misurazione</button></div>
      {data.length === 0 ? <div className="card"><Empty>Nessuna misurazione. Con “Nuova misurazione” inserisci pliche e circonferenze nella data della visita.</Empty></div> : (
        <>
          <div className="card list">
            {data.map((m) => {
              const c = compute(m);
              return (
                <div className="list-row" key={m.id}>
                  <div className="grow">
                    <div className="title">{itDate(m.measured_at)}{m.weight_kg !== null && ` · ${fmt(m.weight_kg)} kg`}{c.pct !== null && ` · ${fmt(c.pct, 2)}% MG`}</div>
                    <div className="sub">{c.sum !== null ? `Somma pliche ${fmt(c.sum, 2)} mm` : 'Pliche incomplete'}{c.leanKg !== null && ` · magra ${fmt(c.leanKg, 2)} kg`}{m.girths.vita != null && ` · vita ${fmt(m.girths.vita)} cm`}</div>
                  </div>
                  <div className="actions">
                    <button className="icon-btn sm" aria-label="Modifica" onClick={() => setForm(m)}><Pencil /></button>
                    <button className="icon-btn sm" aria-label="Elimina" onClick={() => setDel(m)}><Trash2 /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <Compare key={data.map((m) => m.id).join()} list={data} />
          {asc.length < 2 && <div className="muted">I grafici si popolano dalla seconda misurazione.</div>}
          {asc.length >= 1 && <div className="meas-charts">{CHART_GROUPS.map((g) => <Chart key={g.title} title={g.title} metrics={g.metrics} rows={rows} />)}</div>}
        </>
      )}
      {form && <MeasureForm clientId={clientId} measurement={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
      {del && <Confirm title="Elimina misurazione" danger confirmLabel="Elimina" text={`Eliminare le misure del ${itDate(del.measured_at)}?`}
        onConfirm={() => act(() => api.del(`/measurements/${del.id}`), 'Misurazione eliminata')} onClose={() => setDel(null)} />}
    </div>
  );
}
