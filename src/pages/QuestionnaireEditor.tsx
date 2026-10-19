import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { Confirm, ErrorBox, Loading, useAction, useApi, useToast } from '../components/ui';
import { api } from '../lib/api';
import {
  hasOptions, KIND_HINT, KIND_LABEL, newQuestionId, TYPE_LABEL, type Q, type QKind, type QType, type Questionnaire,
} from '../lib/questionnaire';

const BACK = '/visits?tab=questionari';

/** Crea o modifica un questionario: scheda Impostazioni (nome, tipologia, attivo) e scheda Domande. */
export default function QuestionnaireEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { data, error } = useApi<Questionnaire>(isNew ? null : `/questionnaires/${id}`);
  if (error) return <ErrorBox error={error} />;
  if (!isNew && !data) return <Loading />;
  return <Editor key={id ?? 'new'} initial={data ?? null} />;
}

function Editor({ initial }: { initial: Questionnaire | null }) {
  const nav = useNavigate();
  const act = useAction();
  const toast = useToast();
  const [tab, setTab] = useState<'impostazioni' | 'domande'>('impostazioni');
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<QKind>(initial?.kind ?? 'benvenuto');
  const [active, setActive] = useState(initial?.active ?? true);
  const [questions, setQuestions] = useState<Q[]>(initial?.questions ?? []);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  useEffect(() => { if (focusId) { document.getElementById(`qb-${focusId}`)?.focus(); setFocusId(null); } }, [focusId, questions.length]);

  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };
  const setQ = (qid: string, patch: Partial<Q>) => { setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q))); setDirty(true); };
  const move = (i: number, d: -1 | 1) => setQuestions((qs) => { const j = i + d; if (j < 0 || j >= qs.length) return qs; const c = [...qs]; [c[i], c[j]] = [c[j], c[i]]; setDirty(true); return c; });
  const add = () => { const q: Q = { id: newQuestionId(), label: '', type: 'text' }; setQuestions((qs) => [...qs, q]); setFocusId(q.id); setDirty(true); };

  const save = async () => {
    if (!name.trim()) { setTab('impostazioni'); document.getElementById('qb-name')?.focus(); return; }
    const empty = questions.findIndex((q) => !q.label.trim());
    if (empty >= 0) { setTab('domande'); setFocusId(questions[empty].id); return; }
    const few = questions.find((q) => hasOptions(q.type) && (q.options ?? []).filter((o) => o.trim()).length < 2);
    if (few) { setTab('domande'); setFocusId(few.id); toast(`“${few.label.trim()}”: servono almeno 2 risposte`, true); return; }
    setBusy(true);
    const body = {
      name: name.trim(), kind, active,
      questions: questions.map((q) => ({
        id: q.id, label: q.label.trim(), type: q.type, required: !!q.required,
        ...(hasOptions(q.type) ? { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
        ...(q.unit ? { unit: q.unit } : {}),
      })),
    };
    const r = await act(() => (initial ? api.patch(`/questionnaires/${initial.id}`, body) : api.post('/questionnaires', body)), initial ? 'Questionario salvato' : 'Questionario creato');
    setBusy(false);
    if (r !== undefined) { setDirty(false); nav(BACK); }
  };
  const cancel = () => { if (!dirty || window.confirm('Uscire senza salvare le modifiche?')) nav(BACK); };

  return (
    <div className="minimal-page qb">
      <div className="mp-head fade-in">
        <button className="icon-btn" onClick={cancel} aria-label="Indietro"><ChevronLeft /></button>
        <h1 className="grow">{initial ? 'Modifica questionario' : 'Crea nuovo questionario'}</h1>
      </div>

      <div className="seg center fade-in" role="tablist">
        <button role="tab" aria-selected={tab === 'impostazioni'} className={tab === 'impostazioni' ? 'on' : ''} onClick={() => setTab('impostazioni')}>Impostazioni</button>
        <button role="tab" aria-selected={tab === 'domande'} className={tab === 'domande' ? 'on' : ''} onClick={() => setTab('domande')}>Domande <span className="count">{questions.length}</span></button>
      </div>

      {tab === 'impostazioni' ? (
        <div className="qb-col fade-in">
          <section className="qb-card">
            <label htmlFor="qb-name" className="qb-h">Nome questionario*</label>
            <input id="qb-name" className="input" maxLength={120} value={name} onChange={(e) => touch(setName)(e.target.value)} placeholder="Es. Check settimanale" autoFocus={!initial} />
          </section>

          <section className="qb-card">
            <div className="qb-h">Tipologia</div>
            <div className="qb-sub">Scegli la categoria che descrive meglio lo scopo di questo questionario.</div>
            <div className="qb-kinds" role="radiogroup" aria-label="Tipologia">
              {(['benvenuto', 'check_in'] as QKind[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} className={`qb-kind ${kind === k ? 'on' : ''}`} onClick={() => touch(setKind)(k)}>
                  {kind === k && <Check className="tick" />}
                  <b>{KIND_LABEL[k]}</b>
                  <span>{KIND_HINT[k]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="qb-card">
            <div className="qb-h">Visibilità</div>
            <div className="qb-row">
              <div className="grow"><b>Attivo</b><div className="qb-sub">Il questionario compare quando registri una visita.</div></div>
              <button className={`switch ${active ? 'on' : ''}`} role="switch" aria-checked={active} aria-label="Attivo" onClick={() => touch(setActive)(!active)}><i /></button>
            </div>
          </section>
        </div>
      ) : (
        <div className="qb-col wide fade-in">
          {questions.length > 0 && <div className="qb-tools"><button className="btn btn-sm btn-soft-danger" onClick={() => setConfirmClear(true)}><Trash2 /> Cancella tutto</button></div>}
          {questions.length === 0 && <div className="qb-empty">Nessuna domanda. Aggiungine una per iniziare.</div>}
          {questions.map((q, i) => <QuestionRow key={q.id} q={q} i={i} last={i === questions.length - 1} onChange={(p) => setQ(q.id, p)} onMove={(d) => move(i, d)}
            onDelete={() => { setQuestions((qs) => qs.filter((x) => x.id !== q.id)); setDirty(true); }} />)}
          <button className="qb-add" onClick={add}><Plus /> Aggiungi domanda</button>
        </div>
      )}

      <div className="qb-actions fade-in">
        <button className="btn btn-lg" onClick={cancel}><X /> Annulla</button>
        <button className="btn btn-primary btn-lg" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : <><Check /> {initial ? 'Salva' : 'Crea questionario'}</>}</button>
      </div>
      {initial && <div className="qb-delete"><button className="link-btn danger" onClick={() => setConfirmDelete(true)}>Elimina questionario</button></div>}

      {confirmClear && <Confirm title="Cancella tutte le domande" danger confirmLabel="Cancella tutto" text="Verranno rimosse tutte le domande di questo questionario (finché non salvi non cambia nulla)."
        onConfirm={() => { setQuestions([]); setDirty(true); }} onClose={() => setConfirmClear(false)} />}
      {confirmDelete && initial && <Confirm title="Elimina questionario" danger confirmLabel="Elimina" text={`Eliminare “${initial.name}”? Le visite già compilate restano com'erano.`}
        onConfirm={async () => { const r = await act(() => api.del(`/questionnaires/${initial.id}`), 'Questionario eliminato'); if (r !== undefined) { setDirty(false); nav(BACK); } }} onClose={() => setConfirmDelete(false)} />}
    </div>
  );
}

function QuestionRow({ q, i, last, onChange, onMove, onDelete }: {
  q: Q; i: number; last: boolean; onChange: (p: Partial<Q>) => void; onMove: (d: -1 | 1) => void; onDelete: () => void;
}) {
  const [showOpts, setShowOpts] = useState(false);
  const opts = q.options ?? [];
  const setType = (type: QType) => onChange({ type, options: hasOptions(type) ? (opts.length ? opts : ['', '']) : undefined });
  const setOpt = (k: number, v: string) => onChange({ options: opts.map((o, j) => (j === k ? v : o)) });
  const open = showOpts;
  return (
    <div className="qb-q">
      <div className="qb-q-main">
        <div className="qb-order">
          <button className="mini-btn" aria-label="Sposta su" disabled={i === 0} onClick={() => onMove(-1)}><ChevronUp /></button>
          <span className="n">{i + 1}</span>
          <button className="mini-btn" aria-label="Sposta giù" disabled={last} onClick={() => onMove(1)}><ChevronDown /></button>
        </div>
        <input id={`qb-${q.id}`} className="input" maxLength={300} value={q.label} placeholder="Scrivi la domanda" onChange={(e) => onChange({ label: e.target.value })} aria-label={`Domanda ${i + 1}`} />
        <select className="select qb-type" value={q.type} onChange={(e) => setType(e.target.value as QType)} aria-label="Tipo di risposta">
          {(Object.keys(TYPE_LABEL) as QType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <label className="qb-req"><input type="checkbox" checked={!!q.required} onChange={(e) => onChange({ required: e.target.checked })} /> Obbligatoria</label>
        <button className="icon-btn sm soft-danger" aria-label="Elimina domanda" onClick={onDelete}><Trash2 /></button>
      </div>
      {hasOptions(q.type) && (
        <div className="qb-opts">
          <button className="chip" aria-expanded={open} onClick={() => setShowOpts(!open)}>Risposte ({opts.filter((o) => o.trim()).length})</button>
          {open && (
            <div className="qb-opts-list">
              {opts.map((o, k) => (
                <div className="qb-opt" key={k}>
                  <input className="input" maxLength={120} value={o} placeholder={`Risposta ${k + 1}`} onChange={(e) => setOpt(k, e.target.value)} aria-label={`Risposta ${k + 1}`} />
                  <button className="icon-btn sm" aria-label="Rimuovi risposta" disabled={opts.length <= 2} onClick={() => onChange({ options: opts.filter((_, j) => j !== k) })}><X /></button>
                </div>
              ))}
              <button className="link-btn" onClick={() => onChange({ options: [...opts, ''] })}><Plus size={14} /> Aggiungi risposta</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
