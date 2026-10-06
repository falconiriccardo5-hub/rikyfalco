// Elenco delle migrazioni incluse nel Worker (vedi migrate.ts).
// Quando aggiungi un file in migrations/, aggiungilo anche qui: un test controlla che non manchi nulla.
import type { Migration } from './migrate';
import m0001 from '../migrations/0001_init.sql';

export const MIGRATIONS: Migration[] = [
  { name: '0001_init.sql', sql: m0001 },
];
