import { db, getImpostazioni } from './db.js';
import { diffGiorni, formatIt, oggi } from './dates.js';
import { inviaEmail } from './mailer.js';

const DURATE = { '3m': '3 mesi', '6m': '6 mesi', '12m': '12 mesi' };
export const descrizioneDurata = (p) => DURATE[p.tipo] || `${p.durata_giorni} giorni`;

export function componiEmail(percorso) {
  const imp = getImpostazioni();
  const valori = {
    nome: percorso.nome,
    cognome: percorso.cognome,
    durata: descrizioneDurata(percorso),
    data_fine: formatIt(percorso.data_fine),
    data_inizio: formatIt(percorso.data_inizio),
    giorni_rimanenti: String(diffGiorni(oggi(), percorso.data_fine)),
    pt_nome: imp.pt_nome,
  };
  const sostituisci = (t) => String(t).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => valori[k] ?? '');
  return { oggetto: sostituisci(imp.email_oggetto), corpo: sostituisci(imp.email_template) };
}

/** Invia il promemoria di rinnovo per un percorso e lo registra nel log. */
export async function inviaPromemoria(percorsoId, { forza = false } = {}) {
  const p = db.prepare(`
    SELECT p.*, c.nome, c.cognome, c.email
      FROM percorsi p JOIN clienti c ON c.id = p.cliente_id WHERE p.id = ?`).get(percorsoId);
  if (!p) throw new Error('Percorso inesistente');
  if (!forza && p.promemoria_inviato_il) {
    return { saltato: true, motivo: `Promemoria gia' inviato il ${p.promemoria_inviato_il}` };
  }
  const { oggetto, corpo } = componiEmail(p);
  const esito = await inviaEmail({ a: p.email, oggetto, corpo });
  db.prepare(`INSERT INTO email_log (percorso_id, cliente_id, tipo, destinatario, oggetto, corpo, stato, dettaglio)
              VALUES (?, ?, 'rinnovo', ?, ?, ?, ?, ?)`)
    .run(p.id, p.cliente_id, p.email, oggetto, corpo, esito.stato, esito.dettaglio);
  if (esito.stato !== 'errore') {
    db.prepare('UPDATE percorsi SET promemoria_inviato_il = ? WHERE id = ?').run(oggi(), p.id);
  }
  return { saltato: false, cliente: `${p.nome} ${p.cognome}`, ...esito };
}

/** Job giornaliero: tutti i percorsi attivi entro la soglia di preavviso e senza
 *  promemoria gia' inviato. */
export async function eseguiJobPromemoria() {
  const candidati = db.prepare(`
    SELECT p.id, p.data_fine, p.giorni_preavviso
      FROM percorsi p
     WHERE p.stato = 'attivo' AND p.promemoria_attivo = 1 AND p.promemoria_inviato_il IS NULL
       AND p.data_fine >= date('now')
       AND julianday(p.data_fine) - julianday('now') <= p.giorni_preavviso`).all();
  const esiti = [];
  for (const c of candidati) esiti.push({ percorso_id: c.id, ...(await inviaPromemoria(c.id)) });
  return { eseguito_il: new Date().toISOString(), inviati: esiti.length, esiti };
}
