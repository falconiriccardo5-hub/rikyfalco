import { db, getImpostazioni } from './db.js';
import { addGiorni, calcolaFine, diffGiorni, oggi, toIso, toDate } from './dates.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Divide l'importo in N rate (l'ultima assorbe l'arrotondamento) e distribuisce
 *  le scadenze in modo uniforme sulla durata del percorso. */
export function pianoRate({ importo_totale, num_rate, data_inizio, durata_giorni, data_pagamento }) {
  const n = Math.max(1, Number(num_rate) || 1);
  const base = round2(Number(importo_totale) / n);
  const rate = [];
  for (let i = 0; i < n; i++) {
    const ultimo = i === n - 1;
    const importo = ultimo ? round2(Number(importo_totale) - base * (n - 1)) : base;
    const scadenza = i === 0
      ? (data_pagamento || data_inizio)
      : addGiorni(data_inizio, Math.round((durata_giorni * i) / n));
    rate.push({ numero: i + 1, scadenza, importo });
  }
  return rate;
}

export const listaClienti = () => db.prepare(`
  SELECT c.*,
         (SELECT COUNT(*) FROM percorsi p WHERE p.cliente_id = c.id) AS percorsi_totali,
         (SELECT p.id FROM percorsi p WHERE p.cliente_id = c.id AND p.stato = 'attivo'
           ORDER BY p.data_fine DESC LIMIT 1) AS percorso_attivo_id
    FROM clienti c ORDER BY c.cognome, c.nome`).all();

export function getCliente(id) {
  const cliente = db.prepare('SELECT * FROM clienti WHERE id = ?').get(id);
  if (!cliente) return null;
  const percorsi = db.prepare('SELECT * FROM percorsi WHERE cliente_id = ? ORDER BY data_inizio DESC').all(id);
  for (const p of percorsi) p.rate = db.prepare('SELECT * FROM rate WHERE percorso_id = ? ORDER BY numero').all(p.id);
  const log_email = db.prepare('SELECT * FROM email_log WHERE cliente_id = ? ORDER BY id DESC LIMIT 20').all(id);
  return { ...cliente, percorsi, log_email };
}

const CAMPI_CLIENTE = ['nome', 'cognome', 'email', 'telefono', 'codice_fiscale', 'data_nascita', 'scadenza_certificato', 'obiettivo', 'note'];

export function creaCliente(body) {
  if (!body.nome || !body.cognome || !body.email) throw new Error('Nome, cognome ed email sono obbligatori');
  const vals = CAMPI_CLIENTE.map((k) => body[k] ?? null);
  const info = db.prepare(
    `INSERT INTO clienti (${CAMPI_CLIENTE.join(', ')}) VALUES (${CAMPI_CLIENTE.map(() => '?').join(', ')})`
  ).run(...vals);
  return getCliente(Number(info.lastInsertRowid));
}

