import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, Bell, CalendarDays, CalendarPlus, ClipboardList, CreditCard, HardDriveDownload, LayoutGrid, LogOut, Menu,
  MessageCircle, Plus, Search, Settings, Sparkles, UserPlus, Users, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { ClientForm, LeadForm, SessionForm } from './Forms';
import { Modal, useApi } from './ui';

type Me = { email: string; coach_name: string; badges: { notifications: number; messages: number } };
type Open = { client: () => void; session: (clientId?: string, date?: string) => void; lead: () => void };
const OpenCtx = createContext<Open>({ client: () => {}, session: () => {}, lead: () => {} });
export const useOpen = () => useContext(OpenCtx);
export const MeCtx = createContext<Me | null>(null);

export default function Layout() {
  const me = useApi<Me>('/me');
  const badges = useApi<Me['badges']>('/badges');
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [modal, setModal] = useState<null | { t: 'client' } | { t: 'lead' } | { t: 'session'; clientId?: string; date?: string }>(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const open = useMemo<Open>(() => ({
    client: () => setModal({ t: 'client' }),
    lead: () => setModal({ t: 'lead' }),
    session: (clientId, date) => setModal({ t: 'session', clientId, date }),
  }), []);

  const b = badges.data ?? me.data?.badges;
  const items = [
    { to: '/', icon: LayoutGrid, label: 'Dashboard', end: true },
    { to: '/clients', icon: Users, label: 'Clienti' },
    { to: '/visits', icon: ClipboardList, label: 'Visita' },
    { to: '/payments', icon: CreditCard, label: 'Pagamenti' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendario' },
    { to: '/notifications', icon: Bell, label: 'Notifiche', badge: b?.notifications },
    { to: '/messages', icon: MessageCircle, label: 'Messaggi', badge: b?.messages },
    { to: '/report', icon: BarChart3, label: 'Report' },
  ];
  const admin = [
    { to: '/activity', icon: Activity, label: 'Attività' },
    { to: '/backup', icon: HardDriveDownload, label: 'Backup' },
    { to: '/settings', icon: Settings, label: 'Impostazioni' },
  ];

  return (
    <MeCtx.Provider value={me.data}>
      <OpenCtx.Provider value={open}>
        <div className="app">
          <header className="topbar">
            <button className="icon-btn sm" onClick={() => setMenu(true)} aria-label="Apri menu"><Menu /></button>
            <div className="row" style={{ gap: 10 }}><div className="brand-logo" style={{ width: 32, height: 32, fontSize: 11 }}>RF</div><span className="brand-name" style={{ fontSize: 12 }}>RF COACHING</span></div>
            <button className="icon-btn sm" onClick={() => setPalette(true)} aria-label="Cerca"><Search /></button>
          </header>
          {menu && <div className="scrim" onClick={() => setMenu(false)} />}

          <aside className={`sidebar ${menu ? 'open' : ''}`}>
            <div className="brand">
              <div className="brand-logo">RF</div>
              <div>
                <div className="brand-name">RICCARDO<br />FALCONI</div>
                <div className="brand-sub">COACHING</div>
              </div>
              {menu && <button className="icon-btn sm" style={{ marginLeft: 'auto' }} onClick={() => setMenu(false)} aria-label="Chiudi menu"><X /></button>}
            </div>
            <button className="btn btn-primary btn-lg btn-block" onClick={open.client}><Plus /> Nuovo cliente</button>
            <button className="side-search" onClick={() => setPalette(true)}><Search /> Cerca <span className="kbd">⌘K</span></button>

            <nav className="nav" aria-label="Principale">
              {items.map(({ to, icon: Icon, label, end, badge }) => (
                <NavLink key={to} to={to} end={end}><Icon /> {label}{!!badge && <span className="badge">{badge > 99 ? '99+' : badge}</span>}</NavLink>
              ))}
              <div className="nav-title">ADMIN</div>
              {admin.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to}><Icon /> {label}</NavLink>)}
            </nav>

            <div className="sidebar-foot">
              <div className="user-box">
                <div style={{ minWidth: 0 }}>
                  <div className="truncate">{me.data?.coach_name ?? '…'}</div>
                  <div className="role">ADMIN</div>
                </div>
                <a className="icon-btn sm" href="/cdn-cgi/access/logout" title="Esci" aria-label="Esci"><LogOut /></a>
              </div>
            </div>
          </aside>

          <main className="main">
            <div className="container" key={loc.pathname}>
              <Outlet />
            </div>
          </main>

          {import.meta.env.VITE_DEMO && <div className="demo-tag">Anteprima · dati di esempio, le modifiche non vengono salvate</div>}
          <QuickFab />
          {palette && <CommandPalette onClose={() => setPalette(false)} onGo={(to) => { setPalette(false); nav(to); }} />}
          {modal?.t === 'client' && <ClientForm onClose={() => setModal(null)} onSaved={(id) => nav(`/clients/${id}`)} />}
          {modal?.t === 'lead' && <LeadForm onClose={() => setModal(null)} />}
          {modal?.t === 'session' && <SessionForm clientId={modal.clientId} date={modal.date} onClose={() => setModal(null)} />}
        </div>
      </OpenCtx.Provider>
    </MeCtx.Provider>
  );
}

