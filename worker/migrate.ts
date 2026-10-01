// Applica da solo le migrazioni del database all'avvio del Worker.
// Così un aggiornamento pubblicato da GitHub (o un database nuovo, dopo un disastro)
// ha subito lo schema giusto, senza dover lanciare wrangler da un computer.
// Usa la stessa tabella `d1_migrations` di `wrangler d1 migrations apply`: i due metodi convivono.

export interface Migration { name: string; sql: string }

/** Divide un file SQL in singole istruzioni (gestisce commenti, stringhe e trigger BEGIN…END). */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  let depth = 0; // blocchi BEGIN…END dei trigger
  const word = (w: string) => sql.slice(i, i + w.length).toUpperCase() === w
    && !/[A-Za-z0-9_]/.test(sql[i - 1] ?? ' ') && !/[A-Za-z0-9_]/.test(sql[i + w.length] ?? ' ');
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') { // commento di riga
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') { // commento di blocco
      const end = sql.indexOf('*/', i + 2);
      i = end < 0 ? sql.length : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { // stringa o identificatore tra virgolette
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) { if (sql[j + 1] === ch) { j += 2; continue; } break; }
        j++;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (word('BEGIN') && /\bCREATE\b[\s\S]*\bTRIGGER\b/i.test(cur)) depth++;
    else if (word('END') && depth > 0) depth--;
    if (ch === ';' && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS d1_migrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

/** Applica, in ordine, le migrazioni non ancora registrate. Ognuna è atomica (batch D1). */
export async function applyMigrations(db: D1Database, migrations: Migration[]): Promise<string[]> {
  await db.prepare(CREATE_TABLE).run();
  const done = new Set(((await db.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()).results ?? []).map((r) => r.name));
  const applied: string[] = [];
  for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(m.name)) continue;
    const stmts = splitSql(m.sql).map((s) => db.prepare(s));
    stmts.push(db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(m.name));
    try {
      await db.batch(stmts);
    } catch (e) {
      // Un'altra richiesta potrebbe averla appena applicata: in quel caso va bene così
      const again = await db.prepare('SELECT 1 FROM d1_migrations WHERE name = ?').bind(m.name).first();
      if (!again) throw new Error(`Migrazione ${m.name} non riuscita: ${(e as Error).message}`);
      continue;
    }
    applied.push(m.name);
  }
  return applied;
}

let ready: Promise<unknown> | null = null;

/** Da chiamare all'inizio di ogni richiesta/cron: lavora davvero solo una volta per istanza. */
export function ensureMigrated(db: D1Database, migrations: Migration[]): Promise<unknown> {
  if (!ready) {
    ready = applyMigrations(db, migrations).then((names) => {
      if (names.length) console.log('Migrazioni applicate:', names.join(', '));
    }).catch((e) => { ready = null; throw e; });
  }
  return ready;
}
