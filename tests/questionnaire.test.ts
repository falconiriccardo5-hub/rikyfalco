import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTIONNAIRES, hasOptions, isBlank, legacyQuestions, missingRequired, newQuestionId, templateOfKind } from '../src/lib/questionnaire';

describe('questionari delle visite', () => {
  it('Anamnesi e Check originali diventano un Benvenuto e un Check In', () => {
    expect(DEFAULT_QUESTIONNAIRES.map((q) => [q.id, q.kind])).toEqual([['builtin-anamnesi', 'benvenuto'], ['builtin-check', 'check_in']]);
    expect(templateOfKind('benvenuto')).toBe('anamnesi');
    expect(templateOfKind('check_in')).toBe('check');
  });

  it('le domande convertite sono valide per il backend (id unici, scelte con almeno 2 risposte, niente campi calcolati)', () => {
    for (const d of DEFAULT_QUESTIONNAIRES) {
      const ids = d.questions.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const q of d.questions) {
        expect(q.id).toMatch(/^[a-z0-9_]{1,55}$/);
        expect(q.label.length).toBeGreaterThan(0);
        expect(q.label.length).toBeLessThanOrEqual(300);
        expect(['text', 'single', 'multi', 'number', 'scale', 'date']).toContain(q.type);
        if (hasOptions(q.type)) expect(q.options!.length).toBeGreaterThanOrEqual(2);
      }
      expect(ids).not.toContain('mg'); // MG, MM, Kcal sono calcolati: non si salvano
    }
  });

  it('gli id dei moduli originali restano gli stessi: le risposte già salvate si vedono ancora', () => {
    const ids = legacyQuestions('anamnesi').map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining(['nascita', 'obiettivo', 'allergie']));
    expect(legacyQuestions('check').map((q) => q.id)).toEqual(expect.arrayContaining(['peso', 'bf']));
  });

  it('gli approfondimenti generici prendono il nome della domanda a cui si riferiscono', () => {
    const q = legacyQuestions('anamnesi').find((x) => x.id === 'allergie_dett')!;
    expect(q.label).toMatch(/allergie.*dettagli/i);
  });

  it('id nuovi validi e diversi tra loro', () => {
    const ids = Array.from({ length: 200 }, newQuestionId);
    expect(new Set(ids).size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9_]{1,55}$/);
  });

  it('domande obbligatorie senza risposta', () => {
    const qs = [
      { id: 'a', label: 'A', type: 'text' as const, required: true },
      { id: 'b', label: 'B', type: 'multi' as const, options: ['x', 'y'], required: true },
      { id: 'c', label: 'C', type: 'text' as const },
    ];
    expect(missingRequired(qs, { a: '  ', b: [] }).map((q) => q.id)).toEqual(['a', 'b']);
    expect(missingRequired(qs, { a: 'ok', b: ['x'] })).toEqual([]);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('0')).toBe(false);
  });
});
