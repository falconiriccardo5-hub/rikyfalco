-- Misure del cliente (pliche e circonferenze) rilevate in una data scelta dal coach.
-- `skinfolds` = { tricipite: [m1, m2, m3], ... } in mm; `girths` = { vita: 64, ... } in cm (vedi src/lib/measures.ts).
-- Somma pliche, % massa grassa, massa grassa e magra non si salvano: si calcolano sempre dai valori misurati.
CREATE TABLE measurements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,      -- 'YYYY-MM-DD'
  age INTEGER,
  weight_kg REAL,
  skinfolds TEXT NOT NULL DEFAULT '{}',
  girths TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_measurements_client ON measurements (client_id, measured_at);
