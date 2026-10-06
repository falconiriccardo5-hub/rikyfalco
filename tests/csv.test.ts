import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../worker/csv';

describe('CSV backup', () => {
  it('round-trip conserva valori, NULL, stringhe vuote, virgolette e a capo', () => {
    const rows = [
      { id: 'a', name: 'Rossi, Mario', note: 'riga 1\nriga "2"', phone: '+39 333', empty: '', nul: null, n: 120 },
      { id: 'b', name: '=SOMMA(A1)', note: '@cmd', phone: '-5 euro', empty: '', nul: null, n: -5 },
    ];
    const cols = Object.keys(rows[0]);
    const { columns, rows: back } = parseCsv(toCsv(cols, rows));
    expect(columns).toEqual(cols);
    expect(back).toEqual(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === null ? null : String(v)]))));
  });

  it('neutralizza le formule nel file (CSV injection)', () => {
    const csv = toCsv(['x'], [{ x: '=HYPERLINK("http://evil")' }]);
    expect(csv).toContain("'=HYPERLINK");
  });

  it('inizia con BOM per Excel', () => {
    expect(toCsv(['a'], []).charCodeAt(0)).toBe(0xfeff);
  });
});
