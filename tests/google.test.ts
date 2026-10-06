import { describe, expect, it } from 'vitest';
import { toRomeLocal } from '../worker/google';

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
