import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cake, CalendarPlus, Check, ChevronLeft, ChevronRight, Cloud, CloudOff, ExternalLink, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { useOpen } from '../components/Layout';
import { SessionForm } from '../components/Forms';
import { Confirm, ErrorBox, Modal, useAction, useApi } from '../components/ui';
import { api, type Birthday, type GoogleEvent, type Session } from '../lib/api';
import { addDays, KIND_LABEL, longDay, nowRomeLocal, time, todayRome, waNumber } from '../lib/format';
import {
  addMinutesToLocal, hourLabel, minutesOf, romeGmtLabel, monthGrid, placeEvents, rangeTitle, segmentInDay, weekDays, WEEK_START, type Placed,
} from '../lib/calendar';

const HOUR_H = 52; // altezza di un'ora nella vista a settimana (px)
const DOW = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
const DOW_MINI = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const LAYERS = [
  { key: 'lessons', label: 'Lezioni', color: '#4a96d6' },
  { key: 'google', label: 'Impegni Google', color: '#d9533a' },
  { key: 'birthdays', label: 'Compleanni', color: '#33b679' },
] as const;
type LayerKey = (typeof LAYERS)[number]['key'];
type View = 'week' | 'month';

function stored<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function useStored<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => stored(key, fallback));
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignora */ } }, [key, v]);
  return [v, setV] as const;
}

type Item =
  | { t: 'session'; s: Session }
  | { t: 'google'; e: GoogleEvent }
  | { t: 'birthday'; b: Birthday };

const shiftMonth = (date: string, n: number) => {
  const d = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 + n, 1, 12));
  return d.toISOString().slice(0, 10);
};

