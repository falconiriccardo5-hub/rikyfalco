// Integrazione Google, in due modi:
//  1. "Ponte" Apps Script (consigliato, niente Google Cloud Console): uno script nell'account Google
//     dell'utente esegue le operazioni (vedi apps-script.ts). URL e chiave stanno nel DB.
//  2. OAuth con un client creato in Google Cloud Console (GOOGLE_CLIENT_ID/SECRET), permessi minimi:
//  - calendar.app.created → l'app vede/modifica SOLO il calendario che crea lei ("RF Coaching")
//  - drive.file           → l'app vede SOLO i file/cartelle che crea lei (i backup)
// Il refresh token è salvato nel DB cifrato con AES-256-GCM (ENCRYPTION_KEY).
import type { Env } from './types';
import { getSetting, setSetting, first, run } from './db';
import { decrypt, encrypt, randomToken } from './crypto';
import { addMinutesLocal, isoNow, TZ } from './time';

export const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/drive.file',
];

const CAL = 'https://www.googleapis.com/calendar/v3';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export const googleConfigured = (env: Env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.ENCRYPTION_KEY && env.APP_URL);
const redirectUri = (env: Env) => `${env.APP_URL!.replace(/\/$/, '')}/api/google/callback`;

export async function buildAuthUrl(env: Env): Promise<string> {
  const state = randomToken();
  await run(env.DB, 'DELETE FROM oauth_state WHERE created_at < ?', new Date(Date.now() - 15 * 60_000).toISOString());
  await run(env.DB, 'INSERT INTO oauth_state (state, created_at) VALUES (?, ?)', state, isoNow());
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(env),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function handleCallback(env: Env, code: string, state: string): Promise<string> {
  const row = await first<{ created_at: string }>(env.DB, 'SELECT created_at FROM oauth_state WHERE state = ?', state);
  await run(env.DB, 'DELETE FROM oauth_state WHERE state = ?', state);
  if (!row || Date.now() - Date.parse(row.created_at) > 10 * 60_000) throw new Error('Stato OAuth non valido o scaduto');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(env), grant_type: 'authorization_code',
    }),
  });
  const tok = (await res.json()) as { refresh_token?: string; access_token?: string; expires_in?: number; id_token?: string; scope?: string; error?: string };
  if (!res.ok || !tok.refresh_token) throw new Error(tok.error || 'Google non ha restituito un refresh token');
  const granted = (tok.scope || '').split(' ');
  for (const s of SCOPES.slice(2)) if (!granted.includes(s)) throw new Error('Permessi Google incompleti: autorizza calendario e Drive');

  let email = '';
  if (tok.id_token) {
    try { email = JSON.parse(atob(tok.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch { /* ignore */ }
  }
  await setSetting(env.DB, 'google_script_url', null);
  await setSetting(env.DB, 'google_refresh_token', await encrypt(tok.refresh_token, env.ENCRYPTION_KEY!));
  await setSetting(env.DB, 'google_account', email);
  tokenCache = { token: tok.access_token!, exp: Date.now() + (tok.expires_in ?? 3000) * 1000 - 60_000 };
  await ensureCalendar(env);
  await ensureBackupFolder(env);
  return email;
}

let tokenCache: { token: string; exp: number } | null = null;

export async function isConnected(env: Env) {
  if (await getSetting(env.DB, 'google_script_url')) return true;
  return googleConfigured(env) && !!(await getSetting(env.DB, 'google_refresh_token'));
}

// ───────────── Ponte Apps Script ─────────────

/** URL valido di una "App web" di Apps Script. */
export const isScriptUrl = (u: string) => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u);

/** Chiave condivisa con lo script (creata alla prima richiesta e poi sempre la stessa). */
export async function scriptKey(env: Env): Promise<string> {
  let k = await getSetting(env.DB, 'google_script_key');
  if (!k) { k = randomToken(24); await setSetting(env.DB, 'google_script_key', k); }
  return k;
}

async function scriptUrl(env: Env) { return getSetting(env.DB, 'google_script_url'); }

export async function callScript<T>(env: Env, action: string, args: Record<string, unknown> = {}, url?: string): Promise<T> {
  const target = url ?? (await scriptUrl(env));
  if (!target) throw new Error('Google non collegato');
  const res = await fetch(target, {
    method: 'POST', redirect: 'follow',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: await scriptKey(env), action, args }),
  });
  const body = await res.text();
  let data: { ok?: boolean; result?: T; error?: string };
  try { data = JSON.parse(body); } catch {
    throw new Error(`Lo script Google non risponde correttamente (${res.status}): controlla che sia pubblicato come App web con accesso "Chiunque"`);
  }
  if (!data.ok) throw new Error(`Script Google: ${data.error || 'errore sconosciuto'}`);
  return data.result as T;
}

