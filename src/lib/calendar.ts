// Calcoli per la vista a settimana/mese del calendario (niente React: si testano da soli).
import { addDays } from './format';

/** Primo giorno della settimana: 0 = domenica (come nel Google Calendar di Riccardo), 1 = lunedì. */
export const WEEK_START = 0;

export const dowOf = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay();

/** Primo giorno della settimana che contiene `date`. */
export function weekStartOf(date: string, first = WEEK_START) {
  return addDays(date, -((dowOf(date) - first + 7) % 7));
}

export const weekDays = (date: string, first = WEEK_START) => {
  const s = weekStartOf(date, first);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

/** 6 settimane che coprono il mese di `date` (griglia del mese). */
export function monthGrid(date: string, first = WEEK_START) {
  const s = weekStartOf(`${date.slice(0, 7)}-01`, first);
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(s, w * 7 + i)));
  // se l'ultima settimana è tutta nel mese dopo, non mostrarla
  return weeks[5][0].slice(0, 7) !== date.slice(0, 7) ? weeks.slice(0, 5) : weeks;
}

export const minutesOf = (local: string) => Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));

export function addMinutesToLocal(local: string, minutes: number) {
  const d = new Date(local.slice(0, 16) + ':00Z');
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

export interface Segment { start: number; end: number } // minuti dall'inizio del giorno (0–1440)

/** La parte di un evento [startsAt, endsAt) che cade nel giorno `day`, in minuti; null se non lo tocca. */
export function segmentInDay(day: string, startsAt: string, endsAt: string): Segment | null {
  const dayStart = `${day}T00:00`;
  const dayEnd = `${addDays(day, 1)}T00:00`;
  const s = startsAt > dayStart ? startsAt : dayStart;
  const e = endsAt < dayEnd ? endsAt : dayEnd;
  if (e <= s && !(startsAt === endsAt && startsAt >= dayStart && startsAt < dayEnd)) return null;
  const start = s === dayStart ? 0 : minutesOf(s);
  const end = e === dayEnd ? 1440 : minutesOf(e);
  return { start, end };
}

export interface Placed<T> { item: T; start: number; end: number; lane: number; lanes: number }

/** Affianca gli eventi che si sovrappongono (come fa Google Calendar). `min` = durata minima visibile in minuti. */
export function placeEvents<T>(items: { item: T; start: number; end: number }[], min = 30): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    cluster.forEach((p) => { p.lanes = lanes; });
    out.push(...cluster);
    cluster = [];
  };
  for (const it of sorted) {
    const end = Math.max(it.end, it.start + min);
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -1; }
    // prima corsia libera
    let lane = 0;
    while (cluster.some((p) => p.lane === lane && Math.max(p.end, p.start + min) > it.start)) lane++;
    cluster.push({ item: it.item, start: it.start, end: it.end, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length) flush();
  return out;
}

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Titolo come in Google Calendar: "Ottobre 2026" oppure "Ott – nov 2026" se la settimana è a cavallo di due mesi. */
export function rangeTitle(days: string[]) {
  const a = days[0], b = days[days.length - 1];
  const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number);
  if (ya === yb && ma === mb) return `${cap(MONTHS[ma - 1])} ${ya}`;
  const short = (m: number) => MONTHS[m - 1].slice(0, 3);
  return ya === yb ? `${cap(short(ma))} – ${short(mb)} ${ya}` : `${cap(short(ma))} ${ya} – ${short(mb)} ${yb}`;
}

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** "GMT+2" / "GMT+1": fuso orario di Roma in questo momento (cambia con l'ora legale). */
export function romeGmtLabel(d = new Date()) {
  const part = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Rome', timeZoneName: 'shortOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName')?.value ?? 'GMT+1';
  return part.replace(/^GMT([+-])(\d)$/, 'GMT$1$2').replace(/^GMT$/, 'GMT+0');
}
