// Collegamento a Google Calendar senza Google Cloud Console, tramite link iCal:
//  - Google → app: l'"indirizzo segreto in formato iCal" del calendario viene letto ogni 15 minuti
//    e i suoi eventi compaiono nell'agenda (copia di sola lettura in gcal_events, calendar = 'ical').
//  - app → Google: l'app pubblica un link iCal segreto con lezioni e consulenze; in Google Calendar
//    si aggiunge con "Altri calendari → Da URL". Google lo aggiorna con i suoi tempi (alcune ore).
import ICAL from 'ical.js';
import type { Env } from './types';
import { all, getSetting, run, setSetting } from './db';
import { randomToken } from './crypto';
import { addDays, addMinutesLocal, isoNow, romeNow } from './time';

const BACK_DAYS = 30;
const AHEAD_DAYS = 120;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ROWS = 3000;

export interface IcalRow { id: string; summary: string; location: string; starts_at: string; ends_at: string; all_day: boolean; html_link: string }

const pad = (n: number) => String(n).padStart(2, '0');

// Ora legale europea: dall'ultima domenica di marzo all'ultima di ottobre, alle 01:00 UTC
const lastSundayUtc = (y: number, m: number) => { const d = new Date(Date.UTC(y, m + 1, 0, 1)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime(); };
const dstCache = new Map<number, [number, number]>();
function romeOffsetMin(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  let r = dstCache.get(y);
  if (!r) { r = [lastSundayUtc(y, 2), lastSundayUtc(y, 9)]; dstCache.set(y, r); }
  return ms >= r[0] && ms < r[1] ? 120 : 60;
}

/** Istante → ora di Roma 'YYYY-MM-DDTHH:MM' (veloce: niente Intl, conta per i calendari grandi) */
export function romeLocalFast(ms: number): string {
  return new Date(ms + romeOffsetMin(ms) * 60_000).toISOString().slice(0, 16);
}

/** Fuso dichiarato con TZID ma senza VTIMEZONE nel file: calcola l'istante con Intl */
function unixOf(t: ICAL.Time): number {
  const tzid = (t as ICAL.Time & { timezone?: string }).timezone;
  if (t.zone?.tzid !== 'floating' || !tzid) return t.toUnixTime();
  const wall = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tzid, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const p = Object.fromEntries(f.formatToParts(new Date(wall)).map((x) => [x.type, Number(x.value)]));
    const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - wall;
    return (wall - offset) / 1000;
  } catch { return t.toUnixTime(); }
}

function toLocal(t: ICAL.Time): string {
  if (t.isDate) return `${t.year}-${pad(t.month)}-${pad(t.day)}T00:00`;
  return romeLocalFast(unixOf(t) * 1000);
}

/**
 * Scarta prima del parsing gli eventi che non possono cadere nella finestra (Google esporta tutto lo storico):
 * il piano gratuito di Cloudflare concede pochi millisecondi di CPU per esecuzione.
 */
export function prefilterIcs(text: string, from: string): string {
  const min = addDays(from, -2).replace(/-/g, '');
  const parts = text.split(/\r?\nBEGIN:VEVENT\r?\n/);
  const kept = [parts[0]];
  const tail = parts[parts.length - 1].split(/\r?\nEND:VEVENT\r?\n?/);
  const lastEvent = parts.length > 1 ? tail[0] + '\r\nEND:VEVENT' : null;
  const footer = parts.length > 1 ? tail.slice(1).join('\r\nEND:VEVENT\r\n') : '';
  const events = parts.length > 1 ? [...parts.slice(1, -1), lastEvent!] : [];
  for (const ev of events) {
    const unfolded = ev.replace(/\r?\n[ \t]/g, '');
    const until = /\nRRULE[:;][^\n]*UNTIL=(\d{8})/.exec('\n' + unfolded)?.[1];
    if (/(^|\n)RRULE[:;]/.test(unfolded)) { if (!until || until >= min) kept.push(ev); continue; }
    const start = /(^|\n)DTSTART[^:\n]*:(\d{8})/.exec(unfolded)?.[2];
    const end = /(^|\n)DTEND[^:\n]*:(\d{8})/.exec(unfolded)?.[2];
    if (!start || start >= min || (end && end >= min)) kept.push(ev);
  }
  return kept.join('\r\nBEGIN:VEVENT\r\n') + (events.length ? '\r\n' + footer : '');
}

/**
 * Per le ricorrenze senza COUNT iniziate anni fa, sposta DTSTART in avanti di periodi interi fino a poco prima
 * della finestra: le occorrenze nella finestra restano identiche, ma non si itera su tutto lo storico.
 */