/** Collega Google tramite lo script: verifica che risponda, poi prepara calendario e cartella backup. */
export async function connectScript(env: Env, url: string): Promise<string> {
  if (!isScriptUrl(url)) throw new Error("L'indirizzo deve essere quello dell'App web: https://script.google.com/macros/s/…/exec");
  const { account } = await callScript<{ account: string }>(env, 'ping', {}, url);
  await setSetting(env.DB, 'google_refresh_token', null);
  await setSetting(env.DB, 'google_script_url', url);
  await setSetting(env.DB, 'google_account', account || '');
  await ensureCalendar(env);
  await ensureBackupFolder(env);
  return account;
}

async function accessToken(env: Env): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache.token;
  const enc = await getSetting(env.DB, 'google_refresh_token');
  if (!enc || !googleConfigured(env)) throw new Error('Google non collegato');
  const refresh = await decrypt(enc, env.ENCRYPTION_KEY!);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  const tok = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !tok.access_token) {
    if (tok.error === 'invalid_grant') await setSetting(env.DB, 'google_refresh_token', null);
    throw new Error('Token Google non valido: ricollega l\'account (' + (tok.error || res.status) + ')');
  }
  tokenCache = { token: tok.access_token, exp: Date.now() + (tok.expires_in ?? 3000) * 1000 - 60_000 };
  return tokenCache.token;
}

export async function disconnect(env: Env) {
  const enc = await getSetting(env.DB, 'google_refresh_token');
  if (enc && env.ENCRYPTION_KEY) {
    try {
      const refresh = await decrypt(enc, env.ENCRYPTION_KEY);
      await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refresh }) });
    } catch { /* revoca best-effort */ }
  }
  tokenCache = null;
  await setSetting(env.DB, 'google_refresh_token', null);
  await setSetting(env.DB, 'google_script_url', null);
  await setSetting(env.DB, 'google_account', null);
}

