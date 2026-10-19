// Questionari delle visite: tipi, conversione dei due moduli originali (Anamnesi e Check) e piccoli helper.
// Non dipende da React né dal browser: lo usano sia l'app sia il Worker.
import { ANAMNESI, CHECK, type Answers, type Question as LegacyQuestion, type Template } from './visitForm';

export type QType = 'text' | 'single' | 'multi' | 'number' | 'scale' | 'date';
export type QKind = 'benvenuto' | 'check_in';
export interface Q { id: string; label: string; type: QType; options?: string[]; required?: boolean; unit?: string }
export interface Questionnaire { id: string; name: string; kind: QKind; active: boolean; questions: Q[]; created_at: string; updated_at: string }

export const KIND_LABEL: Record<QKind, string> = { benvenuto: 'Benvenuto', check_in: 'Check In' };
export const KIND_HINT: Record<QKind, string> = {
  benvenuto: 'Prima visita: conoscenza, storia e punto di partenza.',
  check_in: 'Visite di controllo: peso, misure, progressi.',
};
export const TYPE_LABEL: Record<QType, string> = {
  text: 'Risposta aperta', single: 'Scelta singola', multi: 'Scelta multipla', number: 'Numero', scale: 'Scala 1–5', date: 'Data',
};
export const hasOptions = (t: QType) => t === 'single' || t === 'multi';

/** id nuovo per una domanda: stabile, valido per il backend (/^[a-z0-9_]{1,60}$/) */
export const newQuestionId = () => 'q' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/** Risposte che contano ai fini dell'obbligatorietà. */
export const isBlank = (v: Answers[string] | undefined) => v === undefined || (Array.isArray(v) ? v.length === 0 : !v.trim());

/** Domande obbligatorie senza risposta. */
export const missingRequired = (questions: Q[], a: Answers) => questions.filter((q) => q.required && isBlank(a[q.id]));

/** Conversione di un modulo originale in un elenco semplice di domande. I campi calcolati (MG, MM, Kcal…) si omettono. */
export function flattenTemplate(t: Template): Q[] {
  const out: Q[] = [];
  let lastMain = '';
  for (const s of t.sections) for (const lq of s.questions as LegacyQuestion[]) {
    if (lq.type === 'calc') continue;
    if (!lq.follow) lastMain = lq.label;
    // gli approfondimenti con titolo generico prendono il nome della domanda a cui si riferiscono
    const generic = lq.follow && /^approfondisci/i.test(lq.label);
    const label = generic ? `${lastMain} · dettagli` : lq.label;
    const q: Q = { id: lq.id, label, type: lq.type === 'choice' ? 'single' : lq.type === 'multi' ? 'multi' : lq.type === 'long' || lq.type === 'text' ? 'text' : lq.type };
    if (lq.options) q.options = [...lq.options];
    if (lq.unit) q.unit = lq.unit;
    out.push(q);
  }
  return out;
}

export const DEFAULT_QUESTIONNAIRES: { id: string; name: string; kind: QKind; questions: Q[] }[] = [
  { id: 'builtin-anamnesi', name: ANAMNESI.label, kind: 'benvenuto', questions: flattenTemplate(ANAMNESI) },
  { id: 'builtin-check', name: CHECK.label, kind: 'check_in', questions: flattenTemplate(CHECK) },
];

/** Domande di una visita salvata prima dei questionari personalizzabili. */
export const legacyQuestions = (template: 'anamnesi' | 'check'): Q[] => (template === 'anamnesi' ? DEFAULT_QUESTIONNAIRES[0] : DEFAULT_QUESTIONNAIRES[1]).questions;
export const legacyTitle = (template: 'anamnesi' | 'check') => (template === 'anamnesi' ? ANAMNESI : CHECK).label;

/** Nel database `template` resta 'anamnesi' | 'check' (vincolo della tabella originale). */
export const templateOfKind = (k: QKind): 'anamnesi' | 'check' => (k === 'benvenuto' ? 'anamnesi' : 'check');
