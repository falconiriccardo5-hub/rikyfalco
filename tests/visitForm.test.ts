import { describe, expect, it } from 'vitest';
import { ANAMNESI, CHECK, isVisible, progress, TEMPLATES } from '../src/lib/visitForm';

const find = (id: string) => {
  for (const t of [ANAMNESI, CHECK]) for (const s of t.sections) { const i = s.questions.findIndex((q) => q.id === id); if (i >= 0) return { s, i, q: s.questions[i] }; }
  throw new Error(id);
};

describe('modulo visita', () => {
  it('id delle domande unici e validi per il backend', () => {
    for (const t of Object.values(TEMPLATES)) {
      const ids = t.sections.flatMap((s) => s.questions.map((q) => q.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9_]{1,55}$/);
    }
  });

  it('gli approfondimenti compaiono solo quando servono', () => {
    const { s, i } = find('ormoni_dett');
    expect(isVisible(s, i, {})).toBe(false);
    expect(isVisible(s, i, { ormoni: 'No' })).toBe(false);
    expect(isVisible(s, i, { ormoni: 'Si' })).toBe(true);
    const c = find('protocollo_causa');
    expect(isVisible(c.s, c.i, { protocollo: 'Bene' })).toBe(false);
    expect(isVisible(c.s, c.i, { protocollo: 'Male' })).toBe(true);
    const d = find('sonno_8h_dett');
    expect(isVisible(d.s, d.i, { sonno_8h: 'No' })).toBe(true);
    // una risposta già data resta sempre visibile
    expect(isVisible(s, i, { ormoni_dett: 'Mini pillola' })).toBe(true);
  });

  it('calcola MG, MM, kcal e totali come nel foglio', () => {
    const a = { peso: '60', bf: '25', cho: '200', prot: '120', fat: '50' };
    expect(find('mg').q.calc!(a)).toBe(15);
    expect(find('mm').q.calc!(a)).toBe(45);
    expect(find('kcal').q.calc!(a)).toBe(200 * 4 + 120 * 4 + 50 * 9);
    expect(find('kcal_kg').q.calc!(a)).toBeCloseTo(1730 / 60);
    expect(find('dati_totale_1').q.calc!({ dato_condizione: '4', dato_wc: '3' })).toBe(7);
    expect(find('dati_totale_1').q.calc!({})).toBeNull();
    expect(find('mg').q.calc!({ peso: '60,5', bf: '' })).toBeNull();
  });

  it('conta le risposte', () => {
    const p = progress(CHECK, { protocollo: 'Bene', peso: '70', integrazione: ['Creatina'] });
    expect(p.done).toBe(3);
    expect(p.total).toBeGreaterThan(40);
  });
});