export function aggiornaCliente(id, body) {
  const campi = CAMPI_CLIENTE.filter((k) => k in body);
  if (!campi.length) return getCliente(id);
  db.prepare(`UPDATE clienti SET ${campi.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
    .run(...campi.map((k) => body[k] ?? null), id);
  return getCliente(id);
}

export function eliminaCliente(id) {
  db.prepare('DELETE FROM clienti WHERE id = ?').run(id);
}

export function creaPercorso(body) {
  const cliente = db.prepare('SELECT * FROM clienti WHERE id = ?').get(body.cliente_id);
  if (!cliente) throw new Error('Cliente inesistente');
  const data_inizio = body.data_inizio || oggi();
  const data_fine = calcolaFine(data_inizio, body.tipo, body.durata_giorni);
  const durata_giorni = diffGiorni(data_inizio, data_fine);
  const importo = Number(body.importo_totale);
  if (!(importo >= 0)) throw new Error('Importo non valido');
  const num_rate = Math.max(1, Number(body.num_rate) || 1);
  const impostazioni = getImpostazioni();

  const info = db.prepare(`
    INSERT INTO percorsi (cliente_id, tipo, durata_giorni, data_inizio, data_fine, importo_totale, num_rate,
                          metodo_pagamento, data_pagamento, stato, promemoria_attivo, giorni_preavviso, rinnovo_di, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'attivo', ?, ?, ?, ?)`).run(
    cliente.id, body.tipo, durata_giorni, data_inizio, data_fine, importo, num_rate,
    body.metodo_pagamento ?? null, body.data_pagamento ?? null,
    body.promemoria_attivo === false ? 0 : 1,
    Number(body.giorni_preavviso) || Number(impostazioni.giorni_preavviso) || 30,
    body.rinnovo_di ?? null, body.note ?? null
  );
  const percorsoId = Number(info.lastInsertRowid);

  const rate = pianoRate({ importo_totale: importo, num_rate, data_inizio, durata_giorni, data_pagamento: body.data_pagamento });
  const ins = db.prepare('INSERT INTO rate (percorso_id, numero, scadenza, importo, pagata, data_pagamento, metodo) VALUES (?, ?, ?, ?, ?, ?, ?)');
  // Se e' stato registrato un incasso all'apertura, la prima rata risulta gia' saldata.
  const primaPagata = Boolean(body.data_pagamento) && body.prima_rata_pagata !== false;
  for (const r of rate) {
    const pagata = primaPagata && r.numero === 1;
    ins.run(percorsoId, r.numero, r.scadenza, r.importo, pagata ? 1 : 0,
      pagata ? body.data_pagamento : null, pagata ? (body.metodo_pagamento ?? null) : null);
  }
  return getPercorso(percorsoId);
}

export function getPercorso(id) {
  const p = db.prepare(`
    SELECT p.*, c.nome, c.cognome, c.email
      FROM percorsi p JOIN clienti c ON c.id = p.cliente_id WHERE p.id = ?`).get(id);
  if (!p) return null;
  p.rate = db.prepare('SELECT * FROM rate WHERE percorso_id = ? ORDER BY numero').all(id);
  p.incassato = round2(p.rate.filter((r) => r.pagata).reduce((s, r) => s + r.importo, 0));
  p.residuo = round2(p.importo_totale - p.incassato);
  p.giorni_rimanenti = diffGiorni(oggi(), p.data_fine);
  return p;
}

export function aggiornaPercorso(id, body) {
  const attuale = db.prepare('SELECT * FROM percorsi WHERE id = ?').get(id);
  if (!attuale) throw new Error('Percorso inesistente');
  const campi = ['stato', 'metodo_pagamento', 'data_pagamento', 'promemoria_attivo', 'giorni_preavviso', 'note']
    .filter((k) => k in body);
  if (campi.length) {
    db.prepare(`UPDATE percorsi SET ${campi.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...campi.map((k) => (typeof body[k] === 'boolean' ? (body[k] ? 1 : 0) : body[k] ?? null)), id);
  }
  return getPercorso(id);
}

export function eliminaPercorso(id) {
  db.prepare('DELETE FROM percorsi WHERE id = ?').run(id);
}

export function pagaRata(id, body = {}) {
  const rata = db.prepare('SELECT * FROM rate WHERE id = ?').get(id);
  if (!rata) throw new Error('Rata inesistente');
  const pagata = body.pagata === false ? 0 : 1;
  db.prepare('UPDATE rate SET pagata = ?, data_pagamento = ?, metodo = ?, importo = ? WHERE id = ?').run(
    pagata,
    pagata ? (body.data_pagamento || oggi()) : null,
    pagata ? (body.metodo ?? rata.metodo ?? null) : null,
    body.importo != null ? Number(body.importo) : rata.importo,
    id
  );
  return getPercorso(rata.percorso_id);
}

/** Percorsi attivi che finiscono entro `giorni` giorni. */
export function inScadenza(giorni = 30) {
  const limite = addGiorni(oggi(), giorni);
  const rows = db.prepare(`
    SELECT p.*, c.nome, c.cognome, c.email
      FROM percorsi p JOIN clienti c ON c.id = p.cliente_id
     WHERE p.stato = 'attivo' AND p.data_fine BETWEEN ? AND ?
     ORDER BY p.data_fine`).all(oggi(), limite);
  return rows.map((p) => ({
    ...p,
    giorni_rimanenti: diffGiorni(oggi(), p.data_fine),
    promemoria_inviato: Boolean(p.promemoria_inviato_il),
  }));
}

