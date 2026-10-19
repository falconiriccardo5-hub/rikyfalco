import { describe, expect, it } from 'vitest';
import { addMinutesToLocal, monthGrid, placeEvents, rangeTitle, segmentInDay, weekDays, weekStartOf } from '../src/lib/calendar';

describe('calendario: settimane e mesi', () => {
  it('la settimana parte dalla domenica, come nel Google Calendar', () => {
    expect(weekDays('2026-10-19')).toEqual(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);
    expect(weekStartOf('2026-10-18')).toBe('2026-10-18');
    expect(weekStartOf('2026-10-24')).toBe('2026-10-18');
    expect(weekStartOf('2026-10-19', 1)).toBe('2026-10-19'); // con inizio lunedì
  });

  it('la griglia del mese ha 5 o 6 settimane che coprono tutto il mese', () => {
    const oct = monthGrid('2026-10-19');
    expect(oct.length).toBe(5);
    expect(oct[0][0]).toBe('2026-09-27');
    expect(oct.at(-1)!.at(-1)).toBe('2026-10-31');
    const aug = monthGrid('2026-08-10');
    expect(aug.length).toBe(6);
    expect(aug.flat()).toContain('2026-08-31');
  });

  it('titolo come in Google Calendar', () => {
    expect(rangeTitle(weekDays('2026-10-19'))).toBe('Ottobre 2026');
    expect(rangeTitle(weekDays('2026-09-30'))).toBe('Set – ott 2026');
    expect(rangeTitle(weekDays('2026-12-30'))).toBe('Dic 2026 – gen 2027');
  });
});

describe('calendario: eventi', () => {
  it('un turno che finisce il giorno dopo si divide tra i due giorni', () => {
    expect(segmentInDay('2026-10-19', '2026-10-19T18:00', '2026-10-20T01:00')).toEqual({ start: 1080, end: 1440 });
    expect(segmentInDay('2026-10-20', '2026-10-19T18:00', '2026-10-20T01:00')).toEqual({ start: 0, end: 60 });
    expect(segmentInDay('2026-10-21', '2026-10-19T18:00', '2026-10-20T01:00')).toBeNull();
    expect(segmentInDay('2026-10-18', '2026-10-19T18:00', '2026-10-20T01:00')).toBeNull();
  });

  it('un evento che finisce a mezzanotte non compare nel giorno dopo', () => {
    expect(segmentInDay('2026-10-20', '2026-10-19T22:00', '2026-10-20T00:00')).toBeNull();
    expect(segmentInDay('2026-10-19', '2026-10-19T22:00', '2026-10-20T00:00')).toEqual({ start: 1320, end: 1440 });
  });

  it('somma minuti a una data-ora locale, anche oltre mezzanotte', () => {
    expect(addMinutesToLocal('2026-10-19T23:30', 60)).toBe('2026-10-20T00:30');
  });

  it("eventi sovrapposti vanno uno accanto all'altro, gli altri restano a tutta larghezza", () => {
    const r = placeEvents([
      { item: 'a', start: 600, end: 720 },
      { item: 'b', start: 660, end: 780 },
      { item: 'c', start: 900, end: 960 },
    ]);
    const by = Object.fromEntries(r.map((p) => [p.item, [p.lane, p.lanes]]));
    expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] });
  });

  it('un evento breve occupa comunque lo spazio minimo visibile', () => {
    const r = placeEvents([{ item: 'a', start: 600, end: 610 }, { item: 'b', start: 615, end: 660 }]);
    expect(r.map((p) => [p.item, p.lane, p.lanes])).toEqual([['a', 0, 2], ['b', 1, 2]]);
  });
});
