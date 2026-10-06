import type { Env } from './types';
import { isoNow } from './time';

export const uid = () => crypto.randomUUID();

export async function all<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const r = await db.prepare(sql).bind(...params).all<T>();
  return r.results ?? [];
}

export async function first<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function run(db: D1Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).bind(...params).run();
}

export async function logActivity(env: Env, actor: string, action: string, entity: string, entityId: string | null, summary: string) {
  await run(env.DB, 'INSERT INTO activity (ts, actor, action, entity, entity_id, summary) VALUES (?,?,?,?,?,?)',
    isoNow(), actor, action, entity, entityId, summary.slice(0, 500));
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const r = await first<{ value: string }>(db, 'SELECT value FROM settings WHERE key = ?', key);
  return r?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string | null) {
  if (value === null) await run(db, 'DELETE FROM settings WHERE key = ?', key);
  else await run(db, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}
