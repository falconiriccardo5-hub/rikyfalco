// Domande del modulo visita, trascritte dal foglio Google "Visita" di Riccardo:
// "Anamnesi iniziale" per la prima visita, "Check da duplicare" per ogni visita di controllo.
// Gli id sono le chiavi salvate nel DB: non rinominarli, altrimenti le risposte già date non si vedono più.

export type TemplateId = 'anamnesi' | 'check';
export type Answers = Record<string, string | string[]>;

export type Question = {
  id: string;
  label: string;
  type: 'choice' | 'multi' | 'text' | 'long' | 'number' | 'date' | 'scale' | 'calc';
  options?: readonly string[];
  /** unità mostrata accanto ai numeri */
  unit?: string;
  /** spiegazione della scala o della domanda */
  hint?: string;
  /** domanda di approfondimento: compare quando la precedente ha una risposta (o una di `when`) */
  follow?: boolean;
  when?: readonly string[];
  /** campi calcolati in automatico */
  calc?: (a: Answers) => number | null;
};
export type Section = { title: string; questions: Question[]; notice?: string };
export type Template = { id: TemplateId; label: string; short: string; description: string; sections: Section[] };

const SI_NO = ['Si', 'No'] as const;
const INTEGRATORI = ['Proteine in polvere', 'Creatina', 'EAA', 'Berberina', 'Probiotico', 'Magnesio', 'Ashwagandha', 'Melatonina', 'Zinco', 'Omega 3', 'Psillo', 'Multivitaminico', 'Vitamina C'] as const;
const FASI = ['Dimagrimento', 'Aumento peso', 'Ricomposizione corporea', 'Studio TDEE'] as const;
const METODOLOGIE = ['Taglio lineare', 'ON-OFF', '2 Refeed', '3 Refeed', 'Bifasica', 'Trifasica', 'Risalita lineare'] as const;
const MUSCOLI = ['Gambe', 'Parte alta', 'Polpacci', 'Glutei', 'Ischio crurali', 'Quadricipiti', 'Addominali', 'Dorsali', 'Bicipiti', 'Tricipiti', 'Spalle', 'Petto'] as const;
const PASTI_EXTRA = ['1', '2', '3', '4', '>5'] as const;
const ASSE = ['Intraruotato', 'Extraruotato', 'In asse'] as const;
const APPOGGIO = ['Piatto tutto', 'Appoggio più esterno', 'Appoggio più interno', 'Conca elevata', 'Normale'] as const;
const CAVIGLIA = ["Collassa verso l'interno", "Collassa verso l'esterno", 'In asse'] as const;

export const num = (v: unknown): number | null => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const sum = (a: Answers, ids: string[]) => {
  const vals = ids.map((id) => num(a[id]));
  return vals.every((v) => v === null) ? null : vals.reduce<number>((s, v) => s + (v ?? 0), 0);
};
const mg = (a: Answers) => { const p = num(a.peso), bf = num(a.bf); return p !== null && bf !== null ? (bf * p) / 100 : null; };
const kcal = (a: Answers) => sum(a, ['cho', 'prot']) === null && num(a.fat) === null ? null : (num(a.cho) ?? 0) * 4 + (num(a.prot) ?? 0) * 4 + (num(a.fat) ?? 0) * 9;

const q = (id: string, label: string, type: Question['type'], more: Partial<Question> = {}): Question => ({ id, label, type, ...more });
const siNo = (id: string, label: string, more: Partial<Question> = {}) => q(id, label, 'choice', { options: SI_NO, ...more });
const approfondisci = (id: string, label = 'Approfondisci la domanda precedente', more: Partial<Question> = {}) => q(id, label, 'long', { follow: true, ...more });

