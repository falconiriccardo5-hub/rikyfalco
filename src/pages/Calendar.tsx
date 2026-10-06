import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Check, ChevronLeft, ChevronRight, CloudOff, Cloud, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import { useOpen } from '../components/Layout';
import { SessionForm } from '../components/Forms';
import { Confirm, Empty, ErrorBox, PageHead, useAction, useApi } from '../components/ui';
import { api, type GoogleEvent, type Session } from '../lib/api';
import { addDays, KIND_LABEL, longDay, monthName, nowRomeLocal, time, todayRome } from '../lib/format';

const DOW = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

export default function Calendar() {
  const today = todayRome();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [edit, setEdit] = useState<Session | null>(null);
  const [del, setDel] = useState<Session | null>(null);
  const open = useOpen();
  const act = useAction();

  const { days, from, to } = useMemo(() => {
    const first = `${month}-01`;
    const dow = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const start = addDays(first, -dow);
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return { days, from: days[0], to: days[41] };
  }, [month]);

  const { data, error } = useApi<{ sessions: Session[]; events?: GoogleEvent[]; google: { connected: boolean; reads?: boolean } }>(`/sessions?from=${from}&to=${to}`);
  if (error) return <ErrorBox error={error} />;
  const byDay = new Map<string, Session[]>();
  data?.sessions.forEach((s) => { const k = s.starts_at.slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), s]); });
  // impegni Google: compaiono in ogni giorno che toccano (anche quelli di più giorni)
  const gByDay = new Map<string, GoogleEvent[]>();
  data?.events?.forEach((e) => {
    const last = e.ends_at.slice(11) === '00:00' && e.ends_at > e.starts_at ? addDays(e.ends_at.slice(0, 10), -1) : e.ends_at.slice(0, 10);
    for (let d = e.starts_at.slice(0, 10), i = 0; d <= last && i < 42; d = addDays(d, 1), i++) gByDay.set(d, [...(gByDay.get(d) ?? []), e]);
  });
  const daySessions = byDay.get(sel) ?? [];
  const dayEvents = gByDay.get(sel) ?? [];
  const now = nowRomeLocal();
  const [y, m] = month.split('-').map(Number);
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };

  return (
    <>
      <PageHead label="AGENDA" title={<span style={{ textTransform: 'capitalize' }}>{monthName(m - 1)} {y}</span>}>
        {data && (data.google.connected
          ? <span className="pill green plain" title={data.google.reads
              ? 'Sincronizzazione nei due sensi: le lezioni vanno nel calendario Google “RF Coaching” e i tuoi impegni Google compaiono qui'
              : 'Gli appuntamenti vengono copiati nel calendario Google “RF Coaching”. Ricollega Google dalle Impostazioni per vedere qui anche i tuoi impegni'}><Cloud size={14} /> Google Calendar collegato</span>
          : <Link to="/settings" className="pill amber plain"><CloudOff size={14} /> Collega Google Calendar</Link>)}
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mese precedente"><ChevronLeft /></button>
        <button className="btn" onClick={() => { setMonth(today.slice(0, 7)); setSel(today); }}>Oggi</button>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Mese successivo"><ChevronRight /></button>
        <button className="btn btn-primary" onClick={() => open.session(undefined, sel)}><CalendarPlus /> Nuovo</button>
      </PageHead>

      <div className="cal-layout fade-in">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
            {days.map((d) => {
              const evs = byDay.get(d) ?? [];
              const gevs = gByDay.get(d) ?? [];
              const shown = Math.max(0, 3 - evs.length);
              const more = evs.length + gevs.length - Math.min(3, evs.length) - Math.min(shown, gevs.length);
              return (
                <div key={d} className={`day ${d.slice(0, 7) !== month ? 'out' : ''} ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`}
                  onClick={() => setSel(d)} onDoubleClick={() => open.session(undefined, d)}>
                  <span className="num">{Number(d.slice(8))}</span>
                  {evs.slice(0, 3).map((s) => <div key={s.id} className={`ev ${s.kind} ${s.status}`}>{time(s.starts_at)} {s.person}</div>)}
                  {gevs.slice(0, shown).map((e) => <div key={e.id} className="ev google" title={e.summary}>{e.all_day ? '' : `${time(e.starts_at)} `}{e.summary}</div>)}
                  {more > 0 && <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>+{more}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card pad">
          <div className="label">{longDay(sel).toUpperCase()}</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {daySessions.length === 0 && dayEvents.length === 0 && <Empty>Nessun appuntamento.</Empty>}
            {dayEvents.map((e) => (
              <div key={e.id} className="mini gevent">
                <div className="spread">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16 }} className="truncate">{e.all_day ? 'Tutto il giorno' : `${time(e.starts_at)}–${time(e.ends_at)}`} · {e.summary}</div>
                    <div className="muted" style={{ fontSize: 13.5 }}>Google Calendar{e.location ? ` · ${e.location}` : ''}</div>
                  </div>
                  {e.html_link && <a className="icon-btn sm" href={e.html_link} target="_blank" rel="noopener noreferrer" aria-label="Apri in Google Calendar" title="Apri in Google Calendar"><ExternalLink /></a>}
                </div>
              </div>
            ))}
            {daySessions.map((s) => (
              <div key={s.id} className="mini" style={{ opacity: s.status === 'annullata' ? 0.5 : 1 }}>
                <div className="spread">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16 }} className="truncate">{time(s.starts_at)} · {s.person}</div>
                    <div className="muted" style={{ fontSize: 13.5 }}>{KIND_LABEL[s.kind]} · {s.mode === 'online' ? 'Online' : 'Live'} · {s.duration_min} min · {s.status}</div>
                    {s.gcal_status === 'error' && <div className="amber" style={{ fontSize: 12.5 }} title={s.gcal_error ?? ''}>⚠ Sincronizzazione Google non riuscita</div>}
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  {s.status === 'programmata' && s.starts_at < now && <>
                    <button className="icon-btn sm" aria-label="Saltata" title="Saltata" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'saltata' }))}><X /></button>
                    <button className="icon-btn sm green" aria-label="Svolta" title="Svolta" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'svolta' }))}><Check /></button>
                  </>}
                  {s.status === 'programmata' && s.starts_at >= now && <button className="btn btn-sm" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'annullata' }), 'Appuntamento annullato')}>Annulla</button>}
                  <button className="icon-btn sm" aria-label="Modifica" onClick={() => setEdit(s)}><Pencil /></button>
                  <button className="icon-btn sm" aria-label="Elimina" onClick={() => setDel(s)}><Trash2 /></button>
                </div>
              </div>
            ))}
            <button className="btn btn-block" onClick={() => open.session(undefined, sel)}><CalendarPlus /> Aggiungi in questo giorno</button>
          </div>
        </div>
      </div>
      {edit && <SessionForm session={edit} onClose={() => setEdit(null)} />}
      {del && <Confirm title="Elimina appuntamento" danger confirmLabel="Elimina" text="L'appuntamento verrà rimosso anche da Google Calendar."
        onConfirm={() => act(() => api.del(`/sessions/${del.id}`), 'Appuntamento eliminato')} onClose={() => setDel(null)} />}
    </>
  );
}
