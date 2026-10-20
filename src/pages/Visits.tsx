import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { MeasureForm } from '../components/Measures';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClientForm, LeadForm } from '../components/Forms';
import { useOpen } from '../components/Layout';
import { Confirm, Empty, ErrorBox, Loading, useAction, useApi } from '../components/ui';
import { api, type Lead, type Measurement, type VisitFormRecord } from '../lib/api';
import { initials, itDate, shortDay, time } from '../lib/format';
import { compute } from '../lib/measures';
import { KIND_LABEL, type Questionnaire } from '../lib/questionnaire';

type Tab = 'visite' | 'misure' | 'persone' | 'questionari';
const TABS: [Tab, string][] = [['visite', 'Visite'], ['misure', 'Misure'], ['persone', 'Persone'], ['questionari', 'Questionari']];
const isTab = (v: string | null): v is Tab => v === 'visite' || v === 'misure' || v === 'persone' || v === 'questionari';

export default function Visits() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'visite';
  const open = useOpen();
  const nav = useNavigate();
  const [newMeasure, setNewMeasure] = useState(false);

  return (
    <div className="minimal-page">
      <div className="mp-head fade-in">
        <h1>Visita</h1>
        <button className="btn btn-primary" onClick={() => (tab === 'questionari' ? nav('/visits/questionnaire/new') : tab === 'misure' ? setNewMeasure(true) : open.visit())}>
          <Plus /> {tab === 'questionari' ? 'Nuovo questionario' : tab === 'misure' ? 'Nuova misurazione' : 'Nuova visita'}
        </button>
      </div>

      <div className="seg fade-in" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setParams(k === 'visite' ? {} : { tab: k }, { replace: true })}>{l}</button>
        ))}
      </div>

      {tab === 'visite' && <DoneVisits />}
      {tab === 'misure' && <DoneMeasures />}
      {tab === 'persone' && <People />}
      {tab === 'questionari' && <Questionnaires />}
      {newMeasure && <MeasureForm onClose={() => setNewMeasure(false)} />}
    </div>
  );
}

function DoneMeasures() {
  const { data, error } = useApi<Measurement[]>('/measurements');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  if (data.length === 0) return <div className="mp-list fade-in"><Empty>Nessuna misurazione ancora. Con “Nuova misurazione” inserisci pliche e circonferenze nella data della visita.</Empty></div>;
  return (
    <div className="mp-list fade-in">
      {data.map((m) => {
        const c = compute(m);
        return (
          <Link className="mp-row" key={m.id} to={`/measures?client=${m.client_id}`}>
            <div className="grow">
              <div className="t">{m.client_name}</div>
              <div className="s">{itDate(m.measured_at)}{m.weight_kg !== null && ` · ${m.weight_kg} kg`}{c.pct !== null && ` · ${c.pct.toLocaleString('it-IT')}% MG`}</div>
            </div>
            <ChevronRight className="chev" />
          </Link>
        );
      })}
    </div>
  );
}

function DoneVisits() {
  const { data, error } = useApi<VisitFormRecord[]>('/visit-forms');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  if (data.length === 0) return <div className="mp-list fade-in"><Empty>Nessuna visita ancora. Con “Nuova visita” scegli la persona e il questionario da compilare.</Empty></div>;
  return (
    <div className="mp-list fade-in">
      {data.map((f) => (
        <Link className="mp-row" key={f.id} to={`/visits/form/${f.id}`}>
          <div className="grow">
            <div className="t">{f.person || 'Persona eliminata'}</div>
            <div className="s">{f.title} · {itDate(f.visit_date)}</div>
          </div>
          <ChevronRight className="chev" />
        </Link>
      ))}
    </div>
  );
}

const STATUS: Record<Lead['status'], string> = { da_fare: 'Da fare', svolta: 'Svolta', convertito: 'Cliente', perso: 'Non interessato' };