const composizione = (): Question[] => [
  q('peso', 'Peso', 'number', { unit: 'kg' }),
  q('bf', 'BF %', 'number', { unit: '%' }),
  q('mg', 'MG (massa grassa)', 'calc', { unit: 'kg', calc: mg }),
  q('mm', 'MM (massa magra)', 'calc', { unit: 'kg', calc: (a) => { const g = mg(a), p = num(a.peso); return g !== null && p !== null ? p - g : null; } }),
];
const macro = (): Question[] => [
  q('cho', 'CHO (carboidrati)', 'number', { unit: 'g' }),
  q('prot', 'Proteine', 'number', { unit: 'g' }),
  q('fat', 'Grassi', 'number', { unit: 'g' }),
  q('kcal', 'Kcal', 'calc', { unit: 'kcal', calc: kcal }),
  q('kcal_kg', 'Kcal/kg', 'calc', { calc: (a) => { const k = kcal(a), p = num(a.peso); return k !== null && p ? k / p : null; }, hint: 'Usa il peso inserito in questa visita' }),
  q('fase', 'Fase attuale', 'choice', { options: FASI }),
  q('metodologia', 'Metodologia', 'choice', { options: METODOLOGIE }),
];
const areaPersonale = (): Section => ({
  title: 'Area personale (voto 1-5)',
  questions: [
    q('voto_adesione', 'Adesione al piano 🫡', 'scale', { hint: '1 adesione scarsa · 5 massima' }),
    q('voto_costanza', 'Costanza 📈', 'scale', { hint: '1 non costante · 5 costante' }),
    q('voto_performance', 'Performance 🏋🏻‍♀️', 'scale', { hint: '1 scarsa · 5 ottima' }),
    q('voto_condizione', 'Condizione 🍑', 'scale', { hint: '1 nessun risultato · 3 miglioramento visibile dai dati · 5 miglioramento visibile a occhio nudo' }),
    q('voto_infortuni', 'Problemi/infortuni 🏥', 'scale', { hint: '1 infortunio presente · 3 leggero fastidio · 5 nessun infortunio' }),
    q('voto_stress', 'Stress 🧠', 'scale', { hint: '1 tanto · 5 assente' }),
    q('note_persona', 'Note/appunti personali sulla persona 💬', 'long'),
  ],
});
const obiettivi = (): Section => ({
  title: 'Obiettivi e piano d’azione',
  questions: [
    q('primi_obiettivi', '🎯 Primi obiettivi', 'long'),
    q('note_lavoro', '📌 Note', 'long'),
    q('piano_azione', '🔸 Piano di azione', 'long'),
  ],
});

