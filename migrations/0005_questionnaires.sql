-- Questionari personalizzabili per le visite. Tipologia: 'benvenuto' (prima visita) o 'check_in' (visite di controllo).
-- `questions` è un array JSON [{ id, label, type, options?, required? }] (vedi src/lib/questionnaire.ts).
CREATE TABLE questionnaires (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('benvenuto','check_in')),
  active INTEGER NOT NULL DEFAULT 1,
  questions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Ogni visita compilata conserva una copia del titolo e delle domande: modificare il questionario dopo
-- non cambia le visite già fatte. Le visite vecchie (senza copia) usano i moduli originali.
ALTER TABLE visit_forms ADD COLUMN questionnaire_id TEXT;
ALTER TABLE visit_forms ADD COLUMN title TEXT;
ALTER TABLE visit_forms ADD COLUMN questions TEXT;
