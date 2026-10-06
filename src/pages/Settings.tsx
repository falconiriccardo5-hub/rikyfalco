import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Cloud, Copy, ExternalLink, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { Confirm, ErrorBox, Loading, PageHead, useAction, useApi, useToast } from '../components/ui';
import { api } from '../lib/api';

type S = {
  coach_name: string; calendar_name: string; default_duration: number; backup_auto: boolean; backup_retention: number; email: string;
  templates: Record<string, string>; default_templates: Record<string, string>;
  google: { configured: boolean; connected: boolean; mode: 'script' | 'oauth' | null; account: string | null; calendar_id: string | null; drive_folder_id: string | null };
};
const TPL: Record<string, [string, string]> = {
  rata_scaduta: ['Sollecito rata scaduta', '{nome} {importo} {data}'],
  rata_in_arrivo: ['Promemoria rata in arrivo (3 giorni prima)', '{nome} {importo} {data}'],
  promemoria_lezione: ['Promemoria lezione (giorno prima)', '{nome} {tipo} {data} {ora}'],
  rinnovo: ['Proposta di rinnovo (30 giorni prima)', '{nome} {data}'],
};

export default function Settings() {
  const { data, error } = useApi<S>('/settings');
  const [form, setForm] = useState<S | null>(null);
  const [params, setParams] = useSearchParams();
  const [disc, setDisc] = useState(false);
  const act = useAction();
  const toast = useToast();

  useEffect(() => { if (data) setForm(data); }, [data]);
  useEffect(() => {
    const g = params.get('google');
    if (g === 'ok') toast('Google collegato: calendario e cartella backup pronti');
    if (g === 'error') toast(`Collegamento Google non riuscito: ${params.get('reason') ?? ''}`, true);
    if (g) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorBox error={error} />;
  if (!data || !form) return <Loading />;
  const set = <K extends keyof S>(k: K, v: S[K]) => setForm({ ...form, [k]: v });

  const save = () => act(() => api.put('/settings', {
    coach_name: form.coach_name, calendar_name: form.calendar_name, default_duration: Number(form.default_duration),
    backup_auto: form.backup_auto, backup_retention: Number(form.backup_retention), templates: form.templates,
  }), 'Impostazioni salvate');

  return (
    <>
      <PageHead label="CONFIGURAZIONE" title="Impostazioni">
        <button className="btn btn-primary btn-lg" onClick={save}>Salva modifiche</button>
      </PageHead>

      <div className="stack fade-in" style={{ gap: 22 }}>
        <div className="card pad">
          <div className="label">Google Calendar e Drive</div>
          {data.google.connected ? (
            <div className="stack" style={{ marginTop: 16 }}>
              <div className="row wrap"><span className="pill green">Collegato</span><span className="muted">{data.google.account}</span>
                {data.google.mode === 'script' && <span className="dim" style={{ fontSize: 13 }}>tramite script Google</span>}</div>
              <p className="muted" style={{ margin: 0 }}>
                <CalendarCheck size={15} style={{ verticalAlign: -2 }} /> Gli appuntamenti sono nel calendario <b style={{ color: '#fff' }}>“{data.calendar_name}”</b> del tuo account Google:
                appare automaticamente su Google Calendar (PC) e sull'app Calendario dell'iPhone se l'account Google è aggiunto in Impostazioni → Calendario → Account.
                <br /><Cloud size={15} style={{ verticalAlign: -2 }} /> I backup vanno nella cartella Drive “RF Coaching – Backup”.
              </p>
              <div className="row wrap">
                <a className="btn" href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"><ExternalLink /> Apri Google Calendar</a>
                <button className="btn" onClick={() => act(() => api.post<{ synced: number }>('/google/resync'), 'Sincronizzazione completata')}><RefreshCw /> Risincronizza</button>
                <button className="btn btn-danger" onClick={() => setDisc(true)}><Unplug /> Scollega</button>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 16 }}>
              <p className="muted" style={{ margin: 0 }}>Collega il tuo account Google: l'app creerà un calendario dedicato “{data.calendar_name}” e una cartella “RF Coaching – Backup” per i backup.</p>
              <ScriptSetup />
              {data.google.configured && (
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>In alternativa, con le credenziali di Google Cloud già configurate sul server:{' '}
                  <a href="/api/google/connect" style={{ textDecoration: 'underline' }}>collega con OAuth</a>.</p>
              )}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="label">Generale</div>
          <div className="grid-3" style={{ marginTop: 16 }}>
            <label className="field"><span>Nome e cognome</span><input className="input" maxLength={60} value={form.coach_name} onChange={(e) => set('coach_name', e.target.value)} /></label>
            <label className="field"><span>Nome calendario Google</span><input className="input" maxLength={80} value={form.calendar_name} onChange={(e) => set('calendar_name', e.target.value)} /></label>
            <label className="field"><span>Durata lezione predefinita (min)</span><input className="input" type="number" min={5} max={600} value={form.default_duration} onChange={(e) => set('default_duration', Number(e.target.value))} /></label>
          </div>
        </div>

        <div className="card pad">
          <div className="label">Backup automatico</div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <label className="field"><span>Backup notturno su Drive</span>
              <select className="select" value={String(form.backup_auto)} onChange={(e) => set('backup_auto', e.target.value === 'true')}><option value="true">Attivo (a ogni modifica, entro un'ora, e ogni notte)</option><option value="false">Disattivo</option></select></label>
            <label className="field"><span>Giorni di backup da conservare</span><input className="input" type="number" min={7} max={365} value={form.backup_retention} onChange={(e) => set('backup_retention', Number(e.target.value))} /></label>
          </div>
        </div>

        <div className="card pad">
          <div className="label">Testi dei messaggi</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {Object.entries(TPL).map(([k, [label, vars]]) => (
              <label className="field" key={k}>
                <span>{label} <span className="dim mono" style={{ fontSize: 12 }}>· variabili: {vars}</span></span>
                <textarea className="textarea" maxLength={2000} value={form.templates[k] ?? ''} onChange={(e) => set('templates', { ...form.templates, [k]: e.target.value })} />
              </label>
            ))}
            <div><button className="btn btn-sm" onClick={() => set('templates', data.default_templates)}>Ripristina testi predefiniti</button></div>
          </div>
        </div>

        <div className="card pad">
          <div className="label">Sicurezza</div>
          <ul className="muted" style={{ margin: '16px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
            <li><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Accesso protetto da Cloudflare Access — sei entrato come <b style={{ color: '#fff' }}>{data.email}</b></li>
            <li>Ogni richiesta è verificata anche dal server (firma del token Cloudflare + email autorizzata)</li>
            <li>Token Google cifrati nel database (AES-256-GCM) e permessi Google minimi</li>
            <li>Ogni modifica è registrata nella sezione Attività</li>
          </ul>
        </div>
      </div>
      {disc && <Confirm title="Scollega Google" danger confirmLabel="Scollega" text="L'app smetterà di aggiornare calendario e backup su Google. Quelli già presenti resteranno. Se avevi usato lo script, puoi anche eliminarlo da script.google.com."
        onConfirm={() => act(() => api.post('/google/disconnect'), 'Google scollegato')} onClose={() => setDisc(false)} />}
    </>
  );
}

/** Collegamento a Google senza Google Cloud Console: uno script nell'account Google fa da ponte. */
function ScriptSetup() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const toast = useToast();

  const copy = async () => {
    // Safari accetta la copia solo se avviata subito dal clic: si passa la richiesta come promessa
    const text = fetch('/api/google/script', { credentials: 'same-origin' }).then((res) => {
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      return res.text();
    }).then((t) => new Blob([t], { type: 'text/plain' }));
    try {
      if (typeof ClipboardItem !== 'undefined') await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })]);
      else await navigator.clipboard.writeText(await (await text).text());
      toast('Codice copiato');
    } catch {
      toast('Copia automatica non riuscita: usa "apri il codice" e copialo a mano', true);
    }
  };

  const connect = async () => {
    setBusy(true);
    await act(() => api.post('/google/script', { url: url.trim() }), 'Google collegato: calendario e cartella backup pronti');
    setBusy(false);
  };

  const step = { margin: 0, paddingLeft: 20, lineHeight: 1.8 } as const;
  return (
    <ol className="muted" style={step}>
      <li><button className="btn btn-sm" onClick={copy}><Copy /> Copia il codice</button>{' '}
        <span style={{ fontSize: 13 }}>oppure <a href="/api/google/script" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>apri il codice</a> e copialo tutto</span></li>
      <li>Apri <a href="https://script.google.com/create" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>script.google.com</a> (nuovo progetto),
        cancella il testo che c'è, <b>incolla</b> il codice e premi l'icona del dischetto per salvare.</li>
      <li>In alto a destra: <b>Esegui il deployment → Nuovo deployment</b>. Ingranaggio accanto a "Seleziona tipo" → <b>App web</b>.
        "Esegui come": <b>Me</b> · "Chi può accedere": <b>Chiunque</b> → <b>Esegui il deployment</b>.</li>
      <li><b>Autorizza l'accesso</b> col tuo account. Google avvisa che l'app non è verificata (è il tuo script):
        <b> Avanzate → Vai a … (non sicuro) → Consenti</b>.</li>
      <li>Copia l'<b>URL dell'app web</b> (finisce con <span className="mono">/exec</span>) e incollalo qui:
        <div className="row wrap" style={{ marginTop: 8 }}>
          <input className="input" style={{ flex: 1, minWidth: 220 }} placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn btn-accent" disabled={busy || !url.trim()} onClick={connect}>{busy ? <span className="spinner" /> : <><Link2 /> Collega Google</>}</button>
        </div>
      </li>
    </ol>
  );
}
