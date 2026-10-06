import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dataTables, exportCsvs, foldersToTrash, restoreFromCsvs } from '../worker/backup';
import { applyMigrations } from '../worker/migrate';
import { logActivity, run, setSetting } from '../worker/db';
import { unzip } from '../src/lib/unzip';
import type { Env } from '../worker/types';
import { fakeD1 } from './helpers/d1';

const dir = new URL('../migrations/', import.meta.url);
const migrations = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((name) => ({ name, sql: readFileSync(new URL(name, dir), 'utf8') }));

async function freshEnv(): Promise<Env> {
  const env = { DB: fakeD1() } as Env;
  await applyMigrations(env.DB, migrations);
  return env;
}

async function seed(env: Env) {
  const now = '2026-10-01T10:00:00.000Z';
  await run(env.DB, `INSERT INTO clients (id, first_name, last_name, notes, start_date, end_date, price_total_cents, created_at, updated_at)
    VALUES ('c1', 'Mario', 'Rossi', 'nota con "virgolette", virgole e
a capo', '2026-01-01', '2026-12-31', 120000, ?, ?)`, now, now);
  await run(env.DB, `INSERT INTO payments (id, client_id, amount_cents, due_date, created_at, updated_at) VALUES ('p1', 'c1', 60000, '2026-02-01', ?, ?)`, now, now);
  await run(env.DB, `INSERT INTO sessions (id, client_id, starts_at, created_at, updated_at) VALUES ('s1', 'c1', '2026-10-02T09:00', ?, ?)`, now, now);
  await setSetting(env.DB, 'coach_name', 'Riccardo');
  await setSetting(env.DB, 'google_refresh_token', 'segreto');
}

