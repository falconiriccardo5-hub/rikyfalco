import { describe, expect, it } from 'vitest';
import { addDays, addMinutesLocal, addMonths, daysBetween } from '../worker/time';
import { currentMonth, type ClientRow } from '../worker/domain';

describe('date', () => {
  it('addMonths gestisce fine mese', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
  });
  it('addDays / daysBetween', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-09-20', '2026-10-01')).toBe(11);
  });
  it('addMinutesLocal', () => expect(addMinutesLocal('2026-10-02T23:30', 60)).toBe('2026-10-03T00:30'));
  it('mese corrente del percorso', () => {
    const c = { start_date: '2026-01-15', program_months: 12 } as ClientRow;
    expect(currentMonth(c, '2026-10-01')).toBe(9);
    expect(currentMonth(c, '2026-01-15')).toBe(1);
    expect(currentMonth(c, '2030-01-01')).toBe(12);
  });
});