export const ANAMNESI: Template = {
  id: 'anamnesi', label: 'Anamnesi iniziale', short: 'Anamnesi',
  description: 'Prima visita: storia, salute, stile di vita, postura e piano di partenza.',
  sections: [
    { title: 'Dati personali', questions: [
      q('nascita', 'Data di nascita', 'date'),
      q('genere', 'Genere', 'choice', { options: ['Femminile', 'Maschile', 'Non identificato'] }),
    ] },
    { title: 'Anamnesi', questions: [
      q('conoscenza', 'Come sei venut* a conoscenza del mio studio?', 'multi', { options: ['Social network', 'Amici', 'Google', 'Sito web', 'Altro'] }),
      approfondisci('conoscenza_dett', 'Approfondisci (nome amici o social di riferimento)'),
      q('obiettivo', 'Qual è il tuo obiettivo?', 'long'),
      siNo('alim_sana', 'Segui già un’alimentazione salutare?'),
      q('recall', 'Quali sono le tue abitudini alimentari giornaliere? (Recall 24)', 'long'),
      q('pasti_extra', 'Quante volte a settimana mangi pasti fuori dalla routine (alcol compreso)?', 'choice', { options: PASTI_EXTRA }),
      siNo('dopo_cena', 'Ti capita di mangiare degli alimenti anche dopo cena?'),
      siNo('dolci_sera', 'Ti capita di mangiare alimenti dolci dopo cena?'),
      siNo('frutta_verdura', 'Mangi frutta e verdura?'),
      approfondisci('frutta_verdura_dett', 'Approfondisci (es. esclusioni o altro)'),
      q('acqua', 'Quanta acqua bevi durante il giorno?', 'text'),
    ] },
    { title: 'Salute', questions: [
      siNo('allergie', 'Sono presenti allergie-intolleranze (certificate)?'), approfondisci('allergie_dett'),
      siNo('gonfiore', 'Problemi di gonfiore, reflusso, tosse o acidità?'), approfondisci('gonfiore_dett'),
      siNo('esami', 'Hai svolto degli esami del sangue nell’ultimo anno?'),
      siNo('esami_asterischi', 'Erano presenti valori con *?', { follow: true, when: ['Si'] }),
      q('esami_voci', 'Se sì, su quale voce?', 'multi', { options: ['Colesterolo', 'Trigliceridi', 'HDL', 'LDL', 'Glicemia', 'Vitamina D'], follow: true, when: ['Si'] }),
      q('esami_altro', 'Specifica altro', 'text', { follow: true }),
      siNo('chirurgia', 'Ti sei sottopost* a chirurgia estetica?'), approfondisci('chirurgia_dett', 'Se sì, cosa?', { when: ['Si'] }),
      siNo('patologie', 'Sono presenti patologie diagnosticate?'), approfondisci('patologie_dett'),
      siNo('amenorrea', 'Problematiche a livello di amenorrea?'),
      siNo('infortuni', 'Hai subito infortuni in passato?'), approfondisci('infortuni_dett'),
      siNo('sonno_8h', 'Riesci a dormire 8 ore a notte?'), approfondisci('sonno_8h_dett'),
      siNo('addormentarsi', 'Riesci ad addormentarti subito?'), approfondisci('addormentarsi_dett'),
      siNo('sonno_continuo', 'Riesci a mantenere il sonno durante la notte?'), approfondisci('sonno_continuo_dett'),
      siNo('dolore', 'Senti qualche tipologia di dolore nella vita quotidiana o in determinati esercizi?'), approfondisci('dolore_dett'),
      siNo('farmaci', 'Assumi farmaci?'), approfondisci('farmaci_dett'),
      siNo('ormoni', 'Assumi terapie ormonali?'),
      q('ormoni_dett', 'Quale terapia?', 'choice', { options: ['Pillola generale', 'Mini pillola', 'Pillola combinata'], follow: true, when: ['Si'] }),
      siNo('integratori', 'Assumi integratori?'),
      q('integratori_dett', 'Quali integratori?', 'multi', { options: [...INTEGRATORI, 'Enzimi', 'Altro'], follow: true, when: ['Si'] }),
      q('salute_altro', 'Altro', 'long'),
    ] },
    { title: 'Stile di vita', questions: [
      q('lavoro', 'Che lavoro svolgi?', 'choice', { options: ['Tante ore sedut*', 'A volte sedut* a volte in piedi', 'Sempre in piedi'] }),
      q('passi', 'Quanti passi fai al giorno?', 'choice', { options: ['0/5000', '7000/10000', '>10000'] }),
      siNo('pesi', 'Ti sei già allenatə in passato con i pesi?'),
      q('tipo_allenamento', 'Che tipologia di allenamento svolgevi?', 'choice', { options: ['Monofrequenza', 'Multifrequenza', 'Basso volume', 'Alto volume', 'Non sa'], follow: true, when: ['Si'] }),
      siNo('professionisti', 'Hai già avuto in passato percorsi con professionisti?'),
      q('professionista', 'Se sì, con quale professionista?', 'choice', { options: ['Personal trainer', 'Nutrizionista', 'Personal trainer + nutrizione'], follow: true, when: ['Si'] }),
      q('allenamenti_sett', 'Quanti allenamenti a settimana puoi sostenere?', 'choice', { options: ['1', '2', '3', '4', '5', '6', '7', '1 + 1 PT', '2 + 1 PT', '3 + 1 PT', '1 + 2 PT', '2 + 2 PT', '3 + 2 PT'] }),
      q('stile_note', 'Note aggiuntive', 'long'),
    ] },
    { title: 'Check iniziale', questions: composizione() },
    { title: 'Osservazioni personali', questions: [
      q('piede_appoggio_dx', 'Appoggio del piede dx', 'choice', { options: APPOGGIO }),
      q('piede_appoggio_sx', 'Appoggio del piede sx', 'choice', { options: APPOGGIO }),
      q('piede_pos_dx', 'Posizione del piede dx', 'choice', { options: ASSE }),
      q('piede_pos_sx', 'Posizione del piede sx', 'choice', { options: ASSE }),
      q('caviglia_dx', 'Caviglia dx', 'choice', { options: CAVIGLIA }),
      q('caviglia_sx', 'Caviglia sx', 'choice', { options: CAVIGLIA }),
      q('ginocchio_dx', 'Ginocchio dx', 'choice', { options: ASSE }),
      q('ginocchio_sx', 'Ginocchio sx', 'choice', { options: ASSE }),
      q('bacino', 'Bacino', 'choice', { options: ['Switch verso sx', 'Switch verso dx', 'In asse', 'Ruota in senso orario', 'Ruota in senso antiorario'] }),
      q('glutei', 'Glutei', 'multi', { options: ['Sx più piccolo del dx', 'Dx più piccolo del sx', 'Gluteo forma a pera', 'Gluteo forma a mela', 'Cuscinetto gluteo basso', 'Cellulite importante', 'Infiammazione'] }),
      q('trapezio_dx', 'Trapezio dx', 'choice', { options: ['Normale', 'Ipertono'] }),
      q('trapezio_sx', 'Trapezio sx', 'choice', { options: ['Normale', 'Ipertono'] }),
      q('osservazioni_note', 'Note aggiuntive', 'long'),
    ] },
    { title: 'Piano iniziale', questions: macro() },
    { title: 'Appunti personali', questions: [
      q('obiettivo_iniziale', 'Quale sarà l’obiettivo iniziale?', 'choice', { options: [...FASI, 'Rinforzo muscolare', 'Risolvere un problema'] }),
      approfondisci('obiettivo_iniziale_dett'),
      siNo('integratori_consigliati', 'Ho consigliato integratori?'),
      q('integratori_quali', 'Se sì, quali integratori?', 'multi', { options: INTEGRATORI, follow: true, when: ['Si'] }),
      q('obiettivo_mesociclo', 'Quale sarà l’obiettivo del prossimo mesociclo?', 'long'),
    ] },
    areaPersonale(),
    { ...obiettivi(), notice: 'Dire al cliente di entrare nella chat di CoachPlus appena iscritto.' },
  ],
};

