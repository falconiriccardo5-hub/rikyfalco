// Logica di dominio: stato clienti, riepiloghi, automazioni (notifiche e messaggi).
import type { Env } from './types';
import { all, first, getSetting, uid } from './db';
import { addDays, daysBetween, isoNow, romeNow } from './time';

export interface ClientRow {
  id: string; first_name: string; last_name: string; email: string; phone: string;
  mode: 'live' | 'online' | 'misto'; program_months: number; start_date: string; end_date: string;
  price_total_cents: number; notes: string; archived_at: string | null; created_at: string; updated_at: string;
}
export interface PaymentRow {
  id: string; client_id: string; label: string; amount_cents: number; due_date: string; paid_at: string | null;
  paid_amount_cents: number | null; method: string | null; notes: string; created_at: string; updated_at: string;
}
export interface SessionRow {
  id: string; client_id: string | null; lead_id: string | null; kind: string; starts_at: string; duration_min: number;
  mode: string; location: string; status: string; notes: string; gcal_event_id: string | null; gcal_status: string;
  gcal_error: string | null; created_at: string; updated_at: string;
}

export const fullName = (c: { first_name: string; last_name: string }) => `${c.first_name} ${c.last_name}`.trim();

export type ClientStatus = 'attivo' | 'in_scadenza' | 'scaduto' | 'archiviato' | 'non_iniziato';

export function clientStatus(c: ClientRow, today: string): ClientStatus {
  if (c.archived_at) return 'archiviato';
  if (c.start_date > today) return 'non_iniziato';
  if (c.end_date < today) return 'scaduto';
  if (daysBetween(today, c.end_date) <= 30) return 'in_scadenza';
  return 'attivo';
}

export function currentMonth(c: ClientRow, today: string): number {
  if (today < c.start_date) return 0;
  const [sy, sm, sd] = c.start_date.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - sy) * 12 + (tm - sm) + (td >= sd ? 1 : 0);
  if (months < 1) months = 1;
  return Math.min(months, c.program_months);
}

export function paymentState(p: PaymentRow, today: string): 'pagato' | 'scaduto' | 'da_incassare' | 'programmato' {
  if (p.paid_at) return 'pagato';
  if (p.due_date < today) return 'scaduto';
  if (daysBetween(today, p.due_date) <= 7) return 'da_incassare';
  return 'programmato';
}

export async function clientSummaries(env: Env, opts: { id?: string } = {}) {
  const { date: today, local: nowLocal } = romeNow();
  const clients = opts.id
    ? await all<ClientRow>(env.DB, 'SELECT * FROM clients WHERE id = ?', opts.id)
    : await all<ClientRow>(env.DB, 'SELECT * FROM clients ORDER BY first_name, last_name');
  const payments = opts.id
    ? await all<PaymentRow>(env.DB, 'SELECT * FROM payments WHERE client_id = ? ORDER BY due_date', opts.id)
    : await all<PaymentRow>(env.DB, 'SELECT * FROM payments ORDER BY due_date');
  const sessions = opts.id
    ? await all<SessionRow>(env.DB, "SELECT * FROM sessions WHERE client_id = ? ORDER BY starts_at", opts.id)
    : await all<SessionRow>(env.DB, "SELECT * FROM sessions WHERE client_id IS NOT NULL ORDER BY starts_at");

  return clients.map((c) => {
    const ps = payments.filter((p) => p.client_id === c.id);
    const ss = sessions.filter((s) => s.client_id === c.id);
    const allDone = ss.filter((s) => s.status === 'svolta');
    const done = allDone.filter((s) => s.starts_at >= c.start_date); // lezioni del percorso corrente
    const last = allDone.filter((s) => s.starts_at <= nowLocal).at(-1) ?? null;
    const next = ss.find((s) => s.status === 'programmata' && s.starts_at >= nowLocal) ?? null;
    const overdue = ps.filter((p) => paymentState(p, today) === 'scaduto');
    const nextDue = ps.find((p) => !p.paid_at && p.due_date >= today) ?? null;
    return {
      ...c,
      name: fullName(c),
      status: clientStatus(c, today),
      month: currentMonth(c, today),
      lessons_done: done.length,
      lessons_missed: ss.filter((s) => s.status === 'saltata' && s.starts_at >= c.start_date).length,
      last_session: last ? { starts_at: last.starts_at, kind: last.kind } : null,
      next_session: next ? { id: next.id, starts_at: next.starts_at, kind: next.kind } : null,
      payments_total: ps.length,
      payments_paid: ps.filter((p) => p.paid_at).length,
      overdue_count: overdue.length,
      overdue_cents: overdue.reduce((s, p) => s + p.amount_cents, 0),
      oldest_overdue_days: overdue.length ? daysBetween(overdue[0].due_date, today) : 0,
      next_due: nextDue ? { amount_cents: nextDue.amount_cents, due_date: nextDue.due_date } : null,
    };
  });
}

