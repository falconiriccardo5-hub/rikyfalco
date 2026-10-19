import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { Confirm, ErrorBox, Loading, useAction, useApi, useToast } from '../components/ui';
import { api, type ClientSummary, type Lead, type VisitFormRecord } from '../lib/api';
import { itDate, todayRome } from '../lib/format';
import { KIND_HINT, KIND_LABEL, isBlank, missingRequired, type Q, type Questionnaire } from '../lib/questionnaire';
import type { Answers } from '../lib/visitForm';

/** Visita: nuova (`/visits/form/new?client=…|lead=…&q=<questionario>`) oppure già compilata (`/visits/form/:id`). */
export default function VisitForm() {
  const { id } = useParams();
  const [qs, setQs] = useSearchParams();
  const isNew = !id || id === 'new';
  const saved = useApi<VisitFormRecord>(isNew ? null : `/visit-forms/${id}`);
  const clientId = isNew ? qs.get('client') : saved.data?.client_id ?? null;
  const leadId = isNew ? qs.get('lead') : saved.data?.lead_id ?? null;
  const qid = qs.get('q');
  const owner = clientId ? `client_id=${clientId}` : leadId ? `lead_id=${leadId}` : null;
  const history = useApi<VisitFormRecord[]>(owner ? `/visit-forms?${owner}` : null);
  const client = useApi<{ client: ClientSummary }>(isNew && clientId ? `/clients/${clientId}` : null);
  const leads = useApi<Lead[]>(isNew && leadId && !clientId ? '/leads' : null);
  const questionnaires = useApi<Questionnaire[]>(isNew ? '/questionnaires' : null);

  if (isNew && !clientId && !leadId) return <ErrorBox error="Scegli prima la persona da “Nuova visita”." />;
  const error = saved.error || history.error || client.error || leads.error || questionnaires.error;
  if (error) return <ErrorBox error={error} />;
  if ((!isNew && !saved.data) || !history.data || (isNew && !questionnaires.data) || (isNew && clientId && !client.data) || (isNew && leadId && !clientId && !leads.data)) return <Loading />;

  const lead = leads.data?.find((l) => l.id === leadId);
  if (isNew && leadId && !clientId && !lead) return <ErrorBox error="Contatto non trovato" />;
  const person = saved.data?.person || client.data?.client.name || `${lead?.first_name ?? ''} ${lead?.last_name ?? ''}`.trim();
  const others = history.data.filter((f) => f.id !== id);
  const back = clientId ? `/clients/${clientId}` : '/visits';

  if (isNew) {
    const active = questionnaires.data!.filter((x) => x.active);
    const chosen = active.find((x) => x.id === qid);
    if (!chosen) {
      return <Picker person={person} back={back} backLabel={clientId ? person : 'Visita'} list={active} firstVisit={others.length === 0} onPick={(x) => setQs({ ...(clientId ? { client: clientId } : { lead: leadId! }), q: x.id }, { replace: true })} />;
    }
    return <Editor key={chosen.id} record={null} title={chosen.name} questions={chosen.questions} questionnaireId={chosen.id} person={person} clientId={clientId} leadId={leadId} others={others} back={back} />;
  }
  const r = saved.data!;
  return <Editor key={r.id} record={r} title={r.title} questions={r.questions} questionnaireId={r.questionnaire_id} person={person} clientId={clientId} leadId={leadId} others={others} back={back} />;
}