function fastForward(ev: ICAL.Event, unixFrom: number) {
  const rules = ev.component.getAllProperties('rrule');
  if (rules.length !== 1 || ev.component.hasProperty('rdate')) return;
  const r = rules[0].getFirstValue() as ICAL.Recur;
  if (r.count) return;
  const start = ev.startDate, interval = r.interval || 1;
  const gap = unixFrom - unixOf(start);
  if (gap <= 14 * 86400) return;
  const dur = ev.endDate ? ev.endDate.subtractDate(start) : null;
  const next = start.clone();
  if (r.freq === 'DAILY' || r.freq === 'WEEKLY') {
    const unit = (r.freq === 'DAILY' ? 1 : 7) * interval;
    const n = Math.floor(gap / 86400 / unit) - 1;
    if (n <= 0) return;
    next.adjust(n * unit, 0, 0, 0);
  } else if ((r.freq === 'MONTHLY' || r.freq === 'YEARLY') && start.day <= 28) {
    const unit = (r.freq === 'MONTHLY' ? 1 : 12) * interval;
    const n = Math.floor(gap / (31 * 86400) / unit) - 1;
    if (n <= 0) return;
    const m = start.month - 1 + n * unit;
    next.year = start.year + Math.floor(m / 12);
    next.month = (m % 12) + 1;
  } else return;
  ev.startDate = next;
  if (dur) { const end = next.clone(); end.addDuration(dur); ev.endDate = end; }
}

/** Espande gli eventi di un file .ics (ricorrenze ed eccezioni comprese) nella finestra [from, to) in ora di Roma */
export function parseIcs(text: string, from: string, to: string): IcalRow[] {
  const root = new ICAL.Component(ICAL.parse(prefilterIcs(text, from)));
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const v of root.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(v);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
    else masters.set(`${ex.uid}#${ex.recurrenceId}`, ex); // eccezione senza evento principale
  }

  const out: IcalRow[] = [];
  const winFrom = `${from}T00:00`, winTo = `${to}T00:00`;
  const unixFrom = Date.parse(`${from}T00:00:00Z`) / 1000 - 2 * 86400, unixTo = Date.parse(`${to}T00:00:00Z`) / 1000 + 2 * 86400;
  const push = (uid: string, item: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null) => {
    if (out.length >= MAX_ROWS) return;
    if ((item.component.getFirstPropertyValue('status') as string | null)?.toUpperCase() === 'CANCELLED') return;
    const s = toLocal(start);
    const e = end ? toLocal(end) : start.isDate ? `${addDays(s.slice(0, 10), 1)}T00:00` : s;
    if (s >= winTo || (e <= winFrom && s < winFrom)) return;
    out.push({
      id: `ical:${uid}:${s}`,
      summary: (item.summary || '(senza titolo)').slice(0, 300),
      location: (item.location || '').slice(0, 300),
      starts_at: s, ends_at: e, all_day: start.isDate, html_link: '',
    });
  };

  for (const [uid, ev] of masters) {
    if (!ev.startDate) continue;
    if (!ev.isRecurring()) { push(uid, ev, ev.startDate, ev.endDate); continue; }
    // confronto veloce in secondi Unix (margine di 2 giorni per fusi orari, eventi lunghi ed eccezioni spostate)
    fastForward(ev, unixFrom);
    const dur = ev.endDate ? unixOf(ev.endDate) - unixOf(ev.startDate) : 0;
    const simple = Object.keys(ev.exceptions).length === 0 && !ev.startDate.isDate;
    const cancelled = (ev.component.getFirstPropertyValue('status') as string | null)?.toUpperCase() === 'CANCELLED';
    const summary = (ev.summary || '(senza titolo)').slice(0, 300), location = (ev.location || '').slice(0, 300);
    const it = ev.iterator();
    for (let i = 0, next = it.next(); next && i < 50000 && out.length < MAX_ROWS; i++, next = it.next()) {
      const t = unixOf(next);
      if (t >= unixTo) break;
      if (t + dur < unixFrom) continue;
      if (simple) {
        // percorso veloce (nessuna eccezione): niente oggetti ICAL per ogni occorrenza
        if (cancelled) break;
        const st = romeLocalFast(t * 1000), en = romeLocalFast((t + dur) * 1000);
        if (st >= winTo || en <= winFrom) continue;
        out.push({ id: `ical:${uid}:${st}`, summary, location, starts_at: st, ends_at: en, all_day: false, html_link: '' });
        continue;
      }
      const d = ev.getOccurrenceDetails(next);
      push(uid, d.item, d.startDate, d.endDate);
    }
  }
  return out;
}

