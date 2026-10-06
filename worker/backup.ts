// Backup su Google Drive: una cartella per backup con un CSV per tabella (leggibili con
// Excel/Google Sheets), manifest.json, LEGGIMI.txt e backup_completo.zip (un unico file da
// ricaricare nell'app). Le tabelle sono lette dal database: una tabella aggiunta da un
// aggiornamento finisce nel backup senza toccare questo file.
import type { Env } from './types';
import { all, getSetting, logActivity, run, setSetting, uid } from './db';
import { parseCsv, toCsv } from './csv';
import { driveDownload, driveList, driveSaveBackup, driveTrash, ensureBackupFolder, isConnected, type DriveFile } from './google';
import { isoNow, romeNow } from './time';
import { makeZip } from './zip';

/** Tabelle tecniche mai esportate. */
const EXCLUDED_TABLES = ['d1_migrations', 'oauth_state', 'backups'];
/** Impostazioni mai esportate (segreti / legate a questo specifico collegamento Google / stato del backup). */
const PROTECTED_SETTINGS = ['google_refresh_token', 'google_script_url', 'google_script_key', 'google_account', 'google_calendar_id', 'google_drive_folder_id', 'backup_last_hash'];
/** Azioni del registro che non contano come "modifiche ai dati" (altrimenti ogni backup ne causerebbe un altro). */
const NOISE_ACTIONS = ['backup', 'download backup'];

export type BackupTrigger = 'manuale' | 'automatico' | 'modifiche' | 'pre-ripristino';
export type BackupFile = { name: string; content: string | Uint8Array };

async function columnsOf(env: Env, table: string): Promise<string[]> {
  const r = await all<{ name: string }>(env.DB, `PRAGMA table_info("${table}")`);
  return r.map((c) => c.name);
}

