// Compleanni dei clienti: dalla data di nascita alle ricorrenze in un intervallo di date.

export interface BirthdayClient { id: string; first_name: string; last_name: string; birth_date: string | null; phone?: string; archived_at?: string | null }
export interface Birthday { client_id: string; name: string; phone: string; date: string; birth_date: string; age: number }

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Compleanni che cadono tra `from` e `to` (inclusi, 'YYYY-MM-DD'). Chi è nato il 29 febbraio festeggia il 28 negli anni non bisestili. */
export function birthdaysInRange(clients: BirthdayClient[], from: string, to: string): Birthday[] {
  const out: Birthday[] = [];
  const y0 = Number(from.slice(0, 4)), y1 = Number(to.slice(0, 4));
  for (const c of clients) {
    if (!c.birth_date || c.archived_at) continue;
    const [by, bm, bd] = c.birth_date.split('-').map(Number);
    if (!by || !bm || !bd) continue;
    for (let y = y0; y <= y1; y++) {
      const day = bm === 2 && bd === 29 && !isLeap(y) ? 28 : bd;
      const date = `${y}-${String(bm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (date < from || date > to || y <= by) continue; // y <= by: non prima della nascita (e non il giorno stesso della nascita)
      out.push({ client_id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), phone: c.phone ?? '', date, birth_date: c.birth_date, age: y - by });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
