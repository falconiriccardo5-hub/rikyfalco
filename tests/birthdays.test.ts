import { describe, expect, it } from 'vitest';
import { birthdaysInRange } from '../worker/birthdays';

const c = (id: string, birth_date: string | null, extra: object = {}) => ({ id, first_name: id, last_name: 'Rossi', birth_date, archived_at: null, ...extra });

describe('compleanni dei clienti', () => {
  it('trova i compleanni nell\'intervallo con l\'età', () => {
    const r = birthdaysInRange([c('Anna', '1990-10-21'), c('Luca', '1985-03-02')], '2026-10-18', '2026-10-24');
    expect(r).toEqual([{ client_id: 'Anna', name: 'Anna Rossi', phone: '', date: '2026-10-21', birth_date: '1990-10-21', age: 36 }]);
  });

  it('include gli estremi e funziona a cavallo d\'anno', () => {
    const r = birthdaysInRange([c('A', '2000-12-31'), c('B', '1999-01-01'), c('C', '1999-06-15')], '2026-12-31', '2027-01-01');
    expect(r.map((x) => [x.name, x.date, x.age])).toEqual([['A Rossi', '2026-12-31', 26], ['B Rossi', '2027-01-01', 28]]);
  });

  it('il 29 febbraio si festeggia il 28 negli anni non bisestili', () => {
    const b = [c('Bis', '2000-02-29')];
    expect(birthdaysInRange(b, '2027-02-01', '2027-03-01')[0].date).toBe('2027-02-28');
    expect(birthdaysInRange(b, '2028-02-01', '2028-03-01')[0].date).toBe('2028-02-29');
  });

  it('ignora clienti archiviati, senza data e nati dopo la data richiesta', () => {
    const r = birthdaysInRange([c('Arch', '1990-10-21', { archived_at: '2026-01-01' }), c('Senza', null), c('Futuro', '2030-10-21')], '2026-10-18', '2026-10-24');
    expect(r).toEqual([]);
  });

  it('più anni nello stesso intervallo, in ordine di data', () => {
    const r = birthdaysInRange([c('A', '1990-05-10')], '2026-01-01', '2027-12-31');
    expect(r.map((x) => x.date)).toEqual(['2026-05-10', '2027-05-10']);
  });
});
