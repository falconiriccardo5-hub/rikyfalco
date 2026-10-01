import vm from 'node:vm';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appsScriptCode } from '../worker/apps-script';
import { applyMigrations } from '../worker/migrate';
import { readDriveBackup, listDriveBackups, runDriveBackup } from '../worker/backup';
import * as google from '../worker/google';
import { getSetting, run } from '../worker/db';
import type { Env } from '../worker/types';
import { fakeD1 } from './helpers/d1';

// Google simulato: abbastanza per far girare lo script di ponte come farebbe Apps Script.
function fakeGoogle() {
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  type F = { id: string; name: string; trashed: boolean; created: Date; folders: F[]; files: { id: string; name: string; mime: string; data: string; created: Date; trashed: boolean }[] };
  const all = new Map<string, F>();
  const mkFolder = (name: string): F => { const f: F = { id: id('folder'), name, trashed: false, created: new Date(Date.now() + n * 1000), folders: [], files: [] }; all.set(f.id, f); return f; };
  const root = mkFolder('root');
  const iter = <T,>(xs: T[]) => { let i = 0; return { hasNext: () => i < xs.length, next: () => xs[i++] }; };
  const wrapFolder = (f: F): unknown => ({
    getId: () => f.id, getName: () => f.name, getDateCreated: () => f.created, isTrashed: () => f.trashed,
    setTrashed: (t: boolean) => { f.trashed = t; },
    getFoldersByName: (nm: string) => iter(f.folders.filter((x) => x.name === nm && !x.trashed).map(wrapFolder)),
    getFolders: () => iter(f.folders.filter((x) => !x.trashed).map(wrapFolder)),
    getFiles: () => iter(f.files.filter((x) => !x.trashed).map((x) => ({ getId: () => x.id, getName: () => x.name, getDateCreated: () => x.created, getMimeType: () => x.mime }))),
    createFolder: (nm: string) => { const c = mkFolder(nm); f.folders.push(c); return wrapFolder(c); },
    createFile: (b: { name: string; mime: string; data: string }) => { f.files.push({ id: id('file'), name: b.name, mime: b.mime, data: b.data, created: new Date(), trashed: false }); },
  });
  const files = () => [...all.values()].flatMap((f) => f.files);
  const cals: { id: string; name: string; events: Map<string, Record<string, unknown>> }[] = [];
  const wrapCal = (c: (typeof cals)[number]) => ({
    getId: () => c.id,
    getEventById: (eid: string) => {
      const ev = c.events.get(eid);
      if (!ev) return null;
      return {
        getId: () => eid, setTitle: (t: string) => { ev.title = t; }, setTime: (s: Date, e: Date) => { ev.start = s; ev.end = e; },
        setLocation: (l: string) => { ev.location = l; }, setDescription: (d: string) => { ev.description = d; }, deleteEvent: () => { c.events.delete(eid); },
      };
    },
    createEvent: (title: string, start: Date, end: Date, o: Record<string, string>) => { const eid = id('ev') + '@google.com'; c.events.set(eid, { title, start, end, ...o }); return { getId: () => eid }; },
  });
  const globals = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'riccardo@example.com' }) },
    Utilities: {
      parseDate: (s: string, tz: string) => { expect(tz).toBe('Europe/Rome'); return new Date(s + ':00+02:00'); },
      base64Decode: (b: string) => Buffer.from(b, 'base64').toString('latin1'),
      newBlob: (data: string, mime: string, name: string) => ({ data, mime, name }),
    },
    DriveApp: {
      getRootFolder: () => wrapFolder(root),
      createFolder: (nm: string) => (wrapFolder(root) as { createFolder: (n: string) => unknown }).createFolder(nm),
      getFolderById: (fid: string) => { const f = all.get(fid); if (!f) throw new Error('not found'); return wrapFolder(f); },
      getFileById: (fid: string) => {
        const x = files().find((y) => y.id === fid);
        if (!x) throw new Error('not found');
        return { getBlob: () => ({ getDataAsString: () => x.data }), setTrashed: (t: boolean) => { x.trashed = t; } };
      },
    },
    CalendarApp: {
      getCalendarById: (cid: string) => { const c = cals.find((x) => x.id === cid); return c ? wrapCal(c) : null; },
      getOwnedCalendarsByName: (nm: string) => cals.filter((c) => c.name === nm).map(wrapCal),
      createCalendar: (nm: string) => { const c = { id: id('cal'), name: nm, events: new Map() }; cals.push(c); return wrapCal(c); },
    },
  };
  return { globals, cals, files, all };
}

