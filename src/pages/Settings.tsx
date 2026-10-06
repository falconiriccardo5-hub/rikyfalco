import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Cloud, ExternalLink, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { Confirm, ErrorBox, Loading, PageHead, useAction, useApi, useToast } from '../components/ui';
import { api } from '../lib/api';

type S = {
  coach_name: string; calendar_name: string; default_duration: number; backup_auto: boolean; backup_retention: number; email: string;
  templates: Record<string, string>; default_templates: Record<string, string>;
  google: { configured: boolean; connected: boolean; account: string | null; calendar_id: string | null; drive_folder_id: string | null };
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
          {!data.google.configured ? (
            <div className="callout warn" style={{ marginTop: 16 }}>Le credenziali Google non sono ancora configurate sul server (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY, APP_URL). Segui la guida nel README.</div>
          ) : data.google.connected ? (
            <div className="stack" style={{ marginTop: 16 }}>
              <div className="row wrap"><span className="pill green">Collegato</span><span className="muted">{data.google.account}</span></div>
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
              <p className="muted" style={{ margin: 0 }}>Collega il tuo account Google: l'app creerà un calendario dedicato “{data.calendar_name}” e una cartella per i backup.
                Per sicurezza chiede solo i permessi minimi: può vedere <b>solo</b> il calendario e i file che crea lei, non il resto del tuo Google.</p>
              <div><a className="btn btn-accent btn-lg" href="/api/google/connect"><Cloud /> Collega Google</a></div>
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
              <select className="select" value={String(form.backup_auto)} onChange={(e) => set('backup_auto', e.target.value === 'true')}><option value="true">Attivo (ogni notte alle 3:30)</option><option value="false">Disattivo</option></select></label>
            <label className="field"><span>Backup da conservare</span><input className="input" type="number" min={7} max={365} value={form.backup_retention} onChange={(e) => set('backup_retention', Number(e.target.value))} /></label>
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
      {disc && <Confirm title="Scollega Google" danger confirmLabel="Scollega" text="Il token verrà revocato. Il calendario e i backup già presenti su Google resteranno, ma l'app smetterà di aggiornarli."
        onConfirm={() => act(() => api.post('/google/disconnect'), 'Google scollegato')} onClose={() => setDisc(false)} />}
    </>
  );
}