export function dashboard() {
  const imp = getImpostazioni();
  const mese = oggi().slice(0, 7);
  const anno = oggi().slice(0, 4);
  const incassato = (periodo) => round2(db.prepare(
    "SELECT COALESCE(SUM(importo), 0) AS t FROM rate WHERE pagata = 1 AND substr(data_pagamento, 1, ?) = ?"
  ).get(periodo.length, periodo).t);

  const meseScorso = (() => { const d = toDate(`${mese}-01`); d.setUTCMonth(d.getUTCMonth() - 1); return toIso(d).slice(0, 7); })();
  const clientiAttivi = db.prepare("SELECT COUNT(DISTINCT cliente_id) AS n FROM percorsi WHERE stato = 'attivo'").get().n;
  const clientiTotali = db.prepare('SELECT COUNT(*) AS n FROM clienti').get().n;
  const rateAperte = db.prepare(`
    SELECT r.*, p.cliente_id, c.nome, c.cognome
      FROM rate r JOIN percorsi p ON p.id = r.percorso_id JOIN clienti c ON c.id = p.cliente_id
     WHERE r.pagata = 0 AND p.stato = 'attivo' ORDER BY r.scadenza LIMIT 8`).all();
  const scadenze = inScadenza(Number(imp.giorni_preavviso) || 30);

  return {
    pt_nome: imp.pt_nome,
    incassato_mese: incassato(mese),
    incassato_mese_scorso: incassato(meseScorso),
    incassato_anno: incassato(anno),
    obiettivo_annuo: Number(imp.obiettivo_annuo) || 0,
    clienti_attivi: clientiAttivi,
    clienti_totali: clientiTotali,
    da_incassare: round2(rateAperte.reduce((s, r) => s + r.importo, 0)),
    rate_aperte: rateAperte,
    in_scadenza: scadenze,
    incassi_mensili: incassiMensili(Number(anno)),
  };
}

export function incassiMensili(anno) {
  const rows = db.prepare(`
    SELECT substr(data_pagamento, 1, 7) AS mese, SUM(importo) AS totale
      FROM rate WHERE pagata = 1 AND substr(data_pagamento, 1, 4) = ?
     GROUP BY mese ORDER BY mese`).all(String(anno));
  const mappa = Object.fromEntries(rows.map((r) => [r.mese, round2(r.totale)]));
  return Array.from({ length: 12 }, (_, i) => {
    const mese = `${anno}-${String(i + 1).padStart(2, '0')}`;
    return { mese, totale: mappa[mese] || 0 };
  });
}

export function contabilita(anno = Number(oggi().slice(0, 4))) {
  const imp = getImpostazioni();
  const movimenti = db.prepare(`
    SELECT r.id, r.data_pagamento, r.importo, r.metodo, r.numero, p.num_rate, p.tipo, p.id AS percorso_id,
           c.id AS cliente_id, c.nome, c.cognome
      FROM rate r JOIN percorsi p ON p.id = r.percorso_id JOIN clienti c ON c.id = p.cliente_id
     WHERE r.pagata = 1 AND substr(r.data_pagamento, 1, 4) = ?
     ORDER BY r.data_pagamento DESC, r.id DESC`).all(String(anno));
  const aperte = db.prepare(`
    SELECT r.*, p.tipo, p.num_rate, c.id AS cliente_id, c.nome, c.cognome
      FROM rate r JOIN percorsi p ON p.id = r.percorso_id JOIN clienti c ON c.id = p.cliente_id
     WHERE r.pagata = 0 AND p.stato = 'attivo' ORDER BY r.scadenza`).all();
  const mix = db.prepare(`
    SELECT tipo, COUNT(*) AS n FROM percorsi GROUP BY tipo ORDER BY n DESC`).all();
  const totale = round2(movimenti.reduce((s, m) => s + m.importo, 0));
  const coeff = Number(imp.coefficiente_redditivita) || 0;
  return {
    anno,
    totale_incassato: totale,
    imponibile: round2(totale * coeff / 100),
    regime: imp.regime_fiscale,
    coefficiente: coeff,
    obiettivo_annuo: Number(imp.obiettivo_annuo) || 0,
    movimenti,
    rate_aperte: aperte,
    da_incassare: round2(aperte.reduce((s, r) => s + r.importo, 0)),
    mix,
    incassi_mensili: incassiMensili(anno),
    valore_medio_percorso: round2(db.prepare('SELECT COALESCE(AVG(importo_totale), 0) AS m FROM percorsi').get().m),
  };
}