// ───────────── Template messaggi ─────────────

export const DEFAULT_TEMPLATES: Record<string, string> = {
  rata_scaduta: 'Ciao {nome}, ti ricordo che la rata di {importo} con scadenza {data} risulta ancora da saldare. Quando riesci fammi sapere 🙏',
  rata_in_arrivo: 'Ciao {nome}, ti ricordo che il {data} scade la rata di {importo}. Grazie!',
  promemoria_lezione: 'Ciao {nome}, ti ricordo la {tipo} di domani {data} alle {ora}. A domani! 💪',
  rinnovo: 'Ciao {nome}, il tuo percorso si conclude il {data}. Ti va di sentirci per parlare del rinnovo?',
};

export async function getTemplates(env: Env): Promise<Record<string, string>> {
  const raw = await getSetting(env.DB, 'message_templates');
  let saved: Record<string, string> = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { /* default */ }
  return { ...DEFAULT_TEMPLATES, ...saved };
}

export const euro = (cents: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const itDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

function fill(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/**
 * Genera notifiche e messaggi da inviare in modo idempotente (dedupe_key).
 * Eseguita dal cron orario e all'apertura della dashboard.
 */
export async function refreshAutomations(env: Env) {
  const { date: today, local: nowLocal } = romeNow();
  const tpl = await getTemplates(env);
  const stmts: D1PreparedStatement[] = [];
  const now = isoNow();
  const notif = (key: string, kind: string, title: string, body: string, link: string) =>
    stmts.push(env.DB.prepare('INSERT OR IGNORE INTO notifications (id, kind, title, body, link, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(uid(), kind, title, body, link, key, now));
  const msg = (key: string, clientId: string, kind: string, body: string) =>
    stmts.push(env.DB.prepare('INSERT OR IGNORE INTO messages (id, client_id, kind, body, dedupe_key, created_at) VALUES (?,?,?,?,?,?)')
      .bind(uid(), clientId, kind, body, key, now));

  const clients = await all<ClientRow>(env.DB, 'SELECT * FROM clients WHERE archived_at IS NULL');
  const byId = new Map(clients.map((c) => [c.id, c]));

  // Rate scadute / in arrivo
  const unpaid = await all<PaymentRow>(env.DB, 'SELECT * FROM payments WHERE paid_at IS NULL AND due_date <= ?', addDays(today, 3));
  for (const p of unpaid) {
    const c = byId.get(p.client_id);
    if (!c) continue;
    const vars = { nome: c.first_name, importo: euro(p.amount_cents), data: itDate(p.due_date) };
    if (p.due_date < today) {
      notif(`pay-overdue:${p.id}`, 'pagamento', `Rata scaduta · ${fullName(c)}`, `${euro(p.amount_cents)} scaduta il ${itDate(p.due_date)}`, `/clients/${c.id}`);
      msg(`pay-overdue:${p.id}`, c.id, 'rata_scaduta', fill(tpl.rata_scaduta, vars));
    } else {
      msg(`pay-soon:${p.id}`, c.id, 'rata_in_arrivo', fill(tpl.rata_in_arrivo, vars));
    }
  }

  // Promemoria lezioni di domani
  const tomorrow = addDays(today, 1);
  const tomorrowSessions = await all<SessionRow>(env.DB,
    "SELECT * FROM sessions WHERE status = 'programmata' AND client_id IS NOT NULL AND substr(starts_at,1,10) = ?", tomorrow);
  for (const s of tomorrowSessions) {
    const c = byId.get(s.client_id!);
    if (!c) continue;
    msg(`sess-remind:${s.id}:${s.starts_at}`, c.id, 'promemoria_lezione',
      fill(tpl.promemoria_lezione, { nome: c.first_name, tipo: s.kind, data: itDate(s.starts_at.slice(0, 10)), ora: s.starts_at.slice(11, 16) }));
  }

  // Percorsi in scadenza (≤ 30 giorni)
  for (const c of clients) {
    if (c.end_date >= today && daysBetween(today, c.end_date) <= 30) {
      notif(`renew:${c.id}:${c.end_date}`, 'rinnovo', `Percorso in scadenza · ${fullName(c)}`, `Termina il ${itDate(c.end_date)}`, `/clients/${c.id}`);
      msg(`renew:${c.id}:${c.end_date}`, c.id, 'rinnovo', fill(tpl.rinnovo, { nome: c.first_name, data: itDate(c.end_date) }));
    }
  }

  // Appuntamenti passati da confermare
  const toConfirm = await all<SessionRow & { person: string }>(env.DB,
    `SELECT s.*, COALESCE(c.first_name || ' ' || c.last_name, l.first_name || ' ' || l.last_name, '') AS person
     FROM sessions s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN leads l ON l.id = s.lead_id
     WHERE s.status = 'programmata' AND s.starts_at < ?`, nowLocal);
  for (const s of toConfirm) {
    notif(`confirm:${s.id}:${s.starts_at}`, 'presenza', `Conferma presenza · ${s.person.trim()}`,
      `${s.kind} del ${itDate(s.starts_at.slice(0, 10))} alle ${s.starts_at.slice(11, 16)}`, '/');
  }

  // Pulizia: messaggi ancora da inviare non più validi (rata pagata nel frattempo)
  stmts.push(env.DB.prepare(`UPDATE messages SET status = 'ignorato' WHERE status = 'da_inviare' AND kind IN ('rata_scaduta','rata_in_arrivo')
    AND substr(dedupe_key, instr(dedupe_key, ':') + 1) IN (SELECT id FROM payments WHERE paid_at IS NOT NULL)`));

  if (stmts.length) {
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  }
}

export async function dashboard(env: Env) {
  await refreshAutomations(env);
  const { date: today, local: nowLocal } = romeNow();
  const summaries = await clientSummaries(env);
  const active = summaries.filter((c) => c.status !== 'archiviato' && c.status !== 'scaduto');

  const lessonsToday = await first<{ n: number }>(env.DB,
    "SELECT COUNT(*) AS n FROM sessions WHERE substr(starts_at,1,10) = ? AND status != 'annullata'", today);

  const overdue = await all<PaymentRow & { first_name: string; last_name: string; phone: string }>(env.DB,
    `SELECT p.*, c.first_name, c.last_name, c.phone FROM payments p JOIN clients c ON c.id = p.client_id
     WHERE p.paid_at IS NULL AND p.due_date < ? AND c.archived_at IS NULL ORDER BY p.due_date`, today);

  const toConfirm = await all<SessionRow & { person: string }>(env.DB,
    `SELECT s.*, TRIM(COALESCE(c.first_name || ' ' || c.last_name, l.first_name || ' ' || l.last_name, '')) AS person
     FROM sessions s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN leads l ON l.id = s.lead_id
     WHERE s.status = 'programmata' AND s.starts_at < ? ORDER BY s.starts_at DESC LIMIT 50`, nowLocal);

  const pendingMessages = await first<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM messages WHERE status = 'da_inviare'");

  return {
    today,
    clients: active,
    clients_count: summaries.filter((c) => c.status !== 'archiviato').length,
    lessons_today: lessonsToday?.n ?? 0,
    overdue_total_cents: overdue.reduce((s, p) => s + p.amount_cents, 0),
    todo: {
      overdue: overdue.map((p) => ({ ...p, name: fullName(p), days: daysBetween(p.due_date, today) })),
      to_confirm: toConfirm,
      expiring: summaries.filter((c) => c.status === 'in_scadenza').map((c) => ({ id: c.id, name: c.name, end_date: c.end_date })),
    },
    pending_messages: pendingMessages?.n ?? 0,
  };
}

export async function badges(env: Env) {
  const n = await first<{ n: number }>(env.DB, 'SELECT COUNT(*) AS n FROM notifications WHERE read_at IS NULL');
  const m = await first<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM messages WHERE status = 'da_inviare'");
  return { notifications: n?.n ?? 0, messages: m?.n ?? 0 };
}
