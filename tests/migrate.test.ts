import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyMigrations, splitSql, type Migration } from '../worker/migrate';
import { fakeD1 } from './helpers/d1';

const dir = new URL('../migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const migrations: Migration[] = files.map((name) => ({ name, sql: readFileSync(new URL(name, dir), 'utf8') }));

describe('migrazioni automatiche', () => {
  it('worker/migrations.ts include tutti i file della cartella migrations/', () => {
    const src = readFileSync(new URL('../worker/migrations.ts', import.meta.url), 'utf8');
    const listed = [...src.matchAll(/name: '([^']+\.sql)'/g)].map((m) => m[1]).sort();
    expect(listed).toEqual(files);
    for (const f of files) expect(src).toContain(`'../migrations/${f}'`);
  });

  it('splitSql gestisce commenti, stringhe con ; e trigger', () => {
    const sql = `-- commento; con punto e virgola
CREATE TABLE a (x TEXT DEFAULT 'a;b'); /* blocco; */
CREATE TRIGGER t AFTER INSERT ON a BEGIN UPDATE a SET x = 'y'; END;
INSERT INTO a (x) VALUES ('it''s');`;
    expect(splitSql(sql)).toEqual([
      "CREATE TABLE a (x TEXT DEFAULT 'a;b')",
      "CREATE TRIGGER t AFTER INSERT ON a BEGIN UPDATE a SET x = 'y'; END",
      "INSERT INTO a (x) VALUES ('it''s')",
    ]);
  });

  it('crea lo schema su un database vuoto e non rifà nulla la seconda volta', async () => {
    const db = fakeD1();
    expect(await applyMigrations(db, migrations)).toEqual(files);
    expect(await applyMigrations(db, migrations)).toEqual([]);
    const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>()).results.map((r) => r.name);
    expect(tables).toEqual(expect.arrayContaining(['clients', 'payments', 'sessions', 'settings', 'd1_migrations']));
  });

  it('rispetta le migrazioni già applicate con wrangler', async () => {
    const db = fakeD1();
    for (const s of splitSql(migrations[0].sql)) await db.prepare(s).run();
    await db.prepare('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)').run();
    await db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(migrations[0].name).run();
    expect(await applyMigrations(db, migrations)).toEqual(files.slice(1));
  });

  it('una migrazione che fallisce non lascia modifiche a metà', async () => {
    const db = fakeD1();
    await applyMigrations(db, migrations);
    const bad: Migration = { name: '9999_rotta.sql', sql: 'CREATE TABLE nuova (x TEXT); INSERT INTO tabella_inesistente VALUES (1);' };
    await expect(applyMigrations(db, [...migrations, bad])).rejects.toThrow(/9999_rotta/);
    expect(await db.prepare("SELECT name FROM sqlite_master WHERE name = 'nuova'").first()).toBeNull();
  });
});