function QuickFab() {
  const [open, setOpen] = useState(false);
  const o = useOpen();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const go = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div className="fab" ref={ref}>
      {open && (
        <div className="fab-menu">
          <button className="btn" onClick={go(() => o.session())} style={{ animationDelay: '0ms' }}><CalendarPlus /> Nuovo appuntamento</button>
          <button className="btn" onClick={go(o.lead)} style={{ animationDelay: '40ms' }}><ClipboardList /> Nuova visita</button>
          <button className="btn" onClick={go(o.client)} style={{ animationDelay: '80ms' }}><UserPlus /> Nuovo cliente</button>
        </div>
      )}
      <button className="fab-btn" onClick={() => setOpen((x) => !x)} aria-label="Azioni rapide" aria-expanded={open}><Sparkles /></button>
    </div>
  );
}

type SearchRes = { clients: { id: string; first_name: string; last_name: string; email: string; archived_at: string | null }[]; leads: { id: string; first_name: string; last_name: string }[] };
const PAGES = [
  ['Dashboard', '/'], ['Clienti', '/clients'], ['Visita', '/visits'], ['Pagamenti', '/payments'], ['Calendario', '/calendar'],
  ['Notifiche', '/notifications'], ['Messaggi', '/messages'], ['Report', '/report'], ['Attività', '/activity'], ['Backup', '/backup'], ['Impostazioni', '/settings'],
];

function CommandPalette({ onClose, onGo }: { onClose: () => void; onGo: (to: string) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SearchRes>({ clients: [], leads: [] });
  const [sel, setSel] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { if (q.trim()) api.get<SearchRes>(`/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => {}); else setRes({ clients: [], leads: [] }); }, 150);
    return () => clearTimeout(t);
  }, [q]);
  const items = [
    ...res.clients.map((c) => ({ label: `${c.first_name} ${c.last_name}`, hint: c.archived_at ? 'archiviato' : c.email, to: `/clients/${c.id}`, icon: Users })),
    ...res.leads.map((l) => ({ label: `${l.first_name} ${l.last_name}`, hint: 'visita', to: '/visits', icon: ClipboardList })),
    ...PAGES.filter(([l]) => l.toLowerCase().includes(q.toLowerCase())).map(([label, to]) => ({ label, hint: 'pagina', to, icon: LayoutGrid })),
  ];
  return (
    <Modal title="Cerca" onClose={onClose}>
      <input className="input" placeholder="Cerca clienti, contatti o pagine…" value={q} autoFocus
        onChange={(e) => { setQ(e.target.value); setSel(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          if (e.key === 'Enter' && items[sel]) onGo(items[sel].to);
        }} />
      <div style={{ margin: '0 -28px' }}>
        {items.slice(0, 12).map((it, i) => (
          <div key={it.to + it.label} className={`palette-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => onGo(it.to)}>
            <it.icon /><span className="grow truncate">{it.label}</span><span className="dim" style={{ fontSize: 13 }}>{it.hint}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
