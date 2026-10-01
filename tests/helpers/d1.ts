// D1 finto sopra SQLite di Node (node:sqlite): basta per provare migrazioni, backup e ripristino.
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, unknown>;

class Stmt {
  constructor(private db: DatabaseSync, readonly sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) { return new Stmt(this.db, this.sql, params); }
  exec(): Row[] {
    const p = this.params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
    const s = this.db.prepare(this.sql);
    return (s.all as (...a: unknown[]) => Row[])(...p);
  }
  async all<T = Row>() { return { results: this.exec() as T[], success: true, meta: {} }; }
  async first<T = Row>(col?: string) {
    const r = this.exec()[0];
    if (!r) return null;
    return (col ? r[col] : r) as T;
  }
  async run() { this.exec(); return { success: true, meta: {} }; }
}

export function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const d1 = {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec('BEGIN');
      try {
        const out = stmts.map((s) => ({ results: s.exec(), success: true, meta: {} }));
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(sql: string) { db.exec(sql); return { count: 0, duration: 0 }; },
  };
  return d1 as unknown as D1Database;
}
