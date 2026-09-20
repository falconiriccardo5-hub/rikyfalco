// Carica le variabili da file .env senza dipendenze: prima quelle gia' presenti
// nell'ambiente, poi FITMANAGER_CONFIG, poi il file .env del progetto.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function carica(file) {
  if (!file || !existsSync(file)) return;
  for (const riga of readFileSync(file, 'utf8').split('\n')) {
    const pulita = riga.trim();
    if (!pulita || pulita.startsWith('#')) continue;
    const separatore = pulita.indexOf('=');
    if (separatore < 1) continue;
    const chiave = pulita.slice(0, separatore).trim();
    let valore = pulita.slice(separatore + 1).trim();
    if ((valore.startsWith('"') && valore.endsWith('"')) || (valore.startsWith("'") && valore.endsWith("'"))) {
      valore = valore.slice(1, -1);
    }
    // Le variabili gia' impostate (es. dal LaunchAgent) hanno la precedenza.
    if (process.env[chiave] === undefined && valore !== '') process.env[chiave] = valore;
  }
}

carica(process.env.FITMANAGER_CONFIG);
carica(resolve(process.cwd(), '.env'));
