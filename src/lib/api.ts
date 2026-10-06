// Client API: aggiunge l'header anti-CSRF e gestisce gli errori in modo uniforme.
export class ApiError extends Error {
  constructor(message: string, public status: number, public issues?: string[]) { super(message); }
}

import { demoGet, DEMO_READONLY } from '../demo/mock';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (import.meta.env.VITE_DEMO) {
    await new Promise((r) => setTimeout(r, 120));
    if (method !== 'GET') throw new ApiError(DEMO_READONLY, 403);
    try { return demoGet(path) as T; } catch (e) { throw new ApiError((e as Error).message, 404); }
  }
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'x-requested-with': 'rf-coaching', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // sessione Cloudflare Access scaduta → ricarica per rifare il login
    window.location.reload();
    throw new ApiError('Sessione scaduta', 401);
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(data?.issues?.join(' · ') || data?.error || `Errore ${res.status}`, res.status, data?.issues);
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

// ───── Tipi condivisi ─────
export type Mode = 'live' | 'online' | 'misto';
export interface ClientSummary {
  id: string; first_name: string; last_name: string; name: string; email: string; phone: string; mode: Mode;
  program_months: number; start_date: string; end_date: string; price_total_cents: number; notes: string; archived_at: string | null;
  created_at: string; status: 'attivo' | 'in_scadenza' | 'scaduto' | 'archiviato' | 'non_iniziato'; month: number;
  lessons_done: number; lessons_missed: number;
  last_session: { starts_at: string; kind: string } | null;
  next_session: { id: string; starts_at: string; kind: string } | null;
  payments_total: number; payments_paid: number; overdue_count: number; overdue_cents: number; oldest_overdue_days: number;
  next_due: { amount_cents: number; due_date: string } | null;
}
export interface Payment {
  id: string; client_id: string; label: string; amount_cents: number; due_date: string; paid_at: string | null;
  paid_amount_cents: number | null; method: string | null; notes: string; state: 'pagato' | 'scaduto' | 'da_incassare' | 'programmato';
  name?: string; phone?: string; first_name?: string;
}
export interface Session {
  id: string; client_id: string | null; lead_id: string | null; kind: 'lezione' | 'consulenza' | 'visita'; starts_at: string;
  duration_min: number; mode: 'live' | 'online'; location: string; status: 'programmata' | 'svolta' | 'saltata' | 'annullata';
  notes: string; gcal_status: string; gcal_error: string | null; person?: string;
}
export interface Lead {
  id: string; first_name: string; last_name: string; email: string; phone: string; source: string; notes: string;
  status: 'da_fare' | 'svolta' | 'convertito' | 'perso'; client_id: string | null; visit_at: string | null; created_at: string;
}