async function g<T>(env: Env, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${await accessToken(env)}`, ...(init.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}), ...(init.headers || {}) } });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>;
}

// ───────────── Calendario ─────────────

export async function ensureCalendar(env: Env): Promise<string> {
  const existing = await getSetting(env.DB, 'google_calendar_id');
  if (await scriptUrl(env)) {
    const name = (await getSetting(env.DB, 'calendar_name')) || 'RF Coaching';
    const { id } = await callScript<{ id: string }>(env, 'ensureCalendar', { id: existing, name });
    if (id !== existing) await setSetting(env.DB, 'google_calendar_id', id);
    return id;
  }
  if (existing) {
    try { await g(env, `${CAL}/calendars/${encodeURIComponent(existing)}`); return existing; }
    catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  }
  const name = (await getSetting(env.DB, 'calendar_name')) || 'RF Coaching';
  const cal = await g<{ id: string }>(env, `${CAL}/calendars`, { method: 'POST', body: JSON.stringify({ summary: name, timeZone: TZ, description: 'Lezioni e consulenze gestite dall\'app RF Coaching' }) });
  await setSetting(env.DB, 'google_calendar_id', cal.id);
  return cal.id;
}

export interface SessionForSync {
  id: string; kind: string; starts_at: string; duration_min: number; mode: string; location: string;
  status: string; gcal_event_id: string | null; person: string;
}

const KIND_LABEL: Record<string, string> = { lezione: 'Lezione', consulenza: 'Consulenza', visita: 'Visita' };

export async function syncSession(env: Env, s: SessionForSync): Promise<void> {
  if (!(await isConnected(env))) {
    await run(env.DB, "UPDATE sessions SET gcal_status = 'off', gcal_error = NULL WHERE id = ?", s.id);
    return;
  }
  try {
    if (await scriptUrl(env)) return await syncSessionScript(env, s);
    const calId = encodeURIComponent(await ensureCalendar(env));
    if (s.status === 'annullata') {
      if (s.gcal_event_id) {
        try { await g(env, `${CAL}/calendars/${calId}/events/${encodeURIComponent(s.gcal_event_id)}`, { method: 'DELETE' }); }
        catch (e) { const st = (e as { status?: number }).status; if (st !== 404 && st !== 410) throw e; }
      }
      await run(env.DB, "UPDATE sessions SET gcal_event_id = NULL, gcal_status = 'ok', gcal_error = NULL WHERE id = ?", s.id);
      return;
    }
    const body = {
      summary: eventTitle(s),
      location: s.location || (s.mode === 'online' ? 'Online' : ''),
      description: `${s.mode === 'online' ? 'Online' : 'In presenza'} — gestito da RF Coaching`,
      start: { dateTime: `${s.starts_at}:00`, timeZone: TZ },
      end: { dateTime: `${addMinutesLocal(s.starts_at, s.duration_min)}:00`, timeZone: TZ },
      extendedProperties: { private: { rfSessionId: s.id } },
    };
    let eventId = s.gcal_event_id;
    if (eventId) {
      try { await g(env, `${CAL}/calendars/${calId}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(body) }); }
      catch (e) { const st = (e as { status?: number }).status; if (st === 404 || st === 410) eventId = null; else throw e; }
    }
    if (!eventId) {
      const ev = await g<{ id: string }>(env, `${CAL}/calendars/${calId}/events`, { method: 'POST', body: JSON.stringify(body) });
      eventId = ev.id;
    }
    await run(env.DB, "UPDATE sessions SET gcal_event_id = ?, gcal_status = 'ok', gcal_error = NULL WHERE id = ?", eventId, s.id);
  } catch (e) {
    await run(env.DB, "UPDATE sessions SET gcal_status = 'error', gcal_error = ? WHERE id = ?", String((e as Error).message).slice(0, 300), s.id);
  }
}

const eventTitle = (s: SessionForSync) =>
  `${s.status === 'svolta' ? '✓ ' : s.status === 'saltata' ? '✗ ' : ''}${KIND_LABEL[s.kind] ?? 'Appuntamento'} · ${s.person}`;

async function syncSessionScript(env: Env, s: SessionForSync): Promise<void> {
  const calendarId = await ensureCalendar(env);
  if (s.status === 'annullata') {
    if (s.gcal_event_id) await callScript(env, 'deleteEvent', { calendarId, eventId: s.gcal_event_id });
    await run(env.DB, "UPDATE sessions SET gcal_event_id = NULL, gcal_status = 'ok', gcal_error = NULL WHERE id = ?", s.id);
    return;
  }
  const { id } = await callScript<{ id: string }>(env, 'upsertEvent', {
    calendarId, eventId: s.gcal_event_id,
    title: eventTitle(s),
    location: s.location || (s.mode === 'online' ? 'Online' : ''),
    description: `${s.mode === 'online' ? 'Online' : 'In presenza'} — gestito da RF Coaching`,
    start: s.starts_at, end: addMinutesLocal(s.starts_at, s.duration_min),
  });
  await run(env.DB, "UPDATE sessions SET gcal_event_id = ?, gcal_status = 'ok', gcal_error = NULL WHERE id = ?", id, s.id);
}

