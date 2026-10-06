import { useState } from 'react';
import { CalendarCheck, Copy, Link2, RefreshCw, Trash2 } from 'lucide-react';
import { useAction, useToast } from './ui';
import { api } from '../lib/api';

export type IcalSettings = { feed_url: string | null; import_set: boolean; import_hint: string | null; last_pull: string | null; error: string | null };

const when = (iso: string) => new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' });

/** Collegamento a Google Calendar con i link iCal: nessuna Google Cloud Console, solo copia e incolla */
export function IcalCard({ ical }: { ical: IcalSettings }) {
  const [url, setUrl] = useState('');
  const act = useAction();
  const toast = useToast();
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('Link copiato'); } catch { toast('Copia non riuscita: seleziona il link e copialo a mano', true); } };

  return (
    <div className="card pad">
      <div className="label">Google Calendar</div>
      <p className="muted" style={{ margin: '12px 0 0' }}>Collegamento con due link da copiare e incollare, senza configurazioni su Google Cloud.</p>

      <div className="stack" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 16 }}><b>1. I tuoi eventi Google nell'app</b></div>
        {ical.import_set ? (
          <>
            <div className="row wrap"><span className="pill green">Collegato</span><span className="muted truncate" style={{ maxWidth: '100%' }}>{ical.import_hint}</span></div>
            <p className="muted" style={{ margin: 0 }}>
              <CalendarCheck size={15} style={{ verticalAlign: -2 }} /> Gli eventi del tuo Google Calendar compaiono nell'agenda e si aggiornano ogni 15 minuti.
              {ical.last_pull && <> Ultima lettura: {when(ical.last_pull)}.</>}
            </p>
            {ical.error && <div className="callout warn">Ultima lettura non riuscita: {ical.error}</div>}
            <div className="row wrap">
              <button className="btn" onClick={() => act(() => api.post<{ events: number }>('/ical/refresh'), 'Calendario aggiornato')}><RefreshCw /> Aggiorna ora</button>
              <button className="btn btn-danger" onClick={() => act(() => api.del('/ical/import'), 'Collegamento rimosso')}><Trash2 /> Rimuovi</button>
            </div>
          </>
        ) : (
          <>
            <ol className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Apri <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer">Google Calendar dal computer → Impostazioni</a>, con l'account del calendario.</li>
              <li>A sinistra, sotto “Impostazioni dei miei calendari”, clicca il tuo calendario.</li>
              <li>Scorri fino a <b>“Indirizzo segreto in formato iCal”</b>, mostralo e copialo.</li>
              <li>Incollalo qui sotto.</li>
            </ol>
            <div className="row wrap" style={{ gap: 10 }}>
              <input className="input" style={{ flex: '1 1 260px' }} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button className="btn btn-accent" disabled={url.trim().length < 10}
                onClick={() => act(async () => { const r = await api.put<{ events: number }>('/ical/import', { url }); setUrl(''); return r; }, 'Google Calendar collegato')}><Link2 /> Collega</button>
            </div>
            <p className="dim" style={{ margin: 0, fontSize: 13 }}>Il link è segreto: chi lo ha può vedere i tuoi eventi. Resta salvato solo nell'app e non finisce nei backup.</p>
          </>
        )}
      </div>

      <div className="stack" style={{ marginTop: 26 }}>
        <div style={{ fontSize: 16 }}><b>2. Le lezioni dell'app in Google Calendar</b></div>
        {ical.feed_url ? (
          <>
            <div className="row wrap" style={{ gap: 10 }}>
              <input className="input" style={{ flex: '1 1 260px' }} readOnly value={ical.feed_url} onFocus={(e) => e.currentTarget.select()} />
              <button className="btn" onClick={() => copy(ical.feed_url!)}><Copy /> Copia</button>
            </div>
            <ol className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Apri <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Google Calendar → Altri calendari → Da URL</a>.</li>
              <li>Incolla il link e premi <b>Aggiungi calendario</b>.</li>
            </ol>
            <p className="dim" style={{ margin: 0, fontSize: 13 }}>Google aggiorna questo calendario con i suoi tempi (di solito qualche ora): lezioni nuove o spostate possono comparire con un po' di ritardo.</p>
            <div className="row wrap">
              <button className="btn" onClick={() => act(() => api.post('/ical/feed', { rotate: true }), 'Nuovo link creato: aggiornalo su Google')}><RefreshCw /> Rigenera link</button>
              <button className="btn btn-danger" onClick={() => act(() => api.del('/ical/feed'), 'Link disattivato')}><Trash2 /> Disattiva</button>
            </div>
          </>
        ) : (
          <div><button className="btn btn-accent" onClick={() => act(() => api.post('/ical/feed', {}), 'Link creato')}><Link2 /> Crea il link per Google Calendar</button></div>
        )}
      </div>
    </div>
  );
}