export default function Calendar() {
  const today = todayRome();
  const [view, setView] = useStored<View>('cal_view', 'week');
  const [layers, setLayers] = useStored<Record<LayerKey, boolean>>('cal_layers', { lessons: true, google: true, birthdays: true });
  const [anchor, setAnchor] = useState(today);
  const [miniMonth, setMiniMonth] = useState(today.slice(0, 7) + '-01');
  const [detail, setDetail] = useState<Item | null>(null);
  const [edit, setEdit] = useState<Session | null>(null);
  const [del, setDel] = useState<Session | null>(null);
  const open = useOpen();
  const act = useAction();

  const week = useMemo(() => weekDays(anchor), [anchor]);
  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const shown = view === 'week' ? week : grid.flat();
  const from = shown[0], to = shown[shown.length - 1];

  const { data, error } = useApi<{ sessions: Session[]; events?: GoogleEvent[]; birthdays?: Birthday[]; google: { connected: boolean; reads?: boolean } }>(`/sessions?from=${from}&to=${to}`);

  // la griglia a settimana parte dalle 7:00 (o da poco prima dell'ora attuale)
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== 'week' || !scroller.current) return;
    const nowMin = minutesOf(nowRomeLocal());
    scroller.current.scrollTop = Math.max(0, ((week.includes(today) ? Math.min(nowMin - 120, 7 * 60) : 7 * 60) / 60) * HOUR_H - 4);
  }, [view, week, today]);
  const [now, setNow] = useState(nowRomeLocal());
  useEffect(() => { const i = setInterval(() => setNow(nowRomeLocal()), 60_000); return () => clearInterval(i); }, []);

  if (error) return <ErrorBox error={error} />;

  const sessions = layers.lessons ? data?.sessions ?? [] : [];
  const gevents = layers.google ? data?.events ?? [] : [];
  const birthdays = layers.birthdays ? data?.birthdays ?? [] : [];

  const go = (n: number) => {
    const next = view === 'week' ? addDays(anchor, 7 * n) : shiftMonth(anchor, n);
    setAnchor(next); setMiniMonth(next.slice(0, 7) + '-01');
  };
  const goTo = (d: string) => { setAnchor(d); setMiniMonth(d.slice(0, 7) + '-01'); };
  const title = view === 'week' ? rangeTitle(week) : rangeTitle([`${anchor.slice(0, 7)}-01`]);

  // ───── voci per giorno ─────
  const allDay = (d: string) => [
    ...birthdays.filter((b) => b.date === d).map((b): Item => ({ t: 'birthday', b })),
    ...gevents.filter((e) => e.all_day && d >= e.starts_at.slice(0, 10) && d < (e.ends_at.slice(0, 10) > e.starts_at.slice(0, 10) ? e.ends_at.slice(0, 10) : addDays(e.starts_at.slice(0, 10), 1))).map((e): Item => ({ t: 'google', e })),
  ];
  const timed = (d: string): Placed<Item>[] => {
    const list: { item: Item; start: number; end: number }[] = [];
    for (const s of sessions) {
      const seg = segmentInDay(d, s.starts_at, addMinutesToLocal(s.starts_at, s.duration_min));
      if (seg) list.push({ item: { t: 'session', s }, ...seg });
    }
    for (const e of gevents) {
      if (e.all_day) continue;
      const seg = segmentInDay(d, e.starts_at, e.ends_at);
      if (seg) list.push({ item: { t: 'google', e }, ...seg });
    }
    return placeEvents(list);
  };

  const label = (it: Item) => it.t === 'session' ? `${it.s.person || KIND_LABEL[it.s.kind]}` : it.t === 'google' ? it.e.summary || '(senza titolo)' : `🎂 ${it.b.name}`;
  const cls = (it: Item) => it.t === 'session' ? `lesson ${it.s.status}` : it.t === 'google' ? 'google' : 'birthday';
  const keyOf = (it: Item) => it.t === 'session' ? it.s.id : it.t === 'google' ? it.e.id : `b${it.b.client_id}${it.b.date}`;

  const newAt = (local: string) => open.session(undefined, local);

  return (
    <div className="gcal fade-in">
      <aside className="gc-side">
        <button className="gc-create" onClick={() => newAt(`${anchor}T${nowRomeLocal().slice(11, 13)}:00`)}><CalendarPlus size={20} /> Crea</button>

        <MiniMonth month={miniMonth} today={today} week={view === 'week' ? week : []} selected={anchor}
          onPrev={() => setMiniMonth(shiftMonth(miniMonth, -1))} onNext={() => setMiniMonth(shiftMonth(miniMonth, 1))} onPick={goTo} />

        <div className="gc-layers">
          <div className="gc-layers-title">I miei calendari</div>
          {LAYERS.map((l) => (
            <label key={l.key} className="gc-layer">
              <input type="checkbox" checked={layers[l.key]} onChange={(e) => setLayers({ ...layers, [l.key]: e.target.checked })} style={{ accentColor: l.color }} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </aside>

      <section className="gc-main">
        <header className="gc-bar">
          <button className="gc-btn" onClick={() => goTo(today)}>Oggi</button>
          <button className="gc-icon" onClick={() => go(-1)} aria-label={view === 'week' ? 'Settimana precedente' : 'Mese precedente'}><ChevronLeft /></button>
          <button className="gc-icon" onClick={() => go(1)} aria-label={view === 'week' ? 'Settimana successiva' : 'Mese successivo'}><ChevronRight /></button>
          <h1 className="gc-title">{title}</h1>
          <span className="grow" />
          {data && (data.google.connected
            ? <span className="gc-status ok" title="Google Calendar collegato"><Cloud size={15} /><span>Google collegato</span></span>
            : <Link to="/settings" className="gc-status warn"><CloudOff size={15} /><span>Collega Google</span></Link>)}
          <select className="gc-select" value={view} onChange={(e) => setView(e.target.value as View)} aria-label="Vista del calendario">
            <option value="week">Settimana</option>
            <option value="month">Mese</option>
          </select>
        </header>

        {view === 'week' ? (
          <div className="gc-week">
            <div className="gc-head" style={{ '--cols': 7 } as React.CSSProperties}>
              <div className="gc-gutter gc-tz">{romeGmtLabel()}</div>
              {week.map((d, i) => (
                <button key={d} className={`gc-dayhead ${d === today ? 'today' : ''}`} onClick={() => { goTo(d); setView('week'); }}>
                  <span className="dow">{DOW[(i + WEEK_START) % 7]}</span>
                  <span className="num">{Number(d.slice(8))}</span>
                </button>
              ))}
            </div>
            {week.some((d) => allDay(d).length > 0) && (
              <div className="gc-allday" style={{ '--cols': 7 } as React.CSSProperties}>
                <div className="gc-gutter" />
                {week.map((d) => (
                  <div key={d} className="gc-allday-cell">
                    {allDay(d).map((it) => <button key={keyOf(it)} className={`gc-chip ${cls(it)}`} onClick={() => setDetail(it)} title={label(it)}>{label(it)}</button>)}
                  </div>
                ))}
              </div>
            )}
            <div className="gc-scroll" ref={scroller}>
              <div className="gc-grid" style={{ '--cols': 7, '--hh': `${HOUR_H}px` } as React.CSSProperties}>
                <div className="gc-gutter gc-hours">
                  {Array.from({ length: 24 }, (_, h) => <div key={h} className="gc-hour" style={{ top: h * HOUR_H }}>{h === 0 ? '' : hourLabel(h)}</div>)}
                </div>
                {week.map((d) => (
                  <div key={d} className={`gc-col ${d === today ? 'today' : ''}`}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                      const m = Math.min(23 * 60 + 30, Math.floor((y / HOUR_H) * 2) * 30);
                      newAt(`${d}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
                    }}>
                    {Array.from({ length: 24 }, (_, h) => <div key={h} className="gc-line" style={{ top: h * HOUR_H }} />)}
                    {timed(d).map((p) => {
                      const h = Math.max(((p.end - p.start) / 60) * HOUR_H - 2, 22);
                      return (
                        <button key={keyOf(p.item) + p.start} className={`gc-ev ${cls(p.item)}`}
                          style={{ top: (p.start / 60) * HOUR_H + 1, height: h, left: `calc(${(p.lane / p.lanes) * 100}% + 1px)`, width: `calc(${100 / p.lanes}% - ${p.lanes > 1 ? 3 : 14}px)` }}
                          onClick={() => setDetail(p.item)} title={label(p.item)}>
                          <span className="t">{label(p.item)}</span>
                          {h >= 38 && <span className="s">{`${String(Math.floor(p.start / 60)).padStart(2, '0')}:${String(p.start % 60).padStart(2, '0')} – ${p.end >= 1440 ? '24:00' : `${String(Math.floor(p.end / 60)).padStart(2, '0')}:${String(p.end % 60).padStart(2, '0')}`}`}</span>}
                        </button>
                      );
                    })}
                    {d === today && <div className="gc-now" style={{ top: (minutesOf(now) / 60) * HOUR_H }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="gc-month">
            <div className="gc-mhead">{Array.from({ length: 7 }, (_, i) => <div key={i}>{DOW[(i + WEEK_START) % 7]}</div>)}</div>
            <div className="gc-mgrid" style={{ gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))` }}>
              {grid.flat().map((d) => {
                const items: Item[] = [
                  ...allDay(d),
                  ...timed(d).sort((a, b) => a.start - b.start).map((p) => p.item),
                ];
                return (
                  <div key={d} className={`gc-cell ${d.slice(0, 7) !== anchor.slice(0, 7) ? 'out' : ''} ${d === today ? 'today' : ''}`}
                    onClick={(e) => { if (e.target === e.currentTarget) newAt(`${d}T18:00`); }}>
                    <button className="num" onClick={() => { setAnchor(d); setView('week'); setMiniMonth(d.slice(0, 7) + '-01'); }} title="Apri la settimana">{Number(d.slice(8)) === 1 ? `${Number(d.slice(8))} ${['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'][Number(d.slice(5, 7)) - 1]}` : Number(d.slice(8))}</button>
                    {items.slice(0, 4).map((it) => (
                      <button key={keyOf(it)} className={`gc-chip ${cls(it)}`} onClick={() => setDetail(it)} title={label(it)}>
                        {it.t === 'session' && <b>{time(it.s.starts_at)}</b>}{it.t === 'google' && !it.e.all_day && <b>{time(it.e.starts_at)}</b>} {label(it)}
                      </button>
                    ))}
                    {items.length > 4 && <button className="gc-more" onClick={() => { setAnchor(d); setView('week'); setMiniMonth(d.slice(0, 7) + '-01'); }}>altri {items.length - 4}</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {detail && <Detail item={detail} now={now} onClose={() => setDetail(null)} onEdit={(s) => { setDetail(null); setEdit(s); }} onDelete={(s) => { setDetail(null); setDel(s); }} act={act} />}
      {edit && <SessionForm session={edit} onClose={() => setEdit(null)} />}
      {del && <Confirm title="Elimina appuntamento" danger confirmLabel="Elimina" text="L'appuntamento verrà rimosso anche da Google Calendar."
        onConfirm={() => act(() => api.del(`/sessions/${del.id}`), 'Appuntamento eliminato')} onClose={() => setDel(null)} />}
    </div>
  );
}

function MiniMonth({ month, today, week, selected, onPrev, onNext, onPick }: {
  month: string; today: string; week: string[]; selected: string; onPrev: () => void; onNext: () => void; onPick: (d: string) => void;
}) {
  const weeks = monthGrid(month);
  const [y, m] = month.split('-').map(Number);
  const names = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return (
    <div className="gc-mini">
      <div className="gc-mini-head">
        <span>{names[m - 1]} {y}</span>
        <span className="row" style={{ gap: 2 }}>
          <button className="gc-icon sm" onClick={onPrev} aria-label="Mese precedente"><ChevronLeft /></button>
          <button className="gc-icon sm" onClick={onNext} aria-label="Mese successivo"><ChevronRight /></button>
        </span>
      </div>
      <div className="gc-mini-grid">
        {DOW_MINI.map((_, i) => <span key={i} className="dow">{DOW_MINI[(i + WEEK_START) % 7]}</span>)}
        {weeks.flat().map((d) => (
          <button key={d} className={`d ${d.slice(0, 7) !== month.slice(0, 7) ? 'out' : ''} ${d === today ? 'today' : ''} ${week.includes(d) ? 'inweek' : ''} ${d === selected && !week.length ? 'sel' : ''}`}
            onClick={() => onPick(d)}>{Number(d.slice(8))}</button>
        ))}
      </div>
    </div>
  );
}

function Detail({ item, now, onClose, onEdit, onDelete, act }: {
  item: Item; now: string; onClose: () => void; onEdit: (s: Session) => void; onDelete: (s: Session) => void; act: ReturnType<typeof useAction>;
}) {
  if (item.t === 'birthday') {
    const b = item.b;
    return (
      <Modal title="Compleanno" onClose={onClose}>
        <div className="stack">
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <span className="row-icon green"><Cake /></span>
            <div><div style={{ fontSize: 18 }}>{b.name}</div><div className="muted">{longDay(b.date)} · compie {b.age} anni</div></div>
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            {b.phone && <a className="btn" target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(`Tanti auguri ${b.name.split(' ')[0]}! 🎂🎉`)}`}><MessageCircle /> Auguri su WhatsApp</a>}
            <Link className="btn" to={`/clients/${b.client_id}`} onClick={onClose}>Apri scheda cliente</Link>
          </div>
        </div>
      </Modal>
    );
  }
  if (item.t === 'google') {
    const e = item.e;
    return (
      <Modal title={e.summary || 'Impegno Google'} onClose={onClose}>
        <div className="stack">
          <div className="muted">{e.all_day ? `Tutto il giorno · ${longDay(e.starts_at)}` : `${longDay(e.starts_at)} · ${time(e.starts_at)}–${time(e.ends_at)}`}{e.location ? ` · ${e.location}` : ''}</div>
          <div className="muted" style={{ fontSize: 13.5 }}>Dal tuo Google Calendar (sola lettura): per modificarlo aprilo lì.</div>
          {e.html_link && <div className="row" style={{ justifyContent: 'flex-end' }}><a className="btn" href={e.html_link} target="_blank" rel="noopener noreferrer"><ExternalLink /> Apri in Google Calendar</a></div>}
        </div>
      </Modal>
    );
  }
  const s = item.s;
  return (
    <Modal title={`${KIND_LABEL[s.kind]} · ${s.person ?? ''}`} onClose={onClose}>
      <div className="stack">
        <div className="muted">{longDay(s.starts_at)} · {time(s.starts_at)} · {s.duration_min} min · {s.mode === 'online' ? 'Online' : 'Live'} · {s.status}</div>
        {s.location && <div className="muted">{s.location}</div>}
        {s.notes && <div>{s.notes}</div>}
        {s.gcal_status === 'error' && <div className="amber" style={{ fontSize: 13 }} title={s.gcal_error ?? ''}>⚠ Sincronizzazione Google non riuscita</div>}
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {s.status === 'programmata' && s.starts_at < now && <>
            <button className="btn" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'saltata' })).then(onClose)}><X /> Saltata</button>
            <button className="btn btn-primary" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'svolta' })).then(onClose)}><Check /> Svolta</button>
          </>}
          {s.status === 'programmata' && s.starts_at >= now && <button className="btn" onClick={() => act(() => api.patch(`/sessions/${s.id}`, { status: 'annullata' }), 'Appuntamento annullato').then(onClose)}>Annulla appuntamento</button>}
          <button className="icon-btn" aria-label="Modifica" onClick={() => onEdit(s)}><Pencil /></button>
          <button className="icon-btn" aria-label="Elimina" onClick={() => onDelete(s)}><Trash2 /></button>
        </div>
      </div>
    </Modal>
  );
}
