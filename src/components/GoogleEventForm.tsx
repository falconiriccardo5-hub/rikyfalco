import { useState } from 'react';
import { api, type GoogleEvent } from '../lib/api';
import { addDays } from '../lib/format';
import { addMinutesToLocal } from '../lib/calendar';
import { Modal, useAction } from './ui';

/** Crea o modifica un impegno di Google Calendar: la modifica va subito su Google, senza aprirlo. */
export function GoogleEventForm({ event, start, onClose }: { event?: GoogleEvent; start?: string; onClose: () => void }) {
  const allDayEv = !!event?.all_day;
  const initStart = event?.starts_at ?? start ?? '';
  // Google vuole la data di fine esclusiva per le giornate intere: nel modulo si mostra l'ultimo giorno incluso
  const initEnd = event
    ? allDayEv ? `${event.ends_at.slice(0, 10) > event.starts_at.slice(0, 10) ? addDays(event.ends_at.slice(0, 10), -1) : event.starts_at.slice(0, 10)}T00:00` : event.ends_at
    : addMinutesToLocal(initStart, 60);
  const [v, setV] = useState({ summary: event?.summary === '(senza titolo)' ? '' : event?.summary ?? '', location: event?.location ?? '', all_day: allDayEv, start: initStart, end: initEnd });
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const editing = !!event;
  const date = (s: string) => s.slice(0, 10);

  const setStart = (s: string) => setV((p) => {
    // come in Google: spostando l'inizio, la fine si sposta con lui e la durata resta la stessa
    const mins = (Date.parse(p.end + ':00Z') - Date.parse(p.start + ':00Z')) / 60000;
    return { ...p, start: s, end: p.all_day ? (date(p.end) < date(s) ? s : p.end) : addMinutesToLocal(s, mins > 0 ? mins : 60) };
  });
  const toggleAllDay = (on: boolean) => setV((p) => ({
    ...p, all_day: on,
    start: on ? `${date(p.start)}T00:00` : `${date(p.start)}T18:00`,
    end: on ? `${date(p.end)}T00:00` : `${date(p.start)}T19:00`,
  }));

  return (
    <Modal title={editing ? 'Modifica evento Google' : 'Nuovo evento Google'} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await act(() => editing ? api.patch(`/google/events/${encodeURIComponent(event!.id)}`, v) : api.post('/google/events', v),
          editing ? 'Evento aggiornato su Google Calendar' : 'Evento creato su Google Calendar');
        setBusy(false); if (r) onClose();
      }}>
        <label className="field"><span>Titolo</span><input className="input" autoFocus maxLength={300} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></label>
        <label className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={v.all_day} onChange={(e) => toggleAllDay(e.target.checked)} /> <span>Tutto il giorno</span>
        </label>
        <div className="grid-2">
          <label className="field"><span>{v.all_day ? 'Dal' : 'Inizio'}</span>
            {v.all_day
              ? <input className="input" type="date" required value={date(v.start)} onChange={(e) => e.target.value && setStart(`${e.target.value}T00:00`)} />
              : <input className="input" type="datetime-local" required value={v.start} onChange={(e) => e.target.value && setStart(e.target.value.slice(0, 16))} />}</label>
          <label className="field"><span>{v.all_day ? 'Al' : 'Fine'}</span>
            {v.all_day
              ? <input className="input" type="date" required min={date(v.start)} value={date(v.end)} onChange={(e) => e.target.value && setV({ ...v, end: `${e.target.value}T00:00` })} />
              : <input className="input" type="datetime-local" required min={v.start} value={v.end} onChange={(e) => e.target.value && setV({ ...v, end: e.target.value.slice(0, 16) })} />}</label>
        </div>
        <label className="field"><span>Luogo</span><input className="input" maxLength={300} value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} /></label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : editing ? 'Salva' : 'Crea'}</button>
        </div>
      </form>
    </Modal>
  );
}
