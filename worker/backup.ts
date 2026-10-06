// Backup in CSV (uno per tabella) su Google Drive + download ZIP + ripristino.
import type { Env } from './types';
import { all, getSetting, logActivity, run, uid } from './db';
import { parseCsv, toCsv } from './csv';
import { driveCreateFolder, driveDownload, driveList, driveTrash, driveUpload, ensureBackupFolder, isConnected } from './google';
import { isoNow, romeNow } from './time';

/** Ordine rilevante per le chiavi esterne in fase di ripristino. */
export const BACKUP_TABLES = ['clients', 'leads', 'payments', 'sessions', 'messages', 'notifications', 'activity', 'settings'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Impostazioni mai esportate (segreti / legate a questo specifico collegamento Google). */
const PROTECTED_SETTINGS = ['google_refresh_token', 'google_account', 'google_calendar_id', 'google_drive_folder_id'];
export const SCHEMA_VERSION = 1;

async function columnsOf(env: Env, table: string): Promise<string[]> {
  const r = await all<{ name: string }>(env.DB, `PRAGMA table_info(${table})`);
  return r.map((c) => c.name);
}

export async function exportCsvs(env: Env): Promise<{ files: { name: string; content: string }[]; rows: number }> {
  const files: { name: string; content: string }[] = [];
  let rows = 0;
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const cols = await columnsOf(env, t);
    let data = await all<Record<string, unknown>>(env.DB, `SELECT * FROM ${t}`);
    if (t === 'settings') data = data.filter((r) => !PROTECTED_SETTINGS.includes(String(r.key)));
    rows += data.length;
    counts[t] = data.length;
    files.push({ name: `${t}.csv`, content: toCsv(cols, data) });
  }
  files.push({ name: 'manifest.json', content: JSON.stringify({ app: 'rf-coaching', schema: SCHEMA_VERSION, created_at: isoNow(), counts }, null, 2) });
  return { files, rows };
}

export function backupFolderName() {
  const { date, time } = romeNow();
  return `backup_${date}_${time.replace(':', '-')}`;
}

export async function runDriveBackup(env: Env, trigger: 'manuale' | 'automatico' | 'pre-ripristino', actor: string) {
  const id = uid();
  const ts = isoNow();
  if (!(await isConnected(env))) {
    await run(env.DB, 'INSERT INTO backups (id, ts, trigger, status, error) VALUES (?,?,?,?,?)', id, ts, trigger, 'errore', 'Google Drive non collegato');
    throw new Error('Google Drive non collegato: vai in Impostazioni → Collega Google');
  }
  try {
    const { files, rows } = await exportCsvs(env);
    const root = await ensureBackupFolder(env);
    const folder = await driveCreateFolder(env, backupFolderName() + (trigger === 'pre-ripristino' ? '_pre-ripristino' : ''), root);
    for (const f of files) await driveUpload(env, f.name, f.content, folder, f.name.endsWith('.json') ? 'application/json' : 'text/csv');
    await run(env.DB, 'INSERT INTO backups (id, ts, trigger, status, drive_folder_id, rows) VALUES (?,?,?,?,?,?)', id, ts, trigger, 'ok', folder, rows);
    await logActivity(env, actor, 'backup', 'backup', id, `Backup ${trigger} su Drive (${rows} righe)`);
    await applyRetention(env, root);
    return { id, folder, rows };
  } catch (e) {
    const msg = String((e as Error).message).slice(0, 300);
    await run(env.DB, 'INSERT INTO backups (id, ts, trigger, status, error) VALUES (?,?,?,?,?)', id, ts, trigger, 'errore', msg);
    await run(env.DB, 'INSERT OR IGNORE INTO notifications (id, kind, title, body, link, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?)',
      uid(), 'backup', 'Backup non riuscito', msg, '/backup', `backup-fail:${id}`, ts);
    throw e;
  }
}

async function applyRetention(env: Env, root: string) {
  const keep = Math.max(7, Number((await getSetting(env.DB, 'backup_retention')) || 60));
  const folders = (await driveList(env, root, true)).filter((f) => f.name.startsWith('backup_'));
  for (const f of folders.slice(keep)) {
    try { await driveTrash(env, f.id); } catch { /* best effort */ }
  }
}

export async function listDriveBackups(env: Env) {
  const root = await ensureBackupFolder(env);
  return (await driveList(env, root, true)).filter((f) => f.name.startsWith('backup_'));
}

export async function readDriveBackup(env: Env, folderId: string): Promise<Record<string, string>> {
  // Sicurezza: la cartella deve essere figlia della cartella backup dell'app
  const root = await ensureBackupFolder(env);
  const folders = await driveList(env, root, true);
  if (!folders.some((f) => f.id === folderId)) throw new Error('Cartella di backup non trovata');
  const files = await driveList(env, folderId);
  const out: Record<string, string> = {};
  for (const f of files) {
    const t = f.name.replace(/\.csv$/, '');
    if ((BACKUP_TABLES as readonly string[]).includes(t)) out[t] = await driveDownload(env, f.id);
  }
  return out;
}

/** Sostituisce i dati con quelli del backup, in un'unica transazione (batch atomico D1). */
export async function restoreFromCsvs(env: Env, csvs: Record<string, string>, actor: string) {
  if (!csvs.clients) throw new Error('Il backup deve contenere almeno clients.csv');
  const parsed: Partial<Record<BackupTable, Record<string, string | null>[]>> = {};
  const colsByTable: Partial<Record<BackupTable, string[]>> = {};
  for (const t of BACKUP_TABLES) {
    if (csvs[t] === undefined) continue;
    const cols = await columnsOf(env, t);
    const { columns, rows } = parseCsv(csvs[t]);
    const unknown = columns.filter((c) => !cols.includes(c));
    if (unknown.length) throw new Error(`${t}.csv: colonne non riconosciute (${unknown.join(', ')})`);
    const use = columns.filter((c) => cols.includes(c));
    if (t !== 'activity' && !use.includes(t === 'settings' ? 'key' : 'id')) throw new Error(`${t}.csv: manca la colonna chiave`);
    parsed[t] = t === 'settings' ? rows.filter((r) => !PROTECTED_SETTINGS.includes(String(r.key))) : rows;
    colsByTable[t] = use;
  }

  const stmts: D1PreparedStatement[] = [];
  for (const t of [...BACKUP_TABLES].reverse()) {
    if (!parsed[t]) continue;
    if (t === 'settings') stmts.push(env.DB.prepare(`DELETE FROM settings WHERE key NOT IN (${PROTECTED_SETTINGS.map(() => '?').join(',')})`).bind(...PROTECTED_SETTINGS));
    else stmts.push(env.DB.prepare(`DELETE FROM ${t}`));
  }
  let total = 0;
  for (const t of BACKUP_TABLES) {
    const rows = parsed[t];
    if (!rows) continue;
    const cols = colsByTable[t]!;
    const sql = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    for (const r of rows) {
      stmts.push(env.DB.prepare(sql).bind(...cols.map((c) => r[c] ?? null)));
      total++;
    }
  }
  // Gli eventi Google verranno ricreati dalla sincronizzazione
  stmts.push(env.DB.prepare("UPDATE sessions SET gcal_status = 'pending' WHERE status != 'annullata'"));
  await env.DB.batch(stmts);
  await logActivity(env, actor, 'ripristino', 'backup', null, `Ripristino completato (${total} righe)`);
  return { rows: total };
}
