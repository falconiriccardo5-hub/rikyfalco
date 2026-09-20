// Copia di sicurezza del database: una al giorno, le ultime 30 restano su disco.
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { db, FILE_DB } from './db.js';

const COPIE_DA_TENERE = 30;

export function cartellaBackup() {
  return process.env.BACKUP_DIR || resolve(dirname(FILE_DB), 'backup');
}

/** Esegue una copia coerente anche mentre l'app e' in uso (VACUUM INTO). */
export function eseguiBackup() {
  const cartella = cartellaBackup();
  mkdirSync(cartella, { recursive: true });
  const nome = `fitmanager-${new Date().toISOString().slice(0, 10)}.db`;
  const destinazione = join(cartella, nome);
  try {
    rmSync(destinazione, { force: true });
    db.exec(`VACUUM INTO '${destinazione.replace(/'/g, "''")}'`);
  } catch {
    // Se VACUUM INTO non e' disponibile si ricade sulla copia del file.
    copyFileSync(FILE_DB, destinazione);
  }
  const vecchie = readdirSync(cartella)
    .filter((f) => f.startsWith('fitmanager-') && f.endsWith('.db'))
    .sort()
    .slice(0, -COPIE_DA_TENERE);
  for (const f of vecchie) rmSync(join(cartella, f), { force: true });
  return { file: destinazione, dimensione: statSync(destinazione).size, copie_conservate: Math.min(COPIE_DA_TENERE, readdirSync(cartella).length) };
}
