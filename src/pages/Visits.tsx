import { useState } from 'react';
import { ClipboardList, FileText, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ClientForm, LeadForm } from '../components/Forms';
import { useOpen } from '../components/Layout';
import { Confirm, Empty, ErrorBox, Loading, PageHead, useAction, useApi } from '../components/ui';
import { api, type Lead, type VisitFormRecord } from '../lib/api';
import { TEMPLATES } from '../lib/visitForm';
import { initials, itDate, shortDay, time } from '../lib/format';

const STATUS: Record<Lead['status'], [string, string]> = { da_fare: ['violet', 'Da fare'], svolta: ['amber', 'Svolta'], convertito: ['green', 'Cliente'], perso: ['gray', 'Non interessato'] };

export default function Visits() {
  const { data, error } = useApi<Lead[]>('/leads');
  const forms = useApi<VisitFormRecord[]>('/visit-forms');
  const nav = useNavigate();
  const [f, setF] = useState<'aperte' | 'tutte' | Lead['status']>('aperte');
  const [modal, setModal] = useState<null | { edit: Lead } | { convert: Lead } | { del: Lead }>(null);
  const open = useOpen();
  const act = useAction();

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const list = data.filter((l) => f === 'tutte' || (f === 'aperte' ? l.status === 'da_fare' || l.status === 'svolta' : l.status === f));

  return (
    <>
      <PageHead label="CONSULENZE CONOSCITIVE" title="Visita">
        <button className="btn btn-lg" onClick={open.lead}><UserPlus /> Nuovo contatto</button>
        <button className="btn btn-primary btn-lg" onClick={open.visit}><ClipboardList /> Nuova visita</button>
      </PageHead>
      <div className="chips fade-in" style={{ marginBottom: 26 }}>
        {([['aperte', 'Aperte'], ['da_fare', 'Da fare'], ['svolta', 'Svolte'], ['convertito', 'Diventati clienti'], ['perso', 'Non interessati'], ['tutte', 'Tutte']] as const).map(([k, l]) =>
          <button key={k} className={`chip ${f === k ? 'active' : ''}`} onClick={() => setF(k)}>{l}</button>)}
      </div>
      <div className="card list fade-in">
        {list.length === 0 ? <Empty>Nessuna visita. Le persone interessate che incontri per una prima consulenza compaiono qui.</Empty> : list.map((l) => (
          <div className="list-row" key={l.id}>
            <div className="avatar sm">{initials(l.first_name, l.last_name)}</div>
            <div className="grow">
              <div className="title">{l.first_name} {l.last_name}</div>
              <div className="sub">
                {l.visit_at ? `Visita ${shortDay(l.visit_at)} ${time(l.visit_at)}` : `Inserito il ${itDate(l.created_at)}`}
                {l.source && ` · ${l.source}`}{l.phone && ` · ${l.phone}`}
              </div>
            </div>
            <span className={`pill ${STATUS[l.status][0]}`}>{STATUS[l.status][1]}</span>
            <div className="actions">
              {l.status !== 'convertito' && <>
                <select className="select" style={{ height: 34, width: 'auto', fontSize: 13.5, borderRadius: 999 }} value={l.status} aria-label="Esito"
                  onChange={(e) => act(() => api.patch(`/leads/${l.id}`, { status: e.target.value }), 'Esito aggiornato')}>
                  <option value="da_fare">Da fare</option><option value="svolta">Svolta</option><option value="perso">Non interessato</option>
                </select>
                <button className="btn btn-sm btn-green" onClick={() => setModal({ convert: l })}><UserPlus /> Rendi cliente</button>
              </>}
              <button className="btn btn-sm" onClick={() => nav(`/visits/form/new?${l.client_id ? `client=${l.client_id}` : `lead=${l.id}`}`)}><ClipboardList /> Modulo</button>
              {l.client_id && <Link className="btn btn-sm" to={`/clients/${l.client_id}`}>Apri scheda</Link>}
              <button className="icon-btn sm" aria-label="Modifica" onClick={() => setModal({ edit: l })}><Pencil /></button>
              <button className="icon-btn sm" aria-label="Elimina" onClick={() => setModal({ del: l })}><Trash2 /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title spread" style={{ marginTop: 48 }}>
        <h2>Moduli compilati</h2>
        {forms.data && forms.data.length > 0 && <span className="muted mono" style={{ fontSize: 13 }}>{forms.data.length}</span>}
      </div>
      <div className="card list fade-in">
        {!forms.data ? <Loading /> : forms.data.length === 0 ? <Empty>Nessun modulo ancora. Con “Nuova visita” scegli la persona e si apre il questionario da compilare.</Empty> : forms.data.map((f) => (
          <Link className="list-row" key={f.id} to={`/visits/form/${f.id}`}>
            <div className={`row-icon ${f.template === 'anamnesi' ? 'violet' : 'green'}`}><FileText /></div>
            <div className="grow">
              <div className="title">{f.person || 'Persona eliminata'}</div>
              <div className="sub">{TEMPLATES[f.template].label} · {itDate(f.visit_date)}{f.client_id ? ' · cliente' : ' · contatto'}</div>
            </div>
            <span className="btn btn-sm">Apri</span>
          </Link>
        ))}
      </div>
      {modal && 'edit' in modal && <LeadForm lead={modal.edit} onClose={() => setModal(null)} />}
      {modal && 'convert' in modal && <ClientForm lead={modal.convert} onClose={() => setModal(null)} />}
      {modal && 'del' in modal && <Confirm title="Elimina contatto" danger confirmLabel="Elimina" text={`Eliminare ${modal.del.first_name} e le sue visite in calendario?`}
        onConfirm={() => act(() => api.del(`/leads/${modal.del.id}`), 'Contatto eliminato')} onClose={() => setModal(null)} />}
    </>
  );
}