function load(key: string) {
  const g = fakeGoogle();
  const ctx = vm.createContext({ ...g.globals });
  vm.runInContext(appsScriptCode(key), ctx);
  const call = (body: unknown) => JSON.parse((ctx.doPost as (e: unknown) => { text: string })({ postData: { contents: JSON.stringify(body) } }).text);
  return { ...g, call };
}

describe('script di ponte verso Google (Apps Script)', () => {
  it('rifiuta chi non ha la chiave', () => {
    const { call } = load('segreta');
    expect(call({ key: 'sbagliata', action: 'ping' })).toEqual({ ok: false, error: 'Chiave non valida' });
    expect(call({ key: 'segreta', action: 'ping' })).toEqual({ ok: true, result: { account: 'riccardo@example.com', version: 1 } });
  });

  it('crea il calendario una volta sola e gestisce gli eventi', () => {
    const { call, cals } = load('k');
    const cal = call({ key: 'k', action: 'ensureCalendar', args: { name: 'RF Coaching' } }).result.id;
    expect(call({ key: 'k', action: 'ensureCalendar', args: { id: null, name: 'RF Coaching' } }).result.id).toBe(cal);
    expect(cals).toHaveLength(1);
    const ev = call({ key: 'k', action: 'upsertEvent', args: { calendarId: cal, title: 'Lezione · Mario', start: '2026-10-02T09:00', end: '2026-10-02T10:00', location: '', description: 'x' } }).result.id;
    call({ key: 'k', action: 'upsertEvent', args: { calendarId: cal, eventId: ev, title: '✓ Lezione · Mario', start: '2026-10-02T09:00', end: '2026-10-02T10:00' } });
    expect(cals[0].events.get(ev)!.title).toBe('✓ Lezione · Mario');
    expect(cals[0].events.size).toBe(1);
    call({ key: 'k', action: 'deleteEvent', args: { calendarId: cal, eventId: ev } });
    expect(cals[0].events.size).toBe(0);
  });

  it('salva un backup (testo e zip), lo elenca, lo scarica e lo cestina', () => {
    const { call, files } = load('k');
    const root = call({ key: 'k', action: 'ensureFolder', args: { name: 'RF Coaching – Backup' } }).result.id;
    expect(call({ key: 'k', action: 'ensureFolder', args: { name: 'RF Coaching – Backup' } }).result.id).toBe(root);
    const folder = call({ key: 'k', action: 'saveBackup', args: { parent: root, name: 'backup_2026-10-01_10-00', files: [
      { name: 'clients.csv', mime: 'text/csv', text: 'id,first_name\nc1,Mario\n' },
      { name: 'backup_completo.zip', mime: 'application/zip', base64: Buffer.from('PK\u0003\u0004').toString('base64') },
    ] } }).result.id;
    const list = call({ key: 'k', action: 'list', args: { parent: root, foldersOnly: true } }).result.files;
    expect(list.map((f: { name: string }) => f.name)).toEqual(['backup_2026-10-01_10-00']);
    const inside = call({ key: 'k', action: 'list', args: { parent: folder } }).result.files;
    expect(inside.map((f: { name: string }) => f.name).sort()).toEqual(['backup_completo.zip', 'clients.csv']);
    const csv = inside.find((f: { name: string }) => f.name === 'clients.csv');
    expect(call({ key: 'k', action: 'download', args: { id: csv.id } }).result.text).toContain('Mario');
    expect(files().find((f) => f.name === 'backup_completo.zip')!.data.startsWith('PK')).toBe(true);
    call({ key: 'k', action: 'trash', args: { id: folder } });
    expect(call({ key: 'k', action: 'list', args: { parent: root, foldersOnly: true } }).result.files).toEqual([]);
    // una cartella nel cestino viene ricreata/ritrovata
    call({ key: 'k', action: 'trash', args: { id: root } });
    expect(call({ key: 'k', action: 'ensureFolder', args: { id: root, name: 'RF Coaching – Backup' } }).result.id).not.toBe(root);
  });

  it('segnala le azioni sconosciute', () => {
    const { call } = load('k');
    expect(call({ key: 'k', action: 'boh' })).toEqual({ ok: false, error: 'Azione sconosciuta: boh' });
  });
});

