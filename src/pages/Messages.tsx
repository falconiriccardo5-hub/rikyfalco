import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Mail, MessageCircle, Send, X } from 'lucide-react';
import { Empty, ErrorBox, Loading, PageHead, useAction, useApi, useToast } from '../components/ui';
import { api } from '../lib/api';
import { waNumber } from '../lib/format';

type M = { id: string; client_id: string; kind: string; body: string; status: string; created_at: string; sent_at: string | null; first_name: string; last_name: string; phone: string; email: string };
const KIND: Record<string, string> = { rata_scaduta: 'Sollecito rata', rata_in_arrivo: 'Promemoria rata', promemoria_lezione: 'Promemoria lezione', rinnovo: 'Rinnovo percorso' };

export default function Messages() {
  const [status, setStatus] = useState<'da_inviare' | 'inviato' | 'ignorato'>('da_inviare');
  const { data, error } = useApi<M[]>(`/messages?status=${status}`);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const act = useAction();
  const toast = useToast();
  if (error) return <ErrorBox error={error} />;

  const markSent = (m: M) => act(() => api.post(`/messages/${m.id}/status`, { status: 'inviato', body: edits[m.id] }), 'Segnato come inviato');

  return (
    <>
      <PageHead label="DA INVIARE" title="Messaggi" />
      <div className="callout fade-in" style={{ marginBottom: 22 }}>
        I messaggi vengono preparati automaticamente (rate, promemoria, rinnovi). Premi <b>WhatsApp</b> per aprirlo già compilato, poi segnalo come inviato.
        Puoi modificare i testi in <Link to="/settings" style={{ textDecoration: 'underline' }}>Impostazioni</Link>.
      </div>
      <div className="chips fade-in" style={{ marginBottom: 22 }}>
        {([['da_inviare', 'Da inviare'], ['inviato', 'Inviati'], ['ignorato', 'Ignorati']] as const).map(([k, l]) =>
          <button key={k} className={`chip ${status === k ? 'active' : ''}`} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      {!data ? <Loading /> : (
        <div className="stack fade-in">
          {data.length === 0 && <div className="card"><Empty icon={<Send />}>Nessun messaggio.</Empty></div>}
          {data.map((m) => {
            const body = edits[m.id] ?? m.body;
            return (
              <div className="card pad" key={m.id}>
                <div className="spread wrap">
                  <div><Link to={`/clients/${m.client_id}`} style={{ fontSize: 17 }}>{m.first_name} {m.last_name}</Link> <span className="pill violet plain" style={{ marginLeft: 8 }}>{KIND[m.kind] ?? m.kind}</span></div>
                  <span className="dim" style={{ fontSize: 13 }}>{new Date(m.sent_at || m.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {status === 'da_inviare'
                  ? <textarea className="textarea" style={{ marginTop: 14 }} value={body} maxLength={2000} onChange={(e) => setEdits((s) => ({ ...s, [m.id]: e.target.value }))} />
                  : <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p>}
                {status === 'da_inviare' && (
                  <div className="row wrap" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => act(() => api.post(`/messages/${m.id}/status`, { status: 'ignorato' }), 'Messaggio ignorato')}><X /> Ignora</button>
                    <button className="btn btn-sm" onClick={async () => { await navigator.clipboard.writeText(body); toast('Testo copiato'); }}><Copy /> Copia</button>
                    {m.email && <a className="btn btn-sm" href={`mailto:${m.email}?body=${encodeURIComponent(body)}`}><Mail /> Email</a>}
                    {m.phone && <a className="btn btn-sm btn-green" href={`https://wa.me/${waNumber(m.phone)}?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>}
                    <button className="btn btn-sm btn-primary" onClick={() => markSent(m)}><Check /> Inviato</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
