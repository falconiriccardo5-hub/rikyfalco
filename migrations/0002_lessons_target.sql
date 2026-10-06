-- Numero di lezioni previste nel percorso (N), impostato dall'allenatore. 0 = non impostato.
ALTER TABLE clients ADD COLUMN lessons_target INTEGER NOT NULL DEFAULT 0 CHECK (lessons_target BETWEEN 0 AND 1000);