/** Tabelle dei dati, ordinate in modo che una tabella venga dopo quelle a cui fa riferimento. */
export async function dataTables(env: Env): Promise<string[]> {
  const names = (await all<{ name: string }>(env.DB, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"))
    .map((r) => r.name)
    .filter((n) => !EXCLUDED_TABLES.includes(n) && !n.startsWith('sqlite_') && !n.startsWith('_cf_'));
  const deps = new Map<string, string[]>();
  for (const t of names) {
    const fks = await all<{ table: string }>(env.DB, `PRAGMA foreign_key_list("${t}")`);
    deps.set(t, fks.map((f) => f.table).filter((x) => x !== t && names.includes(x)));
  }
  const out: string[] = [];
  const visit = (t: string, seen: Set<string>) => {
    if (out.includes(t) || seen.has(t)) return;
    seen.add(t);
    for (const d of deps.get(t) ?? []) visit(d, seen);
    out.push(t);
  };
  for (const t of names) visit(t, new Set());
  return out;
}

async function appliedMigrations(env: Env): Promise<string[]> {
  try {
    return (await all<{ name: string }>(env.DB, 'SELECT name FROM d1_migrations ORDER BY id')).map((r) => r.name);
  } catch { return []; }
}

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const README = (createdAt: string, counts: Record<string, number>) => `RF Coaching – backup del ${createdAt}

Questa cartella contiene TUTTI i dati dell'app in quel momento.

  • backup_completo.zip   → il file da usare per il ripristino (contiene tutti i CSV)
  • <tabella>.csv         → un file per tabella, si apre con Excel o Google Sheets
  • manifest.json         → data del backup, numero di righe e versione del database

Righe per tabella:
${Object.entries(counts).map(([t, n]) => `  ${t}: ${n}`).join('\n')}

COME RIPRISTINARE
1. Apri l'app RF Coaching → Backup.
2. Se Google è collegato: scegli questa cartella dall'elenco e premi "Ripristina".
   Altrimenti: scarica backup_completo.zip e usa "Ripristina da file".
3. Scrivi RIPRISTINA per confermare.

Se l'app non esiste più, la guida per rimetterla in piedi è in docs/RECUPERO.md
nel repository GitHub dell'app.
`;

export async function exportCsvs(env: Env): Promise<{ files: BackupFile[]; rows: number; hash: string }> {
  const files: BackupFile[] = [];
  let rows = 0;
  const counts: Record<string, number> = {};
  const fingerprint: string[] = [];
  for (const t of await dataTables(env)) {
    const cols = await columnsOf(env, t);
    let data = await all<Record<string, unknown>>(env.DB, `SELECT * FROM "${t}"`);
    if (t === 'settings') data = data.filter((r) => !PROTECTED_SETTINGS.includes(String(r.key)));
    rows += data.length;
    counts[t] = data.length;
    const csv = toCsv(cols, data);
    files.push({ name: `${t}.csv`, content: csv });
    fingerprint.push(t, t === 'activity' ? toCsv(cols, data.filter((r) => !NOISE_ACTIONS.includes(String(r.action)))) : csv);
  }
  const createdAt = isoNow();
  const migrations = await appliedMigrations(env);
  const manifest = { app: 'rf-coaching', format: 2, created_at: createdAt, migrations, tables: Object.keys(counts), counts };
  files.push({ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) });
  files.push({ name: 'LEGGIMI.txt', content: README(`${romeNow().date} ${romeNow().time}`, counts) });
  files.push({ name: 'backup_completo.zip', content: makeZip(files.map((f) => ({ name: f.name, content: f.content as string }))) });
  return { files, rows, hash: await sha256(fingerprint.join('\u0000') + '\u0000' + migrations.join(',')) };
}

export function backupFolderName() {
  const { date, time } = romeNow();
  return `backup_${date}_${time.replace(':', '-')}`;
}

const MIME: Record<string, string> = { json: 'application/json', txt: 'text/plain', zip: 'application/zip', csv: 'text/csv' };

export async function runDriveBackup(env: Env, trigger: BackupTrigger, actor: string, prepared?: Awaited<ReturnType<typeof exportCsvs>>) {
  const id = uid();
  const ts = isoNow();
  if (!(await isConnected(env))) {
    await run(env.DB, 'INSERT INTO backups (id, ts, trigger, status, error) VALUES (?,?,?,?,?)', id, ts, trigger, 'errore', 'Google Drive non collegato');
    throw new Error('Google Drive non collegato: vai in Impostazioni → Collega Google');
  }
  try {
    const { files, rows, hash } = prepared ?? await exportCsvs(env);
    const root = await ensureBackupFolder(env);
    const folder = await driveSaveBackup(env, root, backupFolderName() + (trigger === 'pre-ripristino' ? '_pre-ripristino' : ''),
      files.map((f) => ({ ...f, mime: MIME[f.name.split('.').pop()!] ?? 'application/octet-stream' })));
    await run(env.DB, 'INSERT INTO backups (id, ts, trigger, status, drive_folder_id, rows) VALUES (?,?,?,?,?,?)', id, ts, trigger, 'ok', folder, rows);
    await setSetting(env.DB, 'backup_last_hash', hash);
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

/** Backup solo se i dati sono cambiati dall'ultimo backup riuscito (cron ogni ora). */
export async function backupIfChanged(env: Env): Promise<boolean> {
  if ((await getSetting(env.DB, 'backup_auto')) === 'false') return false;
  if (!(await isConnected(env))) return false;
  const prepared = await exportCsvs(env);
  if (prepared.hash === (await getSetting(env.DB, 'backup_last_hash'))) return false;
  await runDriveBackup(env, 'modifiche', 'sistema', prepared);
  return true;
}

/**
 * Quali cartelle spostare nel cestino di Drive:
 * - le ultime 48 ore restano tutte;
 * - prima, si tiene il backup più recente di ogni giorno (e tutti i "pre-ripristino") per `days` giorni;
 * - più vecchio di `days` giorni: eliminato.
 */
export function foldersToTrash(folders: Pick<DriveFile, 'id' | 'name' | 'createdTime'>[], now: Date, days: number): string[] {
  const hour = 3600_000;
  const sorted = [...folders].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  const keptDays = new Set<string>();
  const trash: string[] = [];
  for (const f of sorted) {
    const age = now.getTime() - new Date(f.createdTime).getTime();
    if (age <= 48 * hour) continue;
    if (age > days * 24 * hour) { trash.push(f.id); continue; }
    if (f.name.endsWith('_pre-ripristino')) continue;
    const day = /^backup_(\d{4}-\d{2}-\d{2})/.exec(f.name)?.[1] ?? f.createdTime.slice(0, 10);
    if (keptDays.has(day)) trash.push(f.id);
    else keptDays.add(day);
  }
  return trash;
}

async function applyRetention(env: Env, root: string) {
  const days = Math.max(7, Number((await getSetting(env.DB, 'backup_retention')) || 60));
  const folders = (await driveList(env, root, true)).filter((f) => f.name.startsWith('backup_'));
  // al massimo 10 per volta: resta lontano dal limite di richieste di un'esecuzione
  for (const id of foldersToTrash(folders, new Date(), days).slice(0, 10)) {
    try { await driveTrash(env, id); } catch { /* best effort */ }
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
  const tables = await dataTables(env);
  const out: Record<string, string> = {};
  for (const f of await driveList(env, folderId)) {
    const t = f.name.replace(/\.csv$/, '');
    if (f.name.endsWith('.csv') && tables.includes(t)) out[t] = await driveDownload(env, f.id);
  }
  return out;
}

/** Sostituisce i dati con quelli del backup, in un'unica transazione (batch atomico D1). */
export async function restoreFromCsvs(env: Env, csvs: Record<string, string>, actor: string) {
  if (!csvs.clients) throw new Error('Il backup deve contenere almeno clients.csv');
  const tables = await dataTables(env);
  const unknownTables = Object.keys(csvs).filter((t) => !tables.includes(t));
  if (unknownTables.length) throw new Error(`File non riconosciuti: ${unknownTables.map((t) => `${t}.csv`).join(', ')}`);
  const parsed: Record<string, Record<string, string | null>[]> = {};
  const colsByTable: Record<string, string[]> = {};
  for (const t of tables) {
    if (csvs[t] === undefined) continue;
    const cols = await columnsOf(env, t);
    const { columns, rows } = parseCsv(csvs[t]);
    const unknown = columns.filter((c) => !cols.includes(c));
    if (unknown.length) throw new Error(`${t}.csv: colonne non riconosciute (${unknown.join(', ')})`);
    const use = columns.filter((c) => cols.includes(c));
    const key = t === 'settings' ? 'key' : 'id';
    if (cols.includes(key) && !use.includes(key)) throw new Error(`${t}.csv: manca la colonna chiave`);
    parsed[t] = t === 'settings' ? rows.filter((r) => !PROTECTED_SETTINGS.includes(String(r.key))) : rows;
    colsByTable[t] = use;
  }

  const stmts: D1PreparedStatement[] = [];
  for (const t of [...tables].reverse()) {
    if (!parsed[t]) continue;
    if (t === 'settings') stmts.push(env.DB.prepare(`DELETE FROM settings WHERE key NOT IN (${PROTECTED_SETTINGS.map(() => '?').join(',')})`).bind(...PROTECTED_SETTINGS));
    else stmts.push(env.DB.prepare(`DELETE FROM "${t}"`));
  }
  let total = 0;
  for (const t of tables) {
    const rows = parsed[t];
    if (!rows) continue;
    const cols = colsByTable[t];
    const sql = `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    for (const r of rows) {
      stmts.push(env.DB.prepare(sql).bind(...cols.map((c) => r[c] ?? null)));
      total++;
    }
  }
  // Gli eventi Google verranno ricreati dalla sincronizzazione
  stmts.push(env.DB.prepare("UPDATE sessions SET gcal_status = 'pending' WHERE status != 'annullata'"));
  // Dopo il ripristino il prossimo controllo orario farà subito un backup dei dati ripristinati
  stmts.push(env.DB.prepare("DELETE FROM settings WHERE key = 'backup_last_hash'"));
  await env.DB.batch(stmts);
  await logActivity(env, actor, 'ripristino', 'backup', null, `Ripristino completato (${total} righe)`);
  return { rows: total };
}