export const CHECK: Template = {
  id: 'check', label: 'Check di controllo', short: 'Check',
  description: 'Da ripetere a ogni visita: aderenza, allenamento, dati, macro e valutazione.',
  sections: [
    { title: 'Check/Monitoraggio', questions: [
      q('eta', 'Età', 'number', { unit: 'anni' }),
      ...composizione().slice(0, 1),
      q('split', 'Split', 'text'),
      ...composizione().slice(1),
      q('patologie_check', 'Patologie', 'multi', { options: ['Intolleranza al glutine', 'Intolleranza al lattosio', 'Celiachia', 'Favismo', 'Ipertensione', 'PCOS', 'GERD', 'Gastrite', 'Nessuna'] }),
      q('terapia', 'Terapia farmacologica', 'choice', { options: ['No', 'Pillola contraccettiva', 'Pillola combinata', 'Mini pillola', 'Diuretico', 'Nessuna'] }),
      q('integrazione', 'Integrazione assunta', 'multi', { options: [...INTEGRATORI, 'Bromelina', 'Glutammina'] }),
    ] },
    { title: 'Aderenza', questions: [
      q('protocollo', 'Come è andato questo protocollo?', 'choice', { options: ['Bene', 'Insomma', 'Male'] }),
      q('protocollo_causa', 'Se “insomma” o “male” la causa è stata', 'multi', { options: ['Allenamento', 'Alimentazione', 'Costanza', 'Fattori terzi'], follow: true, when: ['Insomma', 'Male'] }),
      approfondisci('protocollo_dett'),
      q('piano_seguito', 'Hai seguito il piano di allenamento previsto per queste settimane?', 'choice', { options: ['Si', 'No', 'Parzialmente'] }),
      approfondisci('piano_seguito_dett'),
      q('consigli_alimentari', 'Hai trovato difficile seguire i consigli alimentari?', 'choice', { options: ['Si', 'No', 'Con qualche sgarro di troppo'] }),
      q('pasti_extra', 'Quanti pasti extra ti sei concessə durante la settimana?', 'choice', { options: PASTI_EXTRA }),
      approfondisci('pasti_extra_dett'),
      q('aderenza_note', 'Note aggiuntive', 'long'),
    ] },
    { title: 'Protocollo allenamento', questions: [
      q('allenamento_difficile', 'Hai trovato difficile seguire il protocollo di allenamento?', 'choice', { options: ['Si', 'No', 'A volte'] }),
      approfondisci('allenamento_difficile_dett'),
      q('muscolo_meno', 'Qual è il gruppo muscolare che ti piace allenare meno?', 'multi', { options: MUSCOLI }),
      q('muscolo_piu', 'Qual è il gruppo muscolare che ti piace allenare di più?', 'multi', { options: MUSCOLI }),
      q('esercizio_meno', 'Qual è l’esercizio della scheda attuale che ti piace meno?', 'text'),
      siNo('progredisci_meno', 'Riesci lo stesso a progredire?'),
      q('esercizio_piu', 'Qual è l’esercizio della scheda attuale che ti piace di più?', 'text'),
      siNo('progredisci_piu', 'Riesci a progredire?'),
      siNo('fastidio', 'C’è qualche movimento o esercizio che ti crea fastidio o dolore muscolare?'), approfondisci('fastidio_dett'),
      siNo('dolore_articolare', 'C’è qualche esercizio dove senti dolore articolare?'), approfondisci('dolore_articolare_dett'),
      siNo('stanchezza_mentale', 'C’è qualche esercizio che ti dà stanchezza mentale?'), approfondisci('stanchezza_mentale_dett'),
      q('allenamento_note', 'Note aggiuntive', 'long'),
    ] },
    { title: 'Dati', questions: [
      q('dato_condizione', 'Condizione', 'scale', { hint: '1 pessima · 5 ottima' }),
      q('dato_durezza', 'Durezza muscolare', 'scale', { hint: 'Se tiri i muscoli e ti tocchi: 1 molle · 5 duro' }),
      q('dato_wc', 'WC', 'scale', { hint: '1 non scaricato da qualche giorno · 3 scaricato ma non al 100% · 5 ottimo' }),
      q('dato_gonfiore', 'Sensazione di gonfiore generale o di addome', 'scale', { hint: '1 gonfio · 5 completamente sgonfio, molto dry' }),
      q('dati_totale_1', 'Totale condizione fisica', 'calc', { unit: '/ 20', calc: (a) => sum(a, ['dato_condizione', 'dato_durezza', 'dato_wc', 'dato_gonfiore']) }),
      q('dato_stress', 'Stress', 'scale', { hint: '1 tanto · 5 assente' }),
      q('dato_sonno', 'Qualità e quantità del sonno', 'scale', { hint: '1 poco · 5 tanto' }),
      q('dato_fame', 'Fame', 'scale', { hint: '1 tanta · 5 poca' }),
      q('dato_energia', 'Energia', 'scale', { hint: '1 a terra · 5 tanta' }),
      q('dati_totale_2', 'Totale benessere', 'calc', { unit: '/ 20', calc: (a) => sum(a, ['dato_stress', 'dato_sonno', 'dato_fame', 'dato_energia']) }),
      q('dati_note', 'Note aggiuntive', 'long'),
    ] },
    { title: 'Macro', questions: macro() },
    { title: 'Appunti personali', questions: [
      siNo('obiettivo_raggiunto', 'Abbiamo raggiunto l’obiettivo prefissato nel precedente mesociclo?'),
      approfondisci('obiettivo_raggiunto_dett'),
      siNo('integratori_consigliati', 'Ho consigliato integratori?'),
      q('integratori_quali', 'Se sì, quali integratori?', 'multi', { options: INTEGRATORI, follow: true, when: ['Si'] }),
      q('obiettivo_mesociclo', 'Quale sarà l’obiettivo del prossimo mesociclo?', 'long'),
    ] },
    areaPersonale(),
    obiettivi(),
  ],
};

