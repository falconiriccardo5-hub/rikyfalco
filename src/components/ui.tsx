import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import type React from 'react';
import { X, Inbox } from 'lucide-react';
import { api } from '../lib/api';

// ───── Toast ─────
type Toast = { id: number; text: string; error?: boolean };
const ToastCtx = createContext<(text: string, error?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.error ? 'error' : ''}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ───── Aggiornamento globale (badge, liste) ─────
const RefreshCtx = createContext<{ tick: number; refresh: () => void }>({ tick: 0, refresh: () => {} });
export const useRefresh = () => useContext(RefreshCtx);
export function RefreshProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return <RefreshCtx.Provider value={{ tick, refresh }}>{children}</RefreshCtx.Provider>;
}

/** Carica dati da un endpoint e li ricarica quando cambia il tick globale o il path. */
export function useApi<T>(path: string | null) {
  const { tick } = useRefresh();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    api.get<T>(path).then((d) => { if (alive) { setData(d); setError(null); } }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [path, tick, local]);
  return { data, error, reload: () => setLocal((x) => x + 1), setData };
}

/** Esegue un'azione mostrando toast di successo/errore e aggiornando l'app. */
export function useAction() {
  const toast = useToast();
  const { refresh } = useRefresh();
  return useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    try {
      const r = await fn();
      if (ok) toast(ok);
      refresh();
      return r;
    } catch (e) {
      toast((e as Error).message, true);
      return undefined;
    }
  }, [toast, refresh]);
}

// ───── Modale ─────
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(820px,100%)' } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn sm" onClick={onClose} aria-label="Chiudi"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = 'Conferma', danger, requireText, onConfirm, onClose }: {
  title: string; text: ReactNode; confirmLabel?: string; danger?: boolean; requireText?: string; onConfirm: () => Promise<unknown> | void; onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="muted">{text}</div>
      {requireText && (
        <label className="field"><span>Scrivi <b style={{ color: '#fff' }}>{requireText}</b> per confermare</span>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></label>
      )}
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Annulla</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy || (!!requireText && typed !== requireText)}
          onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } finally { setBusy(false); } }}>
          {busy ? <span className="spinner" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ───── Card con riflesso che segue il mouse ─────
export function SpotCard({ className = '', children, onClick, style }: { className?: string; children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <div ref={ref} className={`card spot ${className}`} onMouseMove={move} onClick={onClick} style={style}>{children}</div>;
}

export function SectionTitle({ idx, total, children, right }: { idx: number; total: number; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title spread">
      <div className="row" style={{ gap: 18, alignItems: 'baseline' }}>
        <span className="idx">[ {String(idx).padStart(2, '0')} / {String(total).padStart(2, '0')} ]</span>
        <h2>{children}</h2>
      </div>
      {right}
    </div>
  );
}

export function PageHead({ label, title, children }: { label: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head fade-in">
      <div><div className="label">{label}</div><h1>{title}</h1></div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

export function Loading() { return <div className="loading"><div className="spinner" /></div>; }
export function ErrorBox({ error }: { error: string }) { return <div className="callout danger">{error}</div>; }
export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="empty">{icon ?? <Inbox />}<div>{children}</div></div>;
}