export async function deleteEvent(env: Env, eventId: string | null) {
  if (!eventId || !(await isConnected(env))) return;
  if (await scriptUrl(env)) {
    try { await callScript(env, 'deleteEvent', { calendarId: await ensureCalendar(env), eventId }); } catch { /* evento già rimosso */ }
    return;
  }
  try {
    const calId = encodeURIComponent(await ensureCalendar(env));
    await g(env, `${CAL}/calendars/${calId}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  } catch { /* evento già rimosso */ }
}

// ───────────── Drive (backup) ─────────────

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const BACKUP_FOLDER_NAME = 'RF Coaching – Backup';

export async function ensureBackupFolder(env: Env): Promise<string> {
  const existing = await getSetting(env.DB, 'google_drive_folder_id');
  if (await scriptUrl(env)) {
    const { id } = await callScript<{ id: string }>(env, 'ensureFolder', { id: existing, name: BACKUP_FOLDER_NAME });
    if (id !== existing) await setSetting(env.DB, 'google_drive_folder_id', id);
    return id;
  }
  if (existing) {
    try {
      const f = await g<{ trashed: boolean }>(env, `${DRIVE}/files/${existing}?fields=id,trashed`);
      if (!f.trashed) return existing;
    } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  }
  // Installazione nuova (es. dopo un disastro): riusa la cartella dei backup già creata da questa
  // app su Drive, così i vecchi backup compaiono subito e si possono ripristinare.
  const q = new URLSearchParams({ q: `name = '${BACKUP_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false and 'root' in parents`, orderBy: 'createdTime', fields: 'files(id)' });
  const found = (await g<{ files: { id: string }[] }>(env, `${DRIVE}/files?${q}`)).files[0];
  const id = found?.id ?? (await g<{ id: string }>(env, `${DRIVE}/files`, { method: 'POST', body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: FOLDER_MIME }) })).id;
  await setSetting(env.DB, 'google_drive_folder_id', id);
  return id;
}

async function driveCreateFolder(env: Env, name: string, parent: string): Promise<string> {
  const f = await g<{ id: string }>(env, `${DRIVE}/files`, { method: 'POST', body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parent] }) });
  return f.id;
}

async function driveUpload(env: Env, name: string, content: string | Uint8Array, parent: string, mime: string) {
  const boundary = 'rf' + randomToken(12);
  const head = `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: mime })}\r\n--${boundary}\r\ncontent-type: ${mime}${typeof content === 'string' ? '; charset=UTF-8' : ''}\r\n\r\n`;
  const body = new Blob([head, content, `\r\n--${boundary}--`]);
  await g(env, `${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', body, headers: { 'content-type': `multipart/related; boundary=${boundary}` } });
}

const toBase64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Crea la cartella `name` dentro `parent` con tutti i file del backup. Restituisce l'id della cartella. */
export async function driveSaveBackup(env: Env, parent: string, name: string, files: { name: string; content: string | Uint8Array; mime: string }[]): Promise<string> {
  if (await scriptUrl(env)) {
    const { id } = await callScript<{ id: string }>(env, 'saveBackup', {
      parent, name,
      files: files.map((f) => typeof f.content === 'string'
        ? { name: f.name, mime: f.mime, text: f.content }
        : { name: f.name, mime: f.mime, base64: toBase64(f.content) }),
    });
    return id;
  }
  const folder = await driveCreateFolder(env, name, parent);
  for (const f of files) await driveUpload(env, f.name, f.content, folder, f.mime);
  return folder;
}

export interface DriveFile { id: string; name: string; createdTime: string; mimeType: string }

export async function driveList(env: Env, parent: string, foldersOnly = false): Promise<DriveFile[]> {
  if (await scriptUrl(env)) return (await callScript<{ files: DriveFile[] }>(env, 'list', { parent, foldersOnly })).files;
  const q = `'${parent.replace(/'/g, '')}' in parents and trashed = false${foldersOnly ? ` and mimeType = '${FOLDER_MIME}'` : ''}`;
  const out: DriveFile[] = [];
  let pageToken = '';
  do {
    const p = new URLSearchParams({ q, orderBy: 'createdTime desc', pageSize: '200', fields: 'nextPageToken,files(id,name,createdTime,mimeType)' });
    if (pageToken) p.set('pageToken', pageToken);
    const r = await g<{ files: DriveFile[]; nextPageToken?: string }>(env, `${DRIVE}/files?${p}`);
    out.push(...r.files);
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return out;
}

export async function driveDownload(env: Env, fileId: string): Promise<string> {
  if (await scriptUrl(env)) return (await callScript<{ text: string }>(env, 'download', { id: fileId })).text;
  const res = await fetch(`${DRIVE}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { authorization: `Bearer ${await accessToken(env)}` } });
  if (!res.ok) throw new Error(`Download Drive fallito (${res.status})`);
  return res.text();
}

export async function driveTrash(env: Env, fileId: string) {
  if (await scriptUrl(env)) { await callScript(env, 'trash', { id: fileId }); return; }
  await g(env, `${DRIVE}/files/${encodeURIComponent(fileId)}`, { method: 'PATCH', body: JSON.stringify({ trashed: true }) });
}
