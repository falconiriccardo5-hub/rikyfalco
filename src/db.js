import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FILE = process.env.DB_FILE || resolve(process.cwd(), 'data', 'fitmanager.db');
mkdirSync(dirname(FILE), { recursive: true });

export const db = new DatabaseSync(FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS clienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  codice_fiscale TEXT,
  data_nascita TEXT,
  scadenza_certificato TEXT,
  obiettivo TEXT,
  note TEXT,
  creato_il TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS percorsi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,                 -- 3m | 6m | 12m | custom
  durata_giorni INTEGER NOT NULL,
  data_inizio TEXT NOT NULL,
  data_fine TEXT NOT NULL,
  importo_totale REAL NOT NULL,
  num_rate INTEGER NOT NULL DEFAULT 1,
  metodo_pagamento TEXT,
  data_pagamento TEXT,                -- data dell'incasso registrato all'apertura
  stato TEXT NOT NULL DEFAULT 'attivo', -- attivo | concluso | rinnovato | annullato
  promemoria_attivo INTEGER NOT NULL DEFAULT 1,
  giorni_preavviso INTEGER NOT NULL DEFAULT 30,
  promemoria_inviato_il TEXT,
  rinnovo_di INTEGER REFERENCES percorsi(id) ON DELETE SET NULL,
  note TEXT,
  creato_il TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  percorso_id INTEGER NOT NULL REFERENCES percorsi(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  scadenza TEXT NOT NULL,
  importo REAL NOT NULL,
  pagata INTEGER NOT NULL DEFAULT 0,
  data_pagamento TEXT,
  metodo TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  percorso_id INTEGER REFERENCES percorsi(id) ON DELETE SET NULL,
  cliente_id INTEGER REFERENCES clienti(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  oggetto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  stato TEXT NOT NULL,                -- inviata | bozza | errore
  dettaglio TEXT,
  creato_il TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_percorsi_cliente ON percorsi(cliente_id);
CREATE INDEX IF NOT EXISTS idx_percorsi_fine ON percorsi(data_fine);
CREATE INDEX IF NOT EXISTS idx_rate_percorso ON rate(percorso_id);
`);

const DEFAULT_TEMPLATE = `Ciao {{nome}},

il tuo percorso di {{durata}} si concludera' il {{data_fine}}.

Se vuoi proseguire possiamo definire insieme il nuovo percorso, gli obiettivi
del prossimo ciclo e le modalita' di pagamento.

Fammi sapere quando preferisci sentirci.

A presto,
{{pt_nome}}`;

const DEFAULTS = {
  pt_nome: process.env.PT_NOME || 'Personal Trainer',
  pt_email: process.env.PT_EMAIL || '',
  giorni_preavviso: '30',
  email_oggetto: 'Il tuo percorso sta per concludersi - parliamo del rinnovo?',
  email_template: DEFAULT_TEMPLATE,
  regime_fiscale: 'Forfettario',
  coefficiente_redditivita: '78',
  obiettivo_annuo: '36000',
};

const insSetting = db.prepare('INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULTS)) insSetting.run(k, String(v));

export function getImpostazioni() {
  const rows = db.prepare('SELECT chiave, valore FROM impostazioni').all();
  return Object.fromEntries(rows.map((r) => [r.chiave, r.valore]));
}

export function setImpostazioni(patch) {
  const stmt = db.prepare(
    'INSERT INTO impostazioni (chiave, valore) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore'
  );
  for (const [k, v] of Object.entries(patch)) stmt.run(k, String(v ?? ''));
  return getImpostazioni();
}