function People() {
  const { data, error } = useApi<Lead[]>('/leads');
  const nav = useNavigate();
  const open = useOpen();
  const act = useAction();
  const [all, setAll] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { edit: Lead } | { convert: Lead } | { del: Lead }>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const list = data.filter((l) => all || l.status === 'da_fare' || l.status === 'svolta');

  return (
    <>
      <div className="mp-bar fade-in">
        <button className="link-btn" onClick={() => setAll(!all)}>{all ? 'Solo aperte' : 'Mostra tutte'}</button>
        <button className="link-btn" onClick={open.lead}><Plus size={14} /> Nuovo contatto</button>
      </div>
      <div className="mp-list fade-in" ref={ref}>
        {list.length === 0 ? <Empty>Nessun contatto aperto. Le persone che incontri per una prima visita compaiono qui.</Empty> : list.map((l) => (
          <div className="mp-row" key={l.id}>
            <div className="avatar sm">{initials(l.first_name, l.last_name)}</div>
            <div className="grow">
              <div className="t">{l.first_name} {l.last_name}</div>
              <div className="s">{l.visit_at ? `${shortDay(l.visit_at)} · ${time(l.visit_at)}` : `Aggiunto il ${itDate(l.created_at)}`}{l.status !== 'da_fare' && ` · ${STATUS[l.status]}`}</div>
            </div>
            <button className="btn btn-sm" onClick={() => nav(`/visits/form/new?${l.client_id ? `client=${l.client_id}` : `lead=${l.id}`}`)}>Compila</button>
            <div className="menu-wrap">
              <button className="icon-btn sm" aria-label="Altre azioni" aria-expanded={menu === l.id} onClick={() => setMenu(menu === l.id ? null : l.id)}><MoreHorizontal /></button>
              {menu === l.id && (
                <div className="menu" role="menu">
                  {l.client_id && <Link role="menuitem" to={`/clients/${l.client_id}`}>Apri scheda cliente</Link>}
                  {l.status !== 'convertito' && <button role="menuitem" onClick={() => { setMenu(null); setModal({ convert: l }); }}>Rendi cliente</button>}
                  {l.status === 'da_fare' && <button role="menuitem" onClick={() => { setMenu(null); act(() => api.patch(`/leads/${l.id}`, { status: 'svolta' }), 'Segnata come svolta'); }}>Segna come svolta</button>}
                  {l.status !== 'convertito' && l.status !== 'perso' && <button role="menuitem" onClick={() => { setMenu(null); act(() => api.patch(`/leads/${l.id}`, { status: 'perso' }), 'Segnata come non interessata'); }}>Non interessato</button>}
                  <button role="menuitem" onClick={() => { setMenu(null); setModal({ edit: l }); }}>Modifica</button>
                  <button role="menuitem" className="danger" onClick={() => { setMenu(null); setModal({ del: l }); }}>Elimina</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {modal && 'edit' in modal && <LeadForm lead={modal.edit} onClose={() => setModal(null)} />}
      {modal && 'convert' in modal && <ClientForm lead={modal.convert} onClose={() => setModal(null)} />}
      {modal && 'del' in modal && <Confirm title="Elimina contatto" danger confirmLabel="Elimina" text={`Eliminare ${modal.del.first_name} e le sue visite in calendario?`}
        onConfirm={() => act(() => api.del(`/leads/${modal.del.id}`), 'Contatto eliminato')} onClose={() => setModal(null)} />}
    </>
  );
}

function Questionnaires() {
  const { data, error, setData } = useApi<Questionnaire[]>('/questionnaires');
  const act = useAction();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const toggle = async (q: Questionnaire) => {
    const next = !q.active;
    setData(data.map((x) => (x.id === q.id ? { ...x, active: next } : x)));
    const r = await act(() => api.patch(`/questionnaires/${q.id}`, { active: next }));
    if (r === undefined) setData(data);
  };
  if (data.length === 0) return <div className="mp-list fade-in"><Empty>Nessun questionario. Creane uno con “Nuovo questionario”.</Empty></div>;
  return (
    <div className="mp-list fade-in">
      {data.map((q) => (
        <div className="mp-row" key={q.id}>
          <Link className="grow mp-link" to={`/visits/questionnaire/${q.id}`}>
            <div className="t">{q.name}</div>
            <div className="s">{KIND_LABEL[q.kind]} · {q.questions.length} {q.questions.length === 1 ? 'domanda' : 'domande'}</div>
          </Link>
          <button className={`switch ${q.active ? 'on' : ''}`} role="switch" aria-checked={q.active} aria-label={`${q.name}: ${q.active ? 'attivo' : 'non attivo'}`} onClick={() => toggle(q)}><i /></button>
        </div>
      ))}
    </div>
  );
}
