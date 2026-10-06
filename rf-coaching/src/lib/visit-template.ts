import modello from "./modello-visita.json";
import type { Tone } from "./format";

// Modello visita: struttura del foglio "Visita" (Anamnesi iniziale + Check da duplicare).
// Fonte unica: modello-visita.json, generato da scripts/build_modello_visita.py.

export type VisitKind = "iniziale" | "check";
export type FillerRole = "cliente" | "coach";
export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "multiselect" | "score" | "computed";

export type VisitField = {
  id: string;
  label: string;
  type: FieldType;
  who: FillerRole;
  options?: string[];
  notes?: boolean; // colonna "Note aggiuntive" del foglio
  detailOf?: string; // "Approfondisci domanda precedente"
  hint?: string;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  low?: string; // significato del voto 1
  high?: string; // significato del voto 5
  formula?: string;
};

export type VisitSection = { id: string; title: string; who: FillerRole; fields: VisitField[]; radar?: string[] };
export type VisitTemplate = {
  name: string;
  version: number;
  intervalDays: number;
  kinds: Record<VisitKind, { title: string; sections: VisitSection[] }>;
};

export type AnswerValue = string | number | string[] | null;
export type Answer = { value?: AnswerValue; note?: string };
export type VisitAnswers = Record<string, Answer>;

export const MODELLO_VISITA = modello as VisitTemplate;
export const VISIT_KIND_LABEL: Record<VisitKind, string> = { iniziale: "Visita iniziale", check: "Check" };

export function sectionsFor(kind: VisitKind, template: VisitTemplate = MODELLO_VISITA) {
  return template.kinds[kind].sections;
}

export function fieldsFor(kind: VisitKind, who?: FillerRole, template: VisitTemplate = MODELLO_VISITA) {
  return sectionsFor(kind, template).flatMap((s) => s.fields).filter((f) => !who || f.who === who);
}

const num = (v: AnswerValue | undefined) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
};

// Valuta formule semplici del modello (+ - * / e parentesi su id di campo). Niente eval.
export function evalFormula(formula: string, lookup: (id: string) => number | null): number | null {
  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const expr = (): number | null => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[i++];
      const r = term();
      v = v === null || r === null ? null : op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = (): number | null => {
    let v = factor();
    while (peek() === "*" || peek() === "/") {
      const op = tokens[i++];
      const r = factor();
      v = v === null || r === null || (op === "/" && r === 0) ? null : op === "*" ? v * r : v / r;
    }
    return v;
  };
  const factor = (): number | null => {
    const t = tokens[i++];
    if (t === "(") {
      const v = expr();
      i++; // ")"
      return v;
    }
    if (t === "-") {
      const v = factor();
      return v === null ? null : -v;
    }
    if (t !== undefined && /^\d/.test(t)) return Number(t);
    return t === undefined ? null : lookup(t);
  };
  const v = expr();
  return v === null ? null : Math.round(v * 100) / 100;
}

// Restituisce le risposte con i campi calcolati aggiornati (MG, MM, Kcal, Kcal/kg, totali).
export function withComputed(kind: VisitKind, answers: VisitAnswers, template: VisitTemplate = MODELLO_VISITA) {
  const out: VisitAnswers = { ...answers };
  const computed = fieldsFor(kind, undefined, template).filter((f) => f.type === "computed" && f.formula);
  // Più passate: una formula può dipendere da un'altra (kcal_kg ← kcal, mm ← mg).
  for (let pass = 0; pass < computed.length; pass++) {
    for (const f of computed) out[f.id] = { value: evalFormula(f.formula!, (id) => num(out[id]?.value)) };
  }
  return out;
}

export function radarFor(kind: VisitKind, answers: VisitAnswers, template: VisitTemplate = MODELLO_VISITA) {
  const section = sectionsFor(kind, template).find((s) => s.radar?.length);
  if (!section) return [];
  return section.radar!.map((id) => {
    const f = section.fields.find((x) => x.id === id)!;
    return { id, label: f.label, value: num(answers[id]?.value) };
  });
}

// Tiene solo le risposte ai campi consentiti per chi compila (il cliente non può scrivere i campi del coach).
export function pickAnswers(kind: VisitKind, answers: VisitAnswers, who: FillerRole, template: VisitTemplate = MODELLO_VISITA) {
  const allowed = new Set(fieldsFor(kind, who, template).filter((f) => f.type !== "computed").map((f) => f.id));
  return Object.fromEntries(Object.entries(answers).filter(([k]) => allowed.has(k))) as VisitAnswers;
}

export function progress(kind: VisitKind, answers: VisitAnswers, who?: FillerRole, template: VisitTemplate = MODELLO_VISITA) {
  const fields = fieldsFor(kind, who, template).filter((f) => f.type !== "computed" && !f.detailOf);
  const filled = fields.filter((f) => {
    const v = answers[f.id]?.value;
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  return { filled, total: fields.length };
}

export const VISIT_STATE: Record<string, { label: string; tone: Tone }> = {
  aperta: { label: "Modulo aperto", tone: "blue" }, mai_fatta: { label: "Nessuna visita", tone: "muted" },
  scaduta: { label: "Check scaduto", tone: "red" }, in_scadenza: { label: "Check in scadenza", tone: "amber" },
  in_regola: { label: "In regola", tone: "green" },
};
export const VISIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  da_compilare: { label: "In attesa del cliente", tone: "blue" }, compilata_cliente: { label: "Da completare", tone: "violet" },
  completata: { label: "Completata", tone: "green" },
};
