// Misure del cliente: pliche (3 rilevazioni per sito) e circonferenze, con i valori calcolati.
// Formula della % massa grassa ricavata dalle visite del foglio di lavoro originale (somma delle 5 pliche + età):
// densità corporea quadratica nella somma, poi equazione di Siri. Riproduce i valori del foglio entro 0,01 punti.

export const SKINFOLDS = [
  { key: 'tricipite', label: 'Tricipitale' },
  { key: 'sottoscapolare', label: 'Sotto scapolare' },
  { key: 'soprailiaca', label: 'Soprailiaca' },
  { key: 'addominale', label: 'Addominale' },
  { key: 'coscia', label: 'Coscia' },
] as const;

export const GIRTHS = [
  { key: 'spalle', label: 'Spalle' }, { key: 'torace', label: 'Torace' }, { key: 'vita', label: 'Vita' }, { key: 'fianchi', label: 'Fianchi' },
  { key: 'braccio_sx', label: 'Braccio sx' }, { key: 'braccio_dx', label: 'Braccio dx' },
  { key: 'coscia_sx', label: 'Coscia sx' }, { key: 'coscia_dx', label: 'Coscia dx' },
  { key: 'polpaccio_sx', label: 'Polpaccio sx' }, { key: 'polpaccio_dx', label: 'Polpaccio dx' },
  { key: 'ombelico', label: 'Ombelico' },
] as const;

export const SKINFOLD_KEYS: string[] = SKINFOLDS.map((s) => s.key);
export const GIRTH_KEYS: string[] = GIRTHS.map((g) => g.key);

export type Num = number | null;
export interface MeasureData {
  measured_at: string; age: Num; weight_kg: Num;
  skinfolds: Record<string, Num[]>; girths: Record<string, Num>;
}
export interface Computed { sum: Num; pct: Num; fatKg: Num; leanKg: Num }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Media delle rilevazioni compilate (null se non ce n'è nessuna) */
export function mean(readings: Num[] | undefined): Num {
  const v = (readings ?? []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Somma delle medie delle 5 pliche (null se ne manca qualcuna) */
export function skinfoldSum(sf: Record<string, Num[]>): Num {
  const m = SKINFOLDS.map((s) => mean(sf[s.key]));
  return m.some((x) => x === null) ? null : r2((m as number[]).reduce((a, b) => a + b, 0));
}

export function bodyFatPct(sum: Num, age: Num): Num {
  if (sum === null || age === null) return null;
  const density = 1.09715285 - 0.000657566 * sum + 0.00000109733316 * sum * sum - 0.000136576 * age;
  return r2(495 / density - 450);
}

export function compute(m: Pick<MeasureData, 'age' | 'weight_kg' | 'skinfolds'>): Computed {
  const sum = skinfoldSum(m.skinfolds);
  const pct = bodyFatPct(sum, m.age);
  const w = m.weight_kg;
  const fatKg = pct !== null && w !== null ? r2((w * pct) / 100) : null;
  return { sum, pct, fatKg, leanKg: fatKg !== null && w !== null ? r2(w - fatKg) : null };
}

/** Età compiuta alla data della misurazione */
export function ageAt(birth: string | null | undefined, date: string): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  let a = Number(date.slice(0, 4)) - Number(birth.slice(0, 4));
  if (date.slice(5) < birth.slice(5)) a--;
  return a >= 0 && a < 120 ? a : null;
}

/** Accetta virgola o punto; testo non numerico (es. "67-72") → null */
export function parseNum(s: string): Num {
  const t = s.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n < 1000 ? n : null;
}

export interface Metric { key: string; label: string; unit: string; get: (m: MeasureData, c: Computed) => Num }
export const METRICS: Metric[] = [
  { key: 'peso', label: 'Peso', unit: 'kg', get: (m) => m.weight_kg },
  { key: 'pct', label: '% massa grassa', unit: '%', get: (_, c) => c.pct },
  { key: 'fatKg', label: 'Massa grassa', unit: 'kg', get: (_, c) => c.fatKg },
  { key: 'leanKg', label: 'Massa magra', unit: 'kg', get: (_, c) => c.leanKg },
  { key: 'sum', label: 'Somma pliche', unit: 'mm', get: (_, c) => c.sum },
  ...SKINFOLDS.map((s): Metric => ({ key: `sf_${s.key}`, label: `Plica ${s.label.toLowerCase()}`, unit: 'mm', get: (m) => mean(m.skinfolds[s.key]) })),
  ...GIRTHS.map((g): Metric => ({ key: `g_${g.key}`, label: g.label, unit: 'cm', get: (m) => m.girths[g.key] ?? null })),
];
const M = (...keys: string[]) => keys.map((k) => METRICS.find((x) => x.key === k)!);
export const CHART_GROUPS: { title: string; metrics: Metric[] }[] = [
  { title: 'Peso', metrics: M('peso') },
  { title: '% massa grassa', metrics: M('pct') },
  { title: 'Massa grassa e massa magra', metrics: M('fatKg', 'leanKg') },
  { title: 'Somma pliche', metrics: M('sum') },
  { title: 'Pliche', metrics: M(...SKINFOLDS.map((s) => `sf_${s.key}`)) },
  { title: 'Circonferenze tronco', metrics: M('g_spalle', 'g_torace', 'g_vita', 'g_fianchi', 'g_ombelico') },
  { title: 'Braccia', metrics: M('g_braccio_sx', 'g_braccio_dx') },
  { title: 'Gambe', metrics: M('g_coscia_sx', 'g_coscia_dx', 'g_polpaccio_sx', 'g_polpaccio_dx') },
];
