-- Schema iniziale RF Coaching (Cloudflare D1 / SQLite)
-- Importi in centesimi (INTEGER). Date 'YYYY-MM-DD', date-ora 'YYYY-MM-DDTHH:MM' (ora di Roma).

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'misto' CHECK (mode IN ('live','online','misto')),
  program_months INTEGER NOT NULL DEFAULT 12 CHECK (program_months BETWEEN 1 AND 60),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  price_total_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  due_date TEXT NOT NULL,
  paid_at TEXT,
  paid_amount_cents INTEGER,
  method TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_due ON payments(due_date);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'da_fare' CHECK (status IN ('da_fare','svolta','convertito','perso')),
  notes TEXT NOT NULL DEFAULT '',
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'lezione' CHECK (kind IN ('lezione','consulenza','visita')),
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 5 AND 600),
  mode TEXT NOT NULL DEFAULT 'live' CHECK (mode IN ('live','online')),
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'programmata' CHECK (status IN ('programmata','svolta','saltata','annullata')),
  notes TEXT NOT NULL DEFAULT '',
  gcal_event_id TEXT,
  gcal_status TEXT NOT NULL DEFAULT 'off',
  gcal_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_start ON sessions(starts_at);
CREATE INDEX idx_sessions_client ON sessions(client_id);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'da_inviare' CHECK (status IN ('da_inviare','inviato','ignorato')),
  dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT UNIQUE,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_activity_ts ON activity(ts);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Stato temporaneo OAuth (protezione CSRF del flusso Google)
CREATE TABLE oauth_state (
  state TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  drive_folder_id TEXT,
  rows INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