export const TEMPLATES: Record<TemplateId, Template> = { anamnesi: ANAMNESI, check: CHECK };

export const isEmpty = (v: Answers[string] | undefined) => v === undefined || (Array.isArray(v) ? v.length === 0 : !v.trim());

/** Una domanda di approfondimento si mostra solo se la domanda principale (la precedente non-approfondimento) lo richiede. */
export function isVisible(section: Section, idx: number, a: Answers): boolean {
  const qn = section.questions[idx];
  if (!qn.follow) return true;
  if (!isEmpty(a[qn.id])) return true;
  let p = idx - 1;
  while (p >= 0 && section.questions[p].follow) p--;
  if (p < 0) return true;
  const parent = a[section.questions[p].id];
  if (isEmpty(parent)) return false;
  if (!qn.when) return true;
  const vals = Array.isArray(parent) ? parent : [parent];
  return vals.some((v) => qn.when!.includes(v));
}

export function fmtCalc(n: number | null) {
  if (n === null || !Number.isFinite(n)) return '—';
  return (Math.round(n * 10) / 10).toLocaleString('it-IT');
}

/** Risposta leggibile (per i suggerimenti "ultima volta"). */
export function answerText(v: Answers[string] | undefined) {
  if (v === undefined) return '';
  return Array.isArray(v) ? v.join(', ') : v;
}

/** Quante domande hanno una risposta (esclusi i campi calcolati), per l'avanzamento. */
export function progress(t: Template, a: Answers) {
  let done = 0, total = 0;
  for (const s of t.sections) s.questions.forEach((qn, i) => {
    if (qn.type === 'calc' || !isVisible(s, i, a)) return;
    total++;
    if (!isEmpty(a[qn.id])) done++;
  });
  return { done, total };
}