const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe('backup', () => {
  it('include ogni tabella dei dati, con le tabelle referenziate prima di chi le usa', async () => {
    const env = await freshEnv();
    const tables = await dataTables(env);
    expect(tables).not.toContain('d1_migrations');
    expect(tables).not.toContain('backups');
    expect(tables).not.toContain('oauth_state');
    for (const t of ['clients', 'leads', 'payments', 'sessions', 'messages', 'notifications', 'activity', 'settings']) expect(tables).toContain(t);
    expect(tables.indexOf('clients')).toBeLessThan(tables.indexOf('payments'));
    expect(tables.indexOf('leads')).toBeLessThan(tables.indexOf('sessions'));
  });

  it('una tabella aggiunta da un aggiornamento entra nel backup da sola', async () => {
    const env = await freshEnv();
    await applyMigrations(env.DB, [...migrations, { name: '9000_nuova.sql', sql: 'CREATE TABLE misure (id TEXT PRIMARY KEY, client_id TEXT REFERENCES clients(id), peso REAL);' }]);
    const { files } = await exportCsvs(env);
    expect(files.map((f) => f.name)).toContain('misure.csv');
    const manifest = JSON.parse(files.find((f) => f.name === 'manifest.json')!.content as string);
    expect(manifest.migrations).toContain('9000_nuova.sql');
  });

  it('non esporta i segreti e produce uno zip completo con LEGGIMI', async () => {
    const env = await freshEnv();
    await seed(env);
    const { files } = await exportCsvs(env);
    const settings = files.find((f) => f.name === 'settings.csv')!.content as string;
    expect(settings).toContain('coach_name');
    expect(settings).not.toContain('google_refresh_token');
    const zip = await unzip(files.find((f) => f.name === 'backup_completo.zip')!.content as Uint8Array);
    expect(Object.keys(zip)).toEqual(expect.arrayContaining(['clients.csv', 'payments.csv', 'manifest.json', 'LEGGIMI.txt']));
    expect(text(zip['clients.csv'])).toContain('Mario');
    expect(text(zip['LEGGIMI.txt'])).toContain('RIPRISTINA');
  });

  it("l'impronta cambia con i dati ma non per il solo fatto di aver fatto un backup", async () => {
    const env = await freshEnv();
    await seed(env);
    const a = (await exportCsvs(env)).hash;
    await logActivity(env, 'sistema', 'backup', 'backup', 'x', 'Backup automatico');
    await setSetting(env.DB, 'backup_last_hash', a);
    expect((await exportCsvs(env)).hash).toBe(a);
    await run(env.DB, "UPDATE clients SET notes = 'cambiata' WHERE id = 'c1'");
    expect((await exportCsvs(env)).hash).not.toBe(a);
  });

  it('ripristino: dallo zip del backup si torna esattamente ai dati di partenza', async () => {
    const env = await freshEnv();
    await seed(env);
    const { files } = await exportCsvs(env);
    const zip = await unzip(files.find((f) => f.name === 'backup_completo.zip')!.content as Uint8Array);
    const csvs = Object.fromEntries(Object.entries(zip).filter(([n]) => n.endsWith('.csv')).map(([n, d]) => [n.replace(/\.csv$/, ''), text(d)]));

    // dati cambiati dopo il backup
    await run(env.DB, "DELETE FROM payments");
    await run(env.DB, "UPDATE clients SET first_name = 'Altro'");

    const r = await restoreFromCsvs(env, csvs, 'test');
    expect(r.rows).toBeGreaterThan(0);
    const c = await env.DB.prepare("SELECT first_name, notes, price_total_cents FROM clients WHERE id = 'c1'").first<Record<string, unknown>>();
    expect(c).toEqual({ first_name: 'Mario', notes: 'nota con "virgolette", virgole e\na capo', price_total_cents: 120000 });
    expect(await env.DB.prepare("SELECT amount_cents FROM payments WHERE id = 'p1'").first('amount_cents')).toBe(60000);
    // il token Google della nuova installazione non viene toccato
    expect(await env.DB.prepare("SELECT value FROM settings WHERE key = 'google_refresh_token'").first('value')).toBe('segreto');
  });

  it('ripristino su un database nuovo e vuoto (es. dopo un disastro)', async () => {
    const env = await freshEnv();
    await seed(env);
    const { files } = await exportCsvs(env);
    const csvs = Object.fromEntries(files.filter((f) => f.name.endsWith('.csv')).map((f) => [f.name.replace(/\.csv$/, ''), f.content as string]));
    const nuovo = await freshEnv();
    await restoreFromCsvs(nuovo, csvs, 'test');
    expect(await nuovo.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first('n')).toBe(1);
  });

  it('rifiuta file che non corrispondono a nessuna tabella', async () => {
    const env = await freshEnv();
    await expect(restoreFromCsvs(env, { clients: 'id\n', sconosciuta: 'id\n' }, 'test')).rejects.toThrow(/sconosciuta\.csv/);
  });
});

describe('conservazione dei backup su Drive', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const f = (id: string, iso: string, suffix = '') => ({ id, createdTime: iso, name: `backup_${iso.slice(0, 10)}_${iso.slice(11, 13)}-${iso.slice(14, 16)}${suffix}` });

  it('tiene tutto nelle ultime 48 ore, poi uno al giorno, ed elimina oltre i giorni impostati', () => {
    const folders = [
      f('recente1', '2026-10-20T10:00:00Z'), f('recente2', '2026-10-19T09:00:00Z'), f('recente3', '2026-10-18T13:00:00Z'),
      f('g15-sera', '2026-10-15T20:00:00Z'), f('g15-mattina', '2026-10-15T08:00:00Z'),
      f('g10', '2026-10-10T01:30:00Z'),
      f('pre', '2026-10-12T10:00:00Z', '_pre-ripristino'),
      f('vecchio', '2026-08-01T01:30:00Z'),
    ];
    expect(foldersToTrash(folders, now, 60).sort()).toEqual(['g15-mattina', 'vecchio'].sort());
  });
});
