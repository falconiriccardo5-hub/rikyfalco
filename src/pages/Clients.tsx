import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useOpen } from '../components/Layout';
import { Empty, ErrorBox, Loading, PageHead, useApi } from '../components/ui';
import type { ClientSummary } from '../lib/api';
import { initials, itDate, MODE_LABEL, STATUS_LABEL } from '../lib/format';

const FILTERS = [
  ['tutti', 'Tutti'], ['attivi', 'Attivi'], ['in_scadenza', 'In scadenza'], ['scaduti', 'Scaduti'], ['mancanti', 'Pagamenti mancanti'],
  ['live', 'Live'], ['online', 'Online'], ['misto', 'Misto'], ['archiviati', 'Archiviati'],
] as const;

const statusPill = (s: ClientSummary['status']) =>
  ({ attivo: 'green', in_scadenza: 'amber', scaduto: 'red', archiviato: 'gray', non_iniziato: 'violet' })[s];

export default function Clients() {
  const { data, error } = useApi<ClientSummary[]>('/clients');
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof FILTERS)[number][0]>('tutti');
  const [sort, setSort] = useState('nome');
  const open = useOpen();
  const nav = useNavigate();

  const list = useMemo(() => {
    if (!data) return [];
    const ql = q.trim().toLowerCase();
    let r = data.filter((c) => !ql || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(ql));
    r = r.filter((c) => {
      switch (f) {
        case 'tutti': return c.status !== 'archiviato';
        case 'attivi': return c.status === 'attivo' || c.status === 'in_scadenza';
        case 'in_scadenza': return c.status === 'in_scadenza';
        case 'scaduti': return c.status === 'scaduto';
        case 'mancanti': return c.overdue_count > 0;
        case 'archiviati': return c.status === 'archiviato';
        default: return c.mode === f && c.status !== 'archiviato';
      }
    });
    const by: Record<string, (a: ClientSummary, b: ClientSummary) => number> = {
      nome: (a, b) => a.name.localeCompare(b.name, 'it'),
      scadenza: (a, b) => a.end_date.localeCompare(b.end_date),
      recenti: (a, b) => b.created_at.localeCompare(a.created_at),
      insoluti: (a, b) => b.overdue_cents - a.overdue_cents,
    };
    return [...r].sort(by[sort]);
  }, [data, q, f, sort]);

  if (error) return <ErrorBox error={error} />;
  const count = data?.filter((c) => c.status !== 'archiviato').length ?? 0;

  return (
    <>
      <PageHead label={`${count} CLIENTI`} title="Clienti">
        <button className="btn btn-primary btn-lg" onClick={open.client}><Plus /> Nuovo cliente</button>
      </PageHead>
      <div className="row wrap fade-in" style={{ gap: 16, marginBottom: 20 }}>
        <div className="search grow" style={{ minWidth: 240 }}><Search /><input className="input" placeholder="Cerca per nome, email o telefono" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select" style={{ width: 'auto', height: 58, borderRadius: 999, padding: '0 48px 0 22px', fontSize: 16 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordina">
          <option value="nome">Ordina: Nome</option><option value="scadenza">Ordina: Scadenza</option><option value="recenti">Ordina: Più recenti</option><option value="insoluti">Ordina: Insoluti</option>
        </select>
      </div>
      <div className="chips fade-in" style={{ marginBottom: 34 }}>
        {FILTERS.map(([k, l]) => <button key={k} className={`chip ${f === k ? 'active' : ''}`} onClick={() => setF(k)}>{l}</button>)}
      </div>
      {!data ? <Loading /> : (
        <div className="card fade-in table-wrap">
          {list.length === 0 ? <Empty>Nessun cliente trovato.</Empty> : (
            <table className="table">
              <thead><tr><th>CLIENTE</th><th className="hide-sm">PERCORSO</th><th className="hide-sm">PERIODO</th><th>STATO</th><th className="hide-sm">PAGAMENTO</th><th /></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} onClick={() => nav(`/clients/${c.id}`)}>
                    <td>
                      <div className="row" style={{ gap: 16 }}>
                        <div className="avatar">{initials(c.first_name, c.last_name)}</div>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 16.5 }}>{c.name}</div><div className="muted truncate" style={{ fontSize: 14 }}>{c.email || c.phone}</div></div>
                      </div>
                    </td>
                    <td className="hide-sm">{c.program_months} mesi · {MODE_LABEL[c.mode]}</td>
                    <td className="hide-sm muted">{itDate(c.start_date)} → {itDate(c.end_date)}</td>
                    <td><span className={`pill ${statusPill(c.status)}`}>{STATUS_LABEL[c.status]}</span></td>
                    <td className="hide-sm">
                      {c.overdue_count > 0 ? <span className="red">Insoluto</span> : <span className="muted">Regolare</span>}
                      <span className="dim"> · {c.payments_paid}/{c.payments_total}</span>
                    </td>
                    <td style={{ width: 40 }}><ChevronRight className="muted" size={18} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
