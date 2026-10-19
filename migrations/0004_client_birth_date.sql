-- Data di nascita del cliente ('YYYY-MM-DD', facoltativa): serve a mostrare i compleanni nel calendario.
ALTER TABLE clients ADD COLUMN birth_date TEXT CHECK (birth_date IS NULL OR birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