describe("l'app collegata tramite lo script", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const env = { DB: fakeD1() } as Env;
    const dir = new URL('../migrations/', import.meta.url);
    await applyMigrations(env.DB, readdirSync(dir).filter((f) => f.endsWith('.sql')).map((name) => ({ name, sql: readFileSync(new URL(name, dir), 'utf8') })));
    const key = await google.scriptKey(env);
    const g = load(key);
    const url = 'https://script.google.com/macros/s/AKfyc_test-123/exec';
    vi.stubGlobal('fetch', async (u: string, init: RequestInit) => {
      expect(u).toBe(url);
      return new Response(JSON.stringify(g.call(JSON.parse(String(init.body)))), { headers: { 'content-type': 'application/json' } });
    });
    return { env, g, url };
  }

  it("rifiuta indirizzi che non sono un'App web di Apps Script", async () => {
    const { env } = await setup();
    await expect(google.connectScript(env, 'https://example.com/exec')).rejects.toThrow(/App web/);
    expect(await google.isConnected(env)).toBe(false);
  });

  it('collega, sincronizza una lezione e fa un backup leggibile per il ripristino', async () => {
    const { env, g, url } = await setup();
    expect(await google.connectScript(env, url)).toBe('riccardo@example.com');
    expect(await google.isConnected(env)).toBe(true);
    expect(g.cals).toHaveLength(1);

    const now = '2026-10-01T10:00:00.000Z';
    await run(env.DB, `INSERT INTO clients (id, first_name, start_date, end_date, created_at, updated_at) VALUES ('c1','Mario','2026-01-01','2026-12-31',?,?)`, now, now);
    await run(env.DB, `INSERT INTO sessions (id, client_id, starts_at, created_at, updated_at) VALUES ('s1','c1','2026-10-02T09:00',?,?)`, now, now);
    await google.syncSession(env, { id: 's1', kind: 'lezione', starts_at: '2026-10-02T09:00', duration_min: 60, mode: 'live', location: '', status: 'programmata', gcal_event_id: null, person: 'Mario' });
    const s = await env.DB.prepare("SELECT gcal_status, gcal_event_id FROM sessions WHERE id = 's1'").first<{ gcal_status: string; gcal_event_id: string }>();
    expect(s!.gcal_status).toBe('ok');
    expect(g.cals[0].events.get(s!.gcal_event_id)!.title).toBe('Lezione · Mario');

    const r = await runDriveBackup(env, 'manuale', 'test');
    expect(r.rows).toBeGreaterThan(0);
    const backups = await listDriveBackups(env);
    expect(backups).toHaveLength(1);
    const csvs = await readDriveBackup(env, backups[0].id);
    expect(csvs.clients).toContain('Mario');
    expect(g.files().map((f) => f.name)).toEqual(expect.arrayContaining(['backup_completo.zip', 'LEGGIMI.txt', 'manifest.json']));
    // la chiave e l'URL dello script non finiscono nel backup
    expect(csvs.settings ?? '').not.toContain('google_script');

    await google.disconnect(env);
    expect(await google.isConnected(env)).toBe(false);
    expect(await getSetting(env.DB, 'google_script_url')).toBeNull();
  });
});
