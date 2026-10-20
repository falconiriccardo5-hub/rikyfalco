import { describe, expect, it } from 'vitest';
import { ageAt, compute, mean, parseNum, skinfoldSum } from '../src/lib/measures';

// Visite reali del foglio originale: [tri, sub, sopra, addom, coscia, età, peso, %MG, MG kg, MM kg]
const SHEET: [number[], number, number, number, number, number][] = [
  [[20, 15, 10, 15, 25], 18, 59, 22.90, 13.51, 45.49],
  [[10.67, 9.33, 9.33, 15.33, 20], 18, 60, 18.41, 11.05, 48.95],
  [[20, 12, 7.33, 12, 25], 18, 60.3, 21.03, 12.68, 47.62],
  [[15, 10, 5, 10, 20], 18, 58.5, 17.34, 10.14, 48.36],
  [[16.33, 10, 5, 10, 17], 19, 56.4, 17.01, 9.59, 46.81],
  [[10, 8, 3, 6, 14.67], 19, 52, 13.02, 6.77, 45.23],
  [[8, 7, 3, 7, 13], 19, 53, 12.12, 6.42, 46.58],
  [[15, 10, 7, 13, 18], 18, 55.5, 18.03, 10.01, 45.49],
];
const keys = ['tricipite', 'sottoscapolare', 'soprailiaca', 'addominale', 'coscia'];

describe('misure', () => {
  it('riproduce % massa grassa, massa grassa e magra del foglio originale', () => {
    for (const [sf, age, weight, pct, fat, lean] of SHEET) {
      const c = compute({ age, weight_kg: weight, skinfolds: Object.fromEntries(keys.map((k, i) => [k, [sf[i]]])) });
      expect(c.pct).toBeCloseTo(pct, 1);
      expect(Math.abs(c.pct! - pct)).toBeLessThan(0.03);
      expect(Math.abs(c.fatKg! - fat)).toBeLessThan(0.05);
      expect(Math.abs(c.leanKg! - lean)).toBeLessThan(0.05);
    }
  });
  it('media delle rilevazioni compilate e somma delle 5 pliche', () => {
    expect(mean([12, 10, 10])).toBe(10.67);
    expect(mean([null, null, null])).toBeNull();
    expect(skinfoldSum(Object.fromEntries(keys.map((k) => [k, [10, 10, 10]])))).toBe(50);
    expect(skinfoldSum({ tricipite: [10] })).toBeNull();
  });
  it('senza età o pliche complete non calcola nulla', () => {
    expect(compute({ age: null, weight_kg: 60, skinfolds: Object.fromEntries(keys.map((k) => [k, [10]])) }).pct).toBeNull();
  });
  it('età alla data e lettura dei numeri', () => {
    expect(ageAt('2006-11-20', '2025-11-19')).toBe(18);
    expect(ageAt('2006-11-20', '2025-11-20')).toBe(19);
    expect(ageAt(null, '2025-11-20')).toBeNull();
    expect(parseNum('67,5')).toBe(67.5);
    expect(parseNum('67-72')).toBeNull();
  });
});