function Picker({ person, back, backLabel, list, firstVisit, onPick }: {
  person: string; back: string; backLabel: string; list: Questionnaire[]; firstVisit: boolean; onPick: (q: Questionnaire) => void;
}) {
  // se c'è un solo questionario attivo non serve scegliere
  useEffect(() => { if (list.length === 1) onPick(list[0]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const recommended = firstVisit ? 'benvenuto' : 'check_in';
  return (
    <div className="minimal-page qf">
      <Link to={back} className="qf-back fade-in"><ChevronLeft size={18} /> {backLabel}</Link>
      <div className="mp-head fade-in"><h1>{person}</h1></div>
      <p className="qf-sub fade-in">Quale questionario vuoi compilare?</p>
      <div className="qb-col fade-in">
        {list.length === 0 && <div className="qb-empty">Nessun questionario attivo. Attivane uno dalla scheda “Questionari” della sezione Visita.</div>}
        {[...list].sort((a, b) => Number(b.kind === recommended) - Number(a.kind === recommended)).map((x) => (
          <button key={x.id} className="qb-kind pick" onClick={() => onPick(x)}>
            <b>{x.name}{x.kind === recommended && <span className="tag">Consigliato</span>}</b>
            <span>{KIND_LABEL[x.kind]} · {x.questions.length} domande — {KIND_HINT[x.kind]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Editor({ record, title, questions, questionnaireId, person, clientId, leadId, others, back }: {
  record: VisitFormRecord | null; title: string; questions: Q[]; questionnaireId: string | null; person: string;
  clientId: string | null; leadId: string | null; others: VisitFormRecord[]; back: string;
}) {
  const nav = useNavigate();
  const act = useAction();
  const toast = useToast();
  const [date, setDate] = useState(record?.visit_date ?? todayRome());
  const [answers, setAnswers] = useState<Answers>(record?.answers ?? {});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [tried, setTried] = useState(false);

  // Ultima risposta data a ogni domanda nelle visite precedenti
  const previous = useMemo(() => {
    const before = others.filter((f) => !record || f.visit_date < record.visit_date || (f.visit_date === record.visit_date && f.created_at < record.created_at));
    const out: Record<string, { value: string; date: string }> = {};
    for (const f of before) for (const [k, v] of Object.entries(f.answers)) {
      if (!out[k] && !isBlank(v)) out[k] = { value: Array.isArray(v) ? v.join(', ') : v, date: f.visit_date };
    }
    return out;
  }, [others, record]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = (k: string, v: string | string[]) => { setAnswers((a) => ({ ...a, [k]: v })); setDirty(true); };
  const missing = new Set(missingRequired(questions, answers).map((q) => q.id));

  const save = async () => {
    setTried(true);
    if (missing.size) {
      toast(`Rispondi alle domande obbligatorie (${missing.size})`, true);
      document.getElementById(`qf-${[...missing][0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => !isBlank(v)));
    const r = await act(() => record
      ? api.patch(`/visit-forms/${record.id}`, { visit_date: date, answers: clean }).then(() => ({ id: record.id }))
      : api.post<{ id: string }>('/visit-forms', { questionnaire_id: questionnaireId, visit_date: date, answers: clean, ...(clientId ? { client_id: clientId } : { lead_id: leadId }) }), 'Visita salvata');
    setBusy(false);
    if (r) { setDirty(false); if (!record) nav(`/visits/form/${r.id}`, { replace: true }); }
  };

  return (
    <div className="minimal-page qf">
      <Link to={back} className="qf-back fade-in"><ChevronLeft size={18} /> {clientId ? person : 'Visita'}</Link>
      <div className="mp-head fade-in">
        <div className="grow">
          <h1>{person}</h1>
          <div className="qf-sub">{title}</div>
        </div>
        <input className="input qf-date" type="date" aria-label="Data della visita" required value={date} onChange={(e) => { setDate(e.target.value); setDirty(true); }} />
      </div>

      <div className="qf-card fade-in">
        {questions.length === 0 && <div className="qb-empty">Questo questionario non ha domande.</div>}
        {questions.map((q) => (
          <QuestionRow key={q.id} q={q} value={answers[q.id]} set={set} prev={previous[q.id]} invalid={tried && missing.has(q.id)} />
        ))}
      </div>

      {record && <div className="qb-delete"><button className="link-btn danger" onClick={() => setDel(true)}>Elimina visita</button></div>}

      <div className="qf-savebar">
        <span className="muted">{dirty ? 'Modifiche non salvate' : record ? 'Salvata' : ''}</span>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : <><Save /> Salva</>}</button>
      </div>

      {del && record && (
        <Confirm title="Elimina visita" danger confirmLabel="Elimina" text={`Eliminare “${record.title}” di ${person} del ${itDate(record.visit_date)}?`}
          onConfirm={async () => { const r = await act(() => api.del(`/visit-forms/${record.id}`), 'Visita eliminata'); if (r) { setDirty(false); nav(back); } }}
          onClose={() => setDel(false)} />
      )}
    </div>
  );
}

function QuestionRow({ q, value, set, prev, invalid }: { q: Q; value: string | string[] | undefined; set: (k: string, v: string | string[]) => void; prev?: { value: string; date: string }; invalid: boolean }) {
  const str = typeof value === 'string' ? value : '';
  const arr = Array.isArray(value) ? value : [];
  const id = `qf-${q.id}`;

  let input: React.ReactNode;
  switch (q.type) {
    case 'single': case 'scale': {
      const opts = q.type === 'scale' ? ['1', '2', '3', '4', '5'] : q.options ?? [];
      input = <div className="chips" role="radiogroup" aria-labelledby={`${id}-l`}>
        {opts.map((o) => <button key={o} type="button" role="radio" aria-checked={str === o} className={`chip ${str === o ? 'active' : ''}`} onClick={() => set(q.id, str === o ? '' : o)}>{o}</button>)}
      </div>;
      break;
    }
    case 'multi':
      input = <div className="chips" role="group" aria-labelledby={`${id}-l`}>
        {(q.options ?? []).map((o) => {
          const on = arr.includes(o);
          return <button key={o} type="button" aria-pressed={on} className={`chip ${on ? 'active' : ''}`} onClick={() => set(q.id, on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>;
        })}
      </div>;
      break;
    case 'number':
      input = <div className="qf-num"><input className="input" aria-labelledby={`${id}-l`} inputMode="decimal" maxLength={12} value={str} onChange={(e) => set(q.id, e.target.value.replace(/[^0-9.,]/g, ''))} />{q.unit && <span className="muted">{q.unit}</span>}</div>;
      break;
    case 'date':
      input = <input className="input qf-date" type="date" aria-labelledby={`${id}-l`} value={str} onChange={(e) => set(q.id, e.target.value)} />;
      break;
    default:
      input = <textarea className="textarea" aria-labelledby={`${id}-l`} maxLength={5000} rows={2} value={str} onChange={(e) => set(q.id, e.target.value)} />;
  }
  return (
    <div className={`qf-q ${invalid ? 'invalid' : ''}`} id={id}>
      <div className="qf-label" id={`${id}-l`}>{q.label}{q.required && <span className="req" title="Obbligatoria"> *</span>}</div>
      {input}
      {prev && <div className="qf-last">Ultima volta ({itDate(prev.date)}): {prev.value}</div>}
      {invalid && <div className="qf-err">Risposta obbligatoria</div>}
    </div>
  );
}
