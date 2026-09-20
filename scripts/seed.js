// Popola il database con dati di esempio (utile per provare l'app).
import '../src/env.js';
import { db } from '../src/db.js';
import * as M from '../src/model.js';
import { addGiorni, addMesi, oggi } from '../src/dates.js';

db.exec('DELETE FROM email_log; DELETE FROM rate; DELETE FROM percorsi; DELETE FROM clienti;');

const CLIENTI = [
  { nome: 'Marco', cognome: 'Bianchi', email: 'marco.bianchi@example.it', telefono: '+39 340 118 2244', obiettivo: 'Ricomposizione corporea', tipo: '6m', importo: 540, rate: 3, inizioMesi: -5 },
  { nome: 'Giulia', cognome: 'Verdi', email: 'giulia.verdi@example.it', telefono: '+39 347 552 1190', obiettivo: 'Preparazione gara', tipo: '3m', importo: 270, rate: 1, inizioMesi: -2 },
  { nome: 'Luca', cognome: 'Ferri', email: 'luca.ferri@example.it', telefono: '+39 333 909 4471', obiettivo: 'Forza e mobilita', tipo: 'custom', giorni: 90, importo: 600, rate: 3, inizioMesi: -2 },
  { nome: 'Sara', cognome: 'Neri', email: 'sara.neri@example.it', telefono: '+39 328 771 0023', obiettivo: 'Dimagrimento', tipo: '12m', importo: 1080, rate: 6, inizioMesi: -6 },
  { nome: 'Anna', cognome: 'Ricci', email: 'anna.ricci@example.it', telefono: '+39 345 220 8812', obiettivo: 'Rieducazione posturale', tipo: '3m', importo: 450, rate: 1, inizioMesi: -1 },
];

for (const c of CLIENTI) {
  const cliente = M.creaCliente(c);
  const inizio = addMesi(oggi(), c.inizioMesi);
  const percorso = M.creaPercorso({
    cliente_id: cliente.id, tipo: c.tipo, durata_giorni: c.giorni,
    data_inizio: inizio, importo_totale: c.importo, num_rate: c.rate,
    metodo_pagamento: 'Bonifico', data_pagamento: inizio,
  });
  // Segna come saldate le rate gia' scadute.
  for (const r of percorso.rate) {
    if (!r.pagata && r.scadenza <= oggi()) M.pagaRata(r.id, { pagata: true, data_pagamento: r.scadenza, metodo: 'Bonifico' });
  }
}

// Un percorso concluso l'anno scorso, per lo storico.
const storico = M.creaCliente({ nome: 'Davide', cognome: 'Poli', email: 'davide.poli@example.it', obiettivo: 'Massa muscolare' });
const p = M.creaPercorso({
  cliente_id: storico.id, tipo: '6m', data_inizio: addGiorni(oggi(), -400),
  importo_totale: 540, num_rate: 3, metodo_pagamento: 'Contanti', data_pagamento: addGiorni(oggi(), -400),
});
for (const r of p.rate) M.pagaRata(r.id, { pagata: true, data_pagamento: r.scadenza, metodo: 'Contanti' });
M.aggiornaPercorso(p.id, { stato: 'concluso' });

console.log(`Seed completato: ${CLIENTI.length + 1} clienti.`);
