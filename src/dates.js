// Utilita' sulle date: tutto viaggia in formato ISO "YYYY-MM-DD".

export const oggi = () => new Date().toISOString().slice(0, 10);

export function toDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const toIso = (date) => date.toISOString().slice(0, 10);

export function addGiorni(iso, giorni) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + giorni);
  return toIso(d);
}

export function addMesi(iso, mesi) {
  const d = toDate(iso);
  const giorno = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + mesi);
  // Se il giorno non esiste nel mese di arrivo (es. 31 gennaio + 1 mese) si usa l'ultimo giorno utile.
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(giorno, ultimo));
  return toIso(d);
}

export function diffGiorni(daIso, aIso) {
  return Math.round((toDate(aIso) - toDate(daIso)) / 86400000);
}

// Durata del percorso: "3m" | "6m" | "12m" | "custom" (con giorni espliciti).
export function calcolaFine(dataInizio, tipo, giorniCustom) {
  if (tipo === 'custom') {
    const giorni = Number(giorniCustom);
    if (!Number.isInteger(giorni) || giorni < 1) throw new Error('Giorni percorso non validi');
    return addGiorni(dataInizio, giorni);
  }
  const mesi = { '3m': 3, '6m': 6, '12m': 12 }[tipo];
  if (!mesi) throw new Error('Tipo percorso non valido');
  return addMesi(dataInizio, mesi);
}

export function formatIt(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
