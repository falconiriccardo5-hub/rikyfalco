import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Empty, ErrorBox, Loading, PageHead, useApi } from '../components/ui';
import { api } from '../lib/api';

type A = { id: number; ts: string; actor: string; action: string; entity: string; summary: string };

export default function ActivityLog() {
  const { data, error } = useApi<A[]>('/activity');
  const [items, setItems] = useState<A[]>([]);
  const [more, setMore] = useState(true);
  useEffect(() => { if (data) { setItems(data); setMore(data.length === 100); } }, [data]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <>
      <PageHead label="REGISTRO DI SICUREZZA" title="Attività" />
      <p className="muted fade-in" style={{ marginTop: -14, marginBottom: 24 }}>Ogni modifica ai dati viene registrata con data, ora e account che l'ha eseguita.</p>
      <div className="card fade-in table-wrap">
        {items.length === 0 ? <Empty icon={<Activity />}>Nessuna attività registrata.</Empty> : (
          <table className="table">
            <thead><tr><th>QUANDO</th><th>AZIONE</th><th>DETTAGLIO</th><th className="hide-sm">ACCOUNT</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={{ cursor: 'default' }}>
                  <td className="muted mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(a.ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><span className="pill violet plain">{a.entity} · {a.action}</span></td>
                  <td>{a.summary}</td>
                  <td className="hide-sm dim" style={{ fontSize: 13 }}>{a.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {more && items.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
          <button className="btn" onClick={async () => { const r = await api.get<A[]>(`/activity?before=${items.at(-1)!.id}`); setItems((s) => [...s, ...r]); setMore(r.length === 100); }}>Carica altre</button>
        </div>
      )}
    </>
  );
}
