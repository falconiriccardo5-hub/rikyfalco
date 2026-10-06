import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, History, Info, Plus, Save, Trash2 } from 'lucide-react';
import { Confirm, ErrorBox, Loading, useAction, useApi } from '../components/ui';
import { api, type ClientSummary, type Lead, type VisitFormRecord } from '../lib/api';
import { itDate, todayRome } from '../lib/format';
import { answerText, fmtCalc, isEmpty, isVisible, progress, TEMPLATES, type Answers, type Question, type TemplateId } from '../lib/visitForm';

/** Modulo visita: nuovo (`/visits/form/new?client=…` o `?lead=…`) oppure già compilato (`/visits/form/:id`). */
export default function VisitForm() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const isNew = !id || id === 'new';
  const saved = useApi<VisitFormRecord>(isNew ? null : `/visit-forms/${id}`);
  const clientId = isNew ? qs.get('client') : saved.data?.client_id ?? null;
  const leadId = isNew ? qs.get('lead') : saved.data?.lead_id ?? null;
  const owner = clientId ? `client_id=${clientId}` : leadId ? `lead_id=${leadId}` : null;
  const history = useApi<VisitFormRecord[]>(owner ? `/visit-forms?${owner}` : null);
  const client = useApi<{ client: ClientSummary }>(isNew && clientId ? `/clients/${clientId}` : null);
  const leads = useApi<Lead[]>(isNew && leadId && !clientId ? '/leads' : null);

  if (isNew && !clientId && !leadId) return <ErrorBox error="Scegli prima la persona da “Nuova visita”." />;
  const error = saved.error || history.error || client.error || leads.error;
  if (error) return <ErrorBox error={error} />;
  if ((!isNew && !saved.data) || !history.data || (isNew && clientId && !client.data) || (isNew && leadId && !clientId && !leads.data)) return <Loading />;

  const lead = leads.data?.find((l) => l.id === leadId);
  if (isNew && leadId && !clientId && !lead) return <ErrorBox error="Contatto non trovato" />;
  const person = saved.data?.person || client.data?.client.name || `${lead?.first_name ?? ''} ${lead?.last_name ?? ''}`.trim();
  const others = history.data.filter((f) => f.id !== id);
  return <Editor key={id ?? 'new'} record={saved.data ?? null} person={person} clientId={clientId} leadId={leadId} others={others} />;
}