export async function pullIcal(env: Env): Promise<number> {
  const url = await getSetting(env.DB, 'ical_import_url');
  if (!url) return 0;
  try {
    const res = await fetch(url, { headers: { accept: 'text/calendar' }, redirect: 'follow' });
    if (!res.ok) throw new Error(res.status === 404 ? 'link iCal non valido o reimpostato da Google' : `Google ha risposto ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error('calendario troppo grande');
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('il link non è un calendario iCal');
    const today = romeNow().date;
    const rows = parseIcs(text, addDays(today, -BACK_DAYS), addDays(today, AHEAD_DAYS));
    const now = isoNow();
    const stmts: D1PreparedStatement[] = [env.DB.prepare("DELETE FROM gcal_events WHERE calendar = 'ical'")];
    for (const r of rows) {
      stmts.push(env.DB.prepare("INSERT OR REPLACE INTO gcal_events (id, calendar, summary, location, starts_at, ends_at, all_day, html_link, synced_at) VALUES (?,'ical',?,?,?,?,?,?,?)")
        .bind(r.id, r.summary, r.location, r.starts_at, r.ends_at, r.all_day ? 1 : 0, r.html_link, now));
    }
    for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
    await setSetting(env.DB, 'ical_import_at', now);
    await setSetting(env.DB, 'ical_import_error', null);
    return rows.length;
  } catch (e) {
    await setSetting(env.DB, 'ical_import_error', String((e as Error).message).slice(0, 300));
    throw e;
  }
}

/** Accetta solo l'indirizzo segreto iCal di Google Calendar (o un altro link https .ics) */
export function validImportUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim().replace(/^webcal:/i, 'https:')); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
  return u.toString();
}

// ───────────── Feed iCal dell'app (app → Google) ─────────────

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsLocal = (local: string) => `${local.replace(/[-:]/g, '')}00`;
const icsUtc = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Spezza le righe oltre 75 byte come richiesto da RFC 5545 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = '', len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const VTIMEZONE_ROME = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

const KIND_LABEL: Record<string, string> = { lezione: 'Lezione', consulenza: 'Consulenza', visita: 'Visita' };

export async function buildFeed(env: Env): Promise<string> {
  const today = romeNow().date;
  const name = (await getSetting(env.DB, 'calendar_name')) || 'RF Coaching';
  const rows = await all<{ id: string; kind: string; starts_at: string; duration_min: number; mode: string; location: string; status: string; updated_at: string; person: string }>(env.DB,
    `SELECT s.id, s.kind, s.starts_at, s.duration_min, s.mode, s.location, s.status, s.updated_at,
       TRIM(COALESCE(c.first_name || ' ' || c.last_name, l.first_name || ' ' || l.last_name, '')) AS person
     FROM sessions s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN leads l ON l.id = s.lead_id
     WHERE s.status != 'annullata' AND s.starts_at >= ? AND s.starts_at < ? ORDER BY s.starts_at`,
    addDays(today, -60), addDays(today, 400));
  const stamp = icsUtc(isoNow());
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RF Coaching//Agenda//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Europe/Rome', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    ...VTIMEZONE_ROME,
  ];
  for (const s of rows) {
    const prefix = s.status === 'svolta' ? '✓ ' : s.status === 'saltata' ? '✗ ' : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@rf-coaching`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${icsUtc(new Date(s.updated_at).toISOString())}`,
      `DTSTART;TZID=Europe/Rome:${icsLocal(s.starts_at)}`,
      `DTEND;TZID=Europe/Rome:${icsLocal(addMinutesLocal(s.starts_at, s.duration_min))}`,
      `SUMMARY:${esc(`${prefix}${KIND_LABEL[s.kind] ?? 'Appuntamento'} · ${s.person || 'Appuntamento'}`)}`,
      `LOCATION:${esc(s.location || (s.mode === 'online' ? 'Online' : ''))}`,
      `DESCRIPTION:${esc(`${s.mode === 'online' ? 'Online' : 'In presenza'} — gestito da RF Coaching`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export async function feedToken(env: Env, rotate = false): Promise<string> {
  const cur = await getSetting(env.DB, 'ical_feed_token');
  if (cur && !rotate) return cur;
  const t = randomToken(32);
  await setSetting(env.DB, 'ical_feed_token', t);
  return t;
}

/** Confronto a tempo costante del token del feed */
export async function checkFeedToken(env: Env, given: string): Promise<boolean> {
  const cur = await getSetting(env.DB, 'ical_feed_token');
  if (!cur || given.length !== cur.length) return false;
  let diff = 0;
  for (let i = 0; i < cur.length; i++) diff |= cur.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function clearImport(env: Env) {
  await setSetting(env.DB, 'ical_import_url', null);
  await setSetting(env.DB, 'ical_import_at', null);
  await setSetting(env.DB, 'ical_import_error', null);
  await run(env.DB, "DELETE FROM gcal_events WHERE calendar = 'ical'");
}
