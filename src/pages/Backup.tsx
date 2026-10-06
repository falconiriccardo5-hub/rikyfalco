import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload, Download, FolderOpen, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { Confirm, Empty, ErrorBox, Loading, PageHead, useAction, useApi, useToast } from '../components/ui';
import { api } from '../lib/api';

type B = {
  connected: boolean; auto: boolean; retention: number; drive_error: string | null;
  history: { id: string; ts: string; trigger: string; status: string; rows: number; error: string | null }[];
  drive: { id: string; name: string; createdTime: string }[];
};

const TABLES = ['clients', 'leads', 'payments', 'sessions', 'messages', 'notifications', 'activity', 'settings'];

export default function Backup() {
  const { data, error } = useApi<B>('/backup');
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState<null | { drive: { id: string; name: string } } | { files: Record<string, string> }>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const act = useAction();
  const toast = useToast();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const last = data.history.find((h) => h.status === 'ok');

  const pickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files: Record<string, string> = {};
    for (const f of Array.from(list)) {
      const t = f.name.replace(/\.csv$/i, '').replace(/^.*?(clients|leads|payments|sessions|messages|notifications|activity|settings)$/, '$1');
      if (!TABLES.includes(t)) { toast(`File ignorato: ${f.name}`, true); continue; }
      if (f.size > 6 * 1024 * 1024) { toast(`File troppo grande: ${f.name}`, true); continue; }
      files[t] = await f.text();
    }
    if (!files.clients) { toast('Seleziona almeno clients.csv (puoi selezionare tutti i CSV insieme)', true); return; }
    setRestore({ files });
  };

  return (
    <>
      <PageHead label="SICUREZZA DEI DATI" title="Backup">
        <a className="btn btn-lg" href="/api/backup/download" download><Download /> Scarica backup (.zip)</a>
        <button className="btn btn-primary btn-lg" disabled={!data.connected || busy}
          onClick={async () => { setBusy(true); await act(() => api.post('/backup/run'), 'Backup salvato su Google Drive'); setBusy(false); }}>
          {busy ? <span className="spinner" /> : <><CloudUpload /> Backup su Drive ora</>}
        </button>
      </PageHead>

      <div className="kpis fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card kpi"><div className="label">Google Drive</div><div className={`val sm ${data.connected ? 'green' : 'amber'}`}>{data.connected ? 'Collegato' : 'Non collegato'}</div>
          <div className="note">{data.connected ? 'Cartella “RF Coaching – Backup”' : <Link to="/settings" style={{ textDecoration: 'underline' }}>Collega in Impostazioni</Link>}</div></div>
        <div className="card kpi"><div className="label">Ultimo backup</div><div className="val sm">{last ? new Date(last.ts).toLocaleDateString('it-IT') : '—'}</div>
          <div className="note">{last ? `${new Date(last.ts).toLocaleTimeString('it-IT', { timeStyle: 'short' })} · ${last.rows} righe` : 'mai eseguito'}</div></div>
        <div className="card kpi"><div className="label">Automatico</div><div className="val sm">{data.auto ? 'Ogni notte' : 'Disattivo'}</div>
          <div className="note">Conservati gli ultimi {data.retention} backup</div></div>
      </div>

      <div className="callout fade-in" style={{ marginTop: 22 }}>
        <ShieldCheck size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
        Ogni backup è una cartella su Drive con un file CSV per tabella (apribili con Excel/Google Sheets) + <span className="mono">manifest.json</span>.
        Oltre a questi, Cloudflare D1 conserva automaticamente la cronologia del database degli ultimi 30 giorni (Time Travel).
      </div>

      <h3 style={{ fontWeight: 500, fontSize: 19, margin: '44px 0 16px' }}>Backup su Google Drive</h3>
      {data.drive_error && <div className="callout danger" style={{ marginBottom: 12 }}>{data.drive_error}</div>}
      <div className="card list fade-in">
        {!data.connected ? <Empty>Collega Google per vedere i backup su Drive.</Empty>
          : data.drive.length === 0 ? <Empty>Nessun backup ancora presente.</Empty>
          : data.drive.slice(0, 30).map((f) => (
            <div className="list-row" key={f.id}>
              <div className="row-icon violet"><FolderOpen /></div>
              <div className="grow"><div className="title mono" style={{ fontSize: 15 }}>{f.name}</div><div className="sub">{new Date(f.createdTime).toLocaleString('it-IT')}</div></div>
              <div className="actions">
                <a className="btn btn-sm" href={`https://drive.google.com/drive/folders/${encodeURIComponent(f.id)}`} target="_blank" rel="noopener noreferrer">Apri</a>
                <button className="btn btn-sm btn-danger" onClick={() => setRestore({ drive: f })}><RotateCcw /> Ripristina</button>
              </div>
            </div>
          ))}
      </div>

      <h3 style={{ fontWeight: 500, fontSize: 19, margin: '44px 0 16px' }}>Ripristina da file</h3>
      <div className="card pad fade-in">
        <p className="muted" style={{ marginTop: 0 }}>Seleziona i file CSV di un backup (scaricato da Drive o dallo .zip). Tutti i dati attuali verranno sostituiti.</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }} />
        <button className="btn" onClick={() => fileRef.current?.click()}><Upload /> Scegli file CSV…</button>
      </div>

      <h3 style={{ fontWeight: 500, fontSize: 19, margin: '44px 0 16px' }}>Storico</h3>
      <div className="card list fade-in">
        {data.history.length === 0 ? <Empty>Nessun backup eseguito.</Empty> : data.history.map((h) => (
          <div className="list-row" key={h.id}>
            <div className="grow"><div>{new Date(h.ts).toLocaleString('it-IT')} · {h.trigger}</div>{h.error && <div className="sub red">{h.error}</div>}</div>
            <span className={`pill ${h.status === 'ok' ? 'green' : 'red'}`}>{h.status === 'ok' ? `${h.rows} righe` : 'errore'}</span>
          </div>
        ))}
      </div>

      {restore && (
        <Confirm title="Ripristina backup" danger confirmLabel="Ripristina" requireText="RIPRISTINA"
          text={<>Tutti i dati attuali verranno <b>sostituiti</b> con quelli del backup {'drive' in restore ? <b className="mono">{restore.drive.name}</b> : `(${Object.keys(restore.files).join(', ')})`}.
            {data.connected ? ' Prima del ripristino verrà salvata automaticamente una copia dei dati attuali su Drive.' : ' Ti consigliamo di scaricare prima un backup (.zip) dei dati attuali.'}</>}
          onConfirm={async () => {
            const r = await act(() => 'drive' in restore
              ? api.post<{ rows: number }>('/backup/restore-drive', { folder_id: restore.drive.id, confirm: 'RIPRISTINA' })
              : api.post<{ rows: number }>('/backup/restore', { files: restore.files, confirm: 'RIPRISTINA' }));
            if (r) toast(`Ripristino completato: ${r.rows} righe`);
          }}
          onClose={() => setRestore(null)} />
      )}
    </>
  );
}
