import { useSearchParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading, useApi } from '../components/ui';
import { MeasuresPanel } from '../components/Measures';
import type { ClientSummary } from '../lib/api';

/** Sezione laterale "Misure": scegli un cliente e confronta pliche, circonferenze e composizione corporea nel tempo. */
export default function Measures() {
  const { data, error } = useApi<ClientSummary[]>('/clients');
  const [params, setParams] = useSearchParams();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const list = data.filter((c) => !c.archived_at);
  const id = params.get('client') ?? '';
  return (
    <div className="minimal-page">
      <div className="mp-head fade-in"><h1>Misure</h1></div>
      <label className="field fade-in" style={{ maxWidth: 360 }}><span>Cliente</span>
        <select className="select" value={id} onChange={(e) => setParams(e.target.value ? { client: e.target.value } : {}, { replace: true })}>
          <option value="">Seleziona un cliente…</option>
          {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
      <div style={{ marginTop: 20 }}>
        {id ? <MeasuresPanel key={id} clientId={id} /> : <div className="card"><Empty>Scegli un cliente per vedere le sue misure e i grafici.</Empty></div>}
      </div>
    </div>
  );
}