function Editor({ record, person, clientId, leadId, others }: {
  record: VisitFormRecord | null; person: string; clientId: string | null; leadId: string | null; others: VisitFormRecord[];
}) {
  const nav = useNavigate();
  const act = useAction();
  const [template, setTemplate] = useState<TemplateId>(record?.template ?? (others.length ? 'check' : 'anamnesi'));
  const [date, setDate] = useState(record?.visit_date ?? todayRome());
  const [answers, setAnswers] = useState<Answers>(record?.answers ?? {});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const t = TEMPLATES[template];

  // Ultima risposta data a ogni domanda nelle visite precedenti (anche se di tipo diverso)
  const previous = useMemo(() => {
    const before = others.filter((f) => !record || f.visit_date < record.visit_date || (f.visit_date === record.visit_date && f.created_at < record.created_at));
    const out: Record<string, { value: string; date: string }> = {};
    for (const f of before) for (const [k, v] of Object.entries(f.answers)) {
      if (!out[k] && !isEmpty(v)) out[k] = { value: answerText(v), date: f.visit_date };
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
  const { done, total } = progress(t, answers);
  const back = clientId ? `/clients/${clientId}` : '/visits';

  const save = async () => {
    setBusy(true);
    // Si salvano solo le risposte non vuote
    const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => !isEmpty(v)));
    const body = { template, visit_date: date, answers: clean };
    const r = await act(() => record
      ? api.patch(`/visit-forms/${record.id}`, body).then(() => ({ id: record.id }))
      : api.post<{ id: string }>('/visit-forms', { ...body, ...(clientId ? { client_id: clientId } : { lead_id: leadId }) }), 'Visita salvata');
    setBusy(false);
    if (r) { setDirty(false); if (!record) nav(`/visits/form/${r.id}`, { replace: true }); }
  };

  return (
    <div className="visit-form">
      <Link to={back} className="row muted fade-in" style={{ gap: 6, marginBottom: 24, width: 'fit-content' }}><ChevronLeft size={18} /> {clientId ? person : 'Visita'}</Link>
      <div className="page-head fade-in">
        <div>
          <div className="label">{record ? 'MODULO VISITA' : 'NUOVA VISITA'} · {t.label.toUpperCase()}</div>
          <h1>{person}</h1>
          <div className="muted" style={{ marginTop: 10 }}>{t.description}</div>
        </div>
        <div className="row wrap">
          {record && <button className="btn btn-danger" onClick={() => setDel(true)}><Trash2 /> Elimina</button>}
          <button className="btn btn-primary btn-lg" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : <><Save /> Salva visita</>}</button>
        </div>
      </div>

      <div className="card pad vf-meta fade-in">
        <label className="field"><span>Tipo di modulo</span>
          <div className="chips">
            {(Object.values(TEMPLATES)).map((x) => (
              <button key={x.id} type="button" className={`chip ${template === x.id ? 'active' : ''}`} onClick={() => { setTemplate(x.id); setDirty(true); }}>{x.label}</button>
            ))}
          </div>
        </label>
        <label className="field"><span>Data della visita</span>
          <input className="input" type="date" required value={date} onChange={(e) => { setDate(e.target.value); setDirty(true); }} style={{ maxWidth: 220 }} />
        </label>
        <div className="field"><span>Compilazione</span>
          <div className="row" style={{ gap: 12 }}>
            <div className="vf-bar"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
            <span className="mono muted" style={{ fontSize: 13 }}>{done}/{total}</span>
          </div>
        </div>
        {others.length > 0 && (
          <div className="vf-prev muted"><History size={16} /> {others.length} {others.length === 1 ? 'visita precedente' : 'visite precedenti'}, l’ultima il {itDate(others[0].visit_date)}. Sotto ogni domanda vedi la risposta data l’ultima volta.</div>
        )}
      </div>

      <nav className="chips vf-nav fade-in" aria-label="Sezioni">
        {t.sections.map((s, i) => <a key={s.title} className="chip" href={`#vf-${i}`} onClick={(e) => { e.preventDefault(); document.getElementById(`vf-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{s.title}</a>)}
      </nav>

      {t.sections.map((s, si) => (
        <section key={s.title} id={`vf-${si}`} className="vf-section">
          <div className="section-title"><span className="idx">[ {String(si + 1).padStart(2, '0')} / {String(t.sections.length).padStart(2, '0')} ]</span><h2>{s.title}</h2></div>
          <div className="card vf-card">
            {s.questions.map((qn, qi) => isVisible(s, qi, answers) && (
              <QuestionRow key={qn.id} q={qn} answers={answers} set={set} prev={previous[qn.id]} />
            ))}
          </div>
          {s.notice && <div className="vf-notice"><Info size={18} /> {s.notice}</div>}
        </section>
      ))}

      <div className="vf-savebar">
        <span className="muted">{dirty ? 'Modifiche non salvate' : record ? `Salvata · ${done}/${total} risposte` : `${done}/${total} risposte`}</span>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : <><Save /> Salva visita</>}</button>
      </div>

      {del && record && (
        <Confirm title="Elimina modulo" danger confirmLabel="Elimina" text={`Eliminare ${TEMPLATES[record.template].label.toLowerCase()} di ${person} del ${itDate(record.visit_date)}?`}
          onConfirm={async () => { const r = await act(() => api.del(`/visit-forms/${record.id}`), 'Modulo eliminato'); if (r) { setDirty(false); nav(back); } }}
          onClose={() => setDel(false)} />
      )}
    </div>
  );
}

function QuestionRow({ q, answers, set, prev }: { q: Question; answers: Answers; set: (k: string, v: string | string[]) => void; prev?: { value: string; date: string } }) {
  const noteKey = `${q.id}_nota`;
  const [showNote, setShowNote] = useState(!isEmpty(answers[noteKey]));
  const v = answers[q.id];
  const str = typeof v === 'string' ? v : '';
  const arr = Array.isArray(v) ? v : [];
  const id = `q-${q.id}`;

  let input: React.ReactNode;
  switch (q.type) {
    case 'choice': case 'scale': {
      const opts = q.type === 'scale' ? ['1', '2', '3', '4', '5'] : q.options ?? [];
      input = <div className={`chips ${q.type === 'scale' ? 'vf-scale' : ''}`} role="radiogroup" aria-labelledby={id}>
        {opts.map((o) => <button key={o} type="button" role="radio" aria-checked={str === o} className={`chip ${str === o ? 'active' : ''}`} onClick={() => set(q.id, str === o ? '' : o)}>{o}</button>)}
      </div>;
      break;
    }
    case 'multi':
      input = <div className="chips" role="group" aria-labelledby={id}>
        {(q.options ?? []).map((o) => {
          const on = arr.includes(o);
          return <button key={o} type="button" aria-pressed={on} className={`chip ${on ? 'active' : ''}`} onClick={() => set(q.id, on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>;
        })}
      </div>;
      break;
    case 'long':
      input = <textarea className="textarea" aria-labelledby={id} maxLength={5000} value={str} onChange={(e) => set(q.id, e.target.value)} rows={q.follow ? 2 : 3} />;
      break;
    case 'number':
      input = <div className="vf-num"><input className="input" aria-labelledby={id} inputMode="decimal" maxLength={12} value={str} onChange={(e) => set(q.id, e.target.value.replace(/[^0-9.,]/g, ''))} />{q.unit && <span className="muted">{q.unit}</span>}</div>;
      break;
    case 'date':
      input = <input className="input" type="date" aria-labelledby={id} value={str} onChange={(e) => set(q.id, e.target.value)} style={{ maxWidth: 220 }} />;
      break;
    case 'calc':
      input = <div className="vf-calc mono">{fmtCalc(q.calc!(answers))}{q.unit && <span className="muted">{'\u00a0'}{q.unit}</span>}</div>;
      break;
    default:
      input = <input className="input" aria-labelledby={id} maxLength={500} value={str} onChange={(e) => set(q.id, e.target.value)} />;
  }

  const canNote = q.type !== 'calc' && q.type !== 'long';
  return (
    <div className={`vf-q ${q.follow ? 'follow' : ''}`}>
      <div className="vf-label">
        <div id={id}>{q.label}</div>
        {q.hint && <div className="vf-hint">{q.hint}</div>}
      </div>
      <div className="vf-input">
        {input}
        {canNote && (showNote
          ? <input className="input vf-note" placeholder="Note aggiuntive" maxLength={2000} value={typeof answers[noteKey] === 'string' ? answers[noteKey] as string : ''} onChange={(e) => set(noteKey, e.target.value)} />
          : <button type="button" className="vf-addnote" onClick={() => setShowNote(true)}><Plus size={13} /> nota</button>)}
        {prev && q.type !== 'calc' && <div className="vf-last">Ultima volta ({itDate(prev.date)}): <b>{prev.value}</b></div>}
      </div>
    </div>
  );
}
