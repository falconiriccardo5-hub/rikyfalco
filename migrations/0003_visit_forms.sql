-- Moduli compilati durante le visite (anamnesi iniziale o check di controllo), uno per visita.
-- Le risposte sono un oggetto JSON { idDomanda: risposta }; le domande sono definite in src/lib/visitForm.ts.
CREATE TABLE visit_forms (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  template TEXT NOT NULL CHECK (template IN ('anamnesi','check')),
  visit_date TEXT NOT NULL,       -- 'YYYY-MM-DD'
  answers TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_visit_forms_client ON visit_forms (client_id, visit_date);
CREATE INDEX idx_visit_forms_lead ON visit_forms (lead_id, visit_date);
