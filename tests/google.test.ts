import { describe, expect, it } from 'vitest';
import { googleEventBody, parseRowId, toRomeLocal } from '../worker/google';

describe('toRomeLocal', () => {
  it('converte un orario con fuso in ora di Roma', () => {
    expect(toRomeLocal({ dateTime: '2026-10-06T08:30:00Z' })).toBe('2026-10-06T10:30');
    expect(toRomeLocal({ dateTime: '2026-12-01T18:00:00+01:00' })).toBe('2026-12-01T18:00');
    expect(toRomeLocal({ dateTime: '2026-07-01T09:00:00-04:00' })).toBe('2026-07-01T15:00');
  });
  it('gestisce gli eventi di giornata intera', () => {
    expect(toRomeLocal({ date: '2026-10-06' })).toBe('2026-10-06T00:00');
  });
  it('restituisce null per dati mancanti o non validi', () => {
    expect(toRomeLocal(undefined)).toBeNull();
    expect(toRomeLocal({ dateTime: 'boh' })).toBeNull();
  });
});

describe('googleEventBody', () => {
  const base = { summary: ' Dentista ', location: 'Via Roma 1' };
  it('evento con orario: fuso di Roma e campi di giornata intera azzerati', () => {
    const b = googleEventBody({ ...base, all_day: false, start: '2026-10-19T14:00', end: '2026-10-19T15:00' });
    expect(b.summary).toBe('Dentista');
    expect(b.start).toEqual({ dateTime: '2026-10-19T14:00:00', timeZone: 'Europe/Rome', date: null });
    expect(b.end).toEqual({ dateTime: '2026-10-19T15:00:00', timeZone: 'Europe/Rome', date: null });
  });
  it('giornata intera: la fine inclusa diventa la data esclusiva di Google', () => {
    const b = googleEventBody({ ...base, all_day: true, start: '2026-10-19T00:00', end: '2026-10-21T00:00' });
    expect(b.start).toEqual({ date: '2026-10-19', dateTime: null, timeZone: null });
    expect(b.end).toEqual({ date: '2026-10-22', dateTime: null, timeZone: null });
  });
  it('titolo vuoto → (senza titolo)', () => {
    expect(googleEventBody({ ...base, summary: '  ', all_day: false, start: '2026-10-19T14:00', end: '2026-10-19T15:00' }).summary).toBe('(senza titolo)');
  });
  it('rifiuta intervalli invertiti', () => {
    expect(() => googleEventBody({ ...base, all_day: false, start: '2026-10-19T15:00', end: '2026-10-19T14:00' })).toThrow();
    expect(() => googleEventBody({ ...base, all_day: true, start: '2026-10-20T00:00', end: '2026-10-19T00:00' })).toThrow();
  });
});

describe('parseRowId', () => {
  it('accetta solo copie del calendario principale o di RF Coaching', () => {
    expect(parseRowId('primary:abc_20261019T120000Z')).toEqual({ calendar: 'primary', eventId: 'abc_20261019T120000Z' });
    expect(parseRowId('app:xyz')).toEqual({ calendar: 'app', eventId: 'xyz' });
    expect(parseRowId('ical:xyz')).toBeNull();
    expect(parseRowId('xyz')).toBeNull();
  });
});
