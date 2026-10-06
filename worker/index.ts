import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppEnv, Env } from './types';
import { authenticate } from './auth';
import { ensureMigrated } from './migrate';
import { MIGRATIONS } from './migrations';
import { all, first, getSetting, logActivity, run, setSetting, uid } from './db';
import { addDays, addMonths, isoNow, romeNow } from './time';
import {
  badges, clientSummaries, dashboard, DEFAULT_TEMPLATES, fullName, getTemplates, paymentState, refreshAutomations,
  type ClientRow, type PaymentRow, type SessionRow,
} from './domain';
import * as google from './google';
import { appsScriptCode } from './apps-script';
import { backupIfChanged, exportCsvs, listDriveBackups, readDriveBackup, restoreFromCsvs, runDriveBackup } from './backup';
import { toCsv } from './csv';

const app = new Hono<AppEnv>();

// ───────────── Sicurezza ─────────────

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:",
    "font-src 'self'", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'", "object-src 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function withHeaders(res: Response, extra: Record<string, string> = {}): Response {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) r.headers.set(k, v);
  return r;
}

app.use('*', async (c, next) => {
  const auth = await authenticate(c.req.raw, c.env);
  const isApi = c.req.path.startsWith('/api/');
  if (auth.email === null) {
    const reason = escapeHtml(auth.reason);
    return withHeaders(isApi
      ? Response.json({ error: 'Non autorizzato', reason: auth.reason }, { status: 401 })
      : new Response(`<!doctype html><meta charset="utf-8"><title>Accesso negato</title><body style="background:#07070b;color:#ddd;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;padding:16px;box-sizing:border-box"><div style="max-width:560px;text-align:center"><p>Accesso negato. Effettua il login tramite Cloudflare Access.</p><p style="color:#999;font-size:14px;word-break:break-all">Motivo: ${reason}</p></div>`, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } }));
  }
  const email = auth.email;
  c.set('email', email);
  await ensureMigrated(c.env.DB, MIGRATIONS);

  if (isApi && c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    // Anti-CSRF: header personalizzato (non impostabile da form di altri siti) + controllo Origin
    if (c.req.header('x-requested-with') !== 'rf-coaching') return withHeaders(Response.json({ error: 'Richiesta non valida' }, { status: 403 }));
    const origin = c.req.header('origin');
    if (origin && origin !== new URL(c.req.url).origin) return withHeaders(Response.json({ error: 'Origine non valida' }, { status: 403 }));
  }
  await next();
  c.res = withHeaders(c.res, isApi ? { 'Cache-Control': 'no-store' } : {});
});

app.use('/api/*', bodyLimit({ maxSize: 8 * 1024 * 1024, onError: (c) => c.json({ error: 'Richiesta troppo grande' }, 413) }));

app.onError((err, c) => {
  if (err instanceof z.ZodError) return c.json({ error: 'Dati non validi', issues: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, 400);
  console.error(err);
  return c.json({ error: (err as Error).message || 'Errore interno' }, 500);
});

const actor = (c: Context<AppEnv>) => c.get('email');

// ───────────── Schemi di validazione ─────────────

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data non valida');
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'data/ora non valida');
const text = (max = 200) => z.string().trim().max(max);
const cents = z.number().int().min(0).max(100_000_000);
const MODES = ['live', 'online', 'misto'] as const;
const METHODS = ['contanti', 'bonifico', 'carta', 'paypal', 'satispay', 'altro'] as const;

const clientBase = z.object({
  first_name: text(80).min(1, 'nome obbligatorio'),
  last_name: text(80).default(''),
  email: z.union([z.literal(''), z.string().trim().email().max(200)]).default(''),
  phone: text(40).regex(/^[+0-9 ()./-]*$/, 'telefono non valido').default(''),
  mode: z.enum(MODES).default('misto'),
  program_months: z.number().int().min(1).max(60).default(12),
  start_date: dateStr,
  price_total_cents: cents.default(0),
  notes: text(5000).default(''),
});
const planSchema = z.object({
  installments: z.number().int().min(0).max(60).default(0),
  first_due_date: dateStr.optional(),
});

function buildPlan(clientId: string, total: number, n: number, firstDue: string, label = 'Rata') {
  if (!n || !total) return [];
  const base = Math.floor(total / n);
  const rest = total - base * n;
  const now = isoNow();
  return Array.from({ length: n }, (_, i) => ({
    id: uid(), client_id: clientId, label: `${label} ${i + 1}/${n}`, amount_cents: base + (i === 0 ? rest : 0),
    due_date: addMonths(firstDue, i), created_at: now, updated_at: now,
  }));
}

function insertPayments(env: Env, rows: ReturnType<typeof buildPlan>) {
  return rows.map((p) => env.DB.prepare('INSERT INTO payments (id, client_id, label, amount_cents, due_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(p.id, p.client_id, p.label, p.amount_cents, p.due_date, p.created_at, p.updated_at));
}

// ───────────── Sessioni ↔ Google Calendar ─────────────

async function syncSessionById(env: Env, id: string) {
  const s = await first<SessionRow & { person: string }>(env.DB,
    `SELECT s.*, TRIM(COALESCE(c.first_name || ' ' || c.last_name, l.first_name || ' ' || l.last_name, 'Appuntamento')) AS person
     FROM sessions s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN leads l ON l.id = s.lead_id WHERE s.id = ?`, id);
  if (s) await google.syncSession(env, s);
}

async function syncPending(env: Env, limit = 40) {
  if (!(await google.isConnected(env))) return 0;
  const rows = await all<{ id: string }>(env.DB, "SELECT id FROM sessions WHERE gcal_status IN ('pending','error','off') AND starts_at >= ? ORDER BY starts_at LIMIT ?", addDays(romeNow().date, -60), limit);
  for (const r of rows) await syncSessionById(env, r.id);
  return rows.length;
}

// ───────────── API: generali ─────────────

app.get('/api/me', async (c) => c.json({ email: actor(c), coach_name: (await getSetting(c.env.DB, 'coach_name')) || 'Riccardo Falconi', badges: await badges(c.env) }));
app.get('/api/badges', async (c) => c.json(await badges(c.env)));
app.get('/api/dashboard', async (c) => c.json(await dashboard(c.env)));

app.get('/api/search', async (c) => {
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  if (!q) return c.json({ clients: [], leads: [] });
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const clients = await all(c.env.DB, `SELECT id, first_name, last_name, email, phone, archived_at FROM clients
    WHERE first_name || ' ' || last_name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY first_name LIMIT 10`, like, like, like);
  const leads = await all(c.env.DB, `SELECT id, first_name, last_name, status FROM leads WHERE first_name || ' ' || last_name LIKE ? LIMIT 5`, like);
  return c.json({ clients, leads });
});

// ───────────── API: clienti ─────────────

app.get('/api/clients', async (c) => c.json(await clientSummaries(c.env)));

app.post('/api/clients', async (c) => {
  const body = await c.req.json();
  const d = clientBase.parse(body);
  const plan = planSchema.parse(body);
  const id = uid();
  const now = isoNow();
  const end = addDays(addMonths(d.start_date, d.program_months), -1);
  const stmts = [
    c.env.DB.prepare(`INSERT INTO clients (id, first_name, last_name, email, phone, mode, program_months, start_date, end_date, price_total_cents, notes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, d.first_name, d.last_name, d.email, d.phone, d.mode, d.program_months, d.start_date, end, d.price_total_cents, d.notes, now, now),
    ...insertPayments(c.env, buildPlan(id, d.price_total_cents, plan.installments, plan.first_due_date || d.start_date)),
  ];
  await c.env.DB.batch(stmts);
  await logActivity(c.env, actor(c), 'creato', 'cliente', id, `Nuovo cliente ${fullName(d)}`);
  return c.json({ id }, 201);
});

app.get('/api/clients/:id', async (c) => {
  const id = c.req.param('id');
  const [summary] = await clientSummaries(c.env, { id });
  if (!summary) return c.json({ error: 'Cliente non trovato' }, 404);
  const today = romeNow().date;
  const payments = (await all<PaymentRow>(c.env.DB, 'SELECT * FROM payments WHERE client_id = ? ORDER BY due_date', id)).map((p) => ({ ...p, state: paymentState(p, today) }));
  const sessions = await all<SessionRow>(c.env.DB, 'SELECT * FROM sessions WHERE client_id = ? ORDER BY starts_at DESC', id);
  const activity = await all(c.env.DB, 'SELECT * FROM activity WHERE entity_id = ? ORDER BY id DESC LIMIT 30', id);
  return c.json({ client: summary, payments, sessions, activity });
});

app.patch('/api/clients/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<ClientRow>(c.env.DB, 'SELECT * FROM clients WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Cliente non trovato' }, 404);
  const d = clientBase.partial().parse(await c.req.json());
  const merged = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as ClientRow;
  merged.end_date = addDays(addMonths(merged.start_date, merged.program_months), -1);
  await run(c.env.DB, `UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, mode=?, program_months=?, start_date=?, end_date=?, price_total_cents=?, notes=?, updated_at=? WHERE id=?`,
    merged.first_name, merged.last_name, merged.email, merged.phone, merged.mode, merged.program_months, merged.start_date, merged.end_date, merged.price_total_cents, merged.notes, isoNow(), id);
  await logActivity(c.env, actor(c), 'modificato', 'cliente', id, `Modificato ${fullName(merged)}`);
  // Il nome compare negli eventi del calendario: riallinea le sessioni future
  if (d.first_name !== undefined || d.last_name !== undefined) {
    await run(c.env.DB, "UPDATE sessions SET gcal_status = 'pending' WHERE client_id = ? AND starts_at >= ?", id, romeNow().local);
    c.executionCtx.waitUntil(syncPending(c.env));
  }
  return c.json({ ok: true });
});

app.post('/api/clients/:id/archive', async (c) => {
  const id = c.req.param('id');
  const archive = (await c.req.json().catch(() => ({}))).archive !== false;
  await run(c.env.DB, 'UPDATE clients SET archived_at = ?, updated_at = ? WHERE id = ?', archive ? isoNow() : null, isoNow(), id);
  await logActivity(c.env, actor(c), archive ? 'archiviato' : 'ripristinato', 'cliente', id, archive ? 'Cliente archiviato' : 'Cliente riattivato');
  return c.json({ ok: true });
});

app.post('/api/clients/:id/renew', async (c) => {
  const id = c.req.param('id');
  const cur = await first<ClientRow>(c.env.DB, 'SELECT * FROM clients WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Cliente non trovato' }, 404);
  const body = await c.req.json();
  const d = z.object({ program_months: z.number().int().min(1).max(60), price_total_cents: cents, start_date: dateStr.optional() }).parse(body);
  const plan = planSchema.parse(body);
  const start = d.start_date || addDays(cur.end_date, 1);
  const end = addDays(addMonths(start, d.program_months), -1);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE clients SET program_months=?, start_date=?, end_date=?, price_total_cents=?, archived_at=NULL, updated_at=? WHERE id=?')
      .bind(d.program_months, start, end, d.price_total_cents, isoNow(), id),
    ...insertPayments(c.env, buildPlan(id, d.price_total_cents, plan.installments, plan.first_due_date || start, 'Rinnovo')),
  ]);
  await logActivity(c.env, actor(c), 'rinnovo', 'cliente', id, `Rinnovo ${fullName(cur)} · ${d.program_months} mesi`);
  return c.json({ ok: true });
});

app.delete('/api/clients/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<ClientRow>(c.env.DB, 'SELECT * FROM clients WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Cliente non trovato' }, 404);
  const confirm = c.req.query('confirm');
  if (confirm !== fullName(cur)) return c.json({ error: 'Conferma il nome del cliente per eliminarlo' }, 400);
  const events = await all<{ gcal_event_id: string }>(c.env.DB, 'SELECT gcal_event_id FROM sessions WHERE client_id = ? AND gcal_event_id IS NOT NULL', id);
  await run(c.env.DB, 'DELETE FROM clients WHERE id = ?', id);
  await logActivity(c.env, actor(c), 'eliminato', 'cliente', id, `Eliminato ${fullName(cur)}`);
  c.executionCtx.waitUntil(Promise.all(events.map((e) => google.deleteEvent(c.env, e.gcal_event_id))));
  return c.json({ ok: true });
});

// ───────────── API: pagamenti ─────────────

app.get('/api/payments', async (c) => {
  const today = romeNow().date;
  const rows = await all<PaymentRow & { first_name: string; last_name: string; phone: string; archived_at: string | null }>(c.env.DB,
    'SELECT p.*, c.first_name, c.last_name, c.phone, c.archived_at FROM payments p JOIN clients c ON c.id = p.client_id ORDER BY p.due_date');
  const payments = rows.map((p) => ({ ...p, name: fullName(p), state: paymentState(p, today) }));

  const month = today.slice(0, 7);
  const paidIn = (m: string) => payments.filter((p) => p.paid_at && p.paid_at.slice(0, 7) === m).reduce((s, p) => s + (p.paid_amount_cents ?? p.amount_cents), 0);
  const dueIn = (m: string) => payments.filter((p) => p.due_date.slice(0, 7) === m).reduce((s, p) => s + p.amount_cents, 0);
  const sum = (st: string[]) => payments.filter((p) => st.includes(p.state)).reduce((s, p) => s + p.amount_cents, 0);
  const chart = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month + '-01', i - 5).slice(0, 7);
    return { month: m, paid: paidIn(m), expected: dueIn(m) };
  });
  return c.json({
    kpi: { incassato_mese: paidIn(month), da_incassare: sum(['scaduto', 'da_incassare']), scaduto: sum(['scaduto']), programmato: sum(['programmato']) },
    chart,
    payments,
  });
});

const paymentSchema = z.object({
  client_id: z.string().uuid(), label: text(120).default(''), amount_cents: cents, due_date: dateStr, notes: text(1000).default(''),
});

app.post('/api/payments', async (c) => {
  const d = paymentSchema.parse(await c.req.json());
  if (!(await first(c.env.DB, 'SELECT id FROM clients WHERE id = ?', d.client_id))) return c.json({ error: 'Cliente non trovato' }, 404);
  const id = uid(); const now = isoNow();
  await run(c.env.DB, 'INSERT INTO payments (id, client_id, label, amount_cents, due_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    id, d.client_id, d.label || 'Rata', d.amount_cents, d.due_date, d.notes, now, now);
  await logActivity(c.env, actor(c), 'creato', 'pagamento', d.client_id, `Nuova rata ${(d.amount_cents / 100).toFixed(2)} € · scadenza ${d.due_date}`);
  return c.json({ id }, 201);
});

app.patch('/api/payments/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<PaymentRow>(c.env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Pagamento non trovato' }, 404);
  const d = paymentSchema.omit({ client_id: true }).partial().parse(await c.req.json());
  const m = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as PaymentRow;
  await run(c.env.DB, 'UPDATE payments SET label=?, amount_cents=?, due_date=?, notes=?, updated_at=? WHERE id=?', m.label, m.amount_cents, m.due_date, m.notes, isoNow(), id);
  await logActivity(c.env, actor(c), 'modificato', 'pagamento', cur.client_id, `Rata modificata (${m.label})`);
  return c.json({ ok: true });
});

app.post('/api/payments/:id/pay', async (c) => {
  const id = c.req.param('id');
  const cur = await first<PaymentRow>(c.env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Pagamento non trovato' }, 404);
  const d = z.object({ amount_cents: cents.optional(), method: z.enum(METHODS).default('bonifico'), paid_at: dateStr.optional() }).parse(await c.req.json().catch(() => ({})));
  const amount = d.amount_cents ?? cur.amount_cents;
  const paidAt = d.paid_at || romeNow().date;
  const stmts = [c.env.DB.prepare('UPDATE payments SET paid_at=?, paid_amount_cents=?, method=?, updated_at=? WHERE id=?').bind(paidAt, amount, d.method, isoNow(), id)];
  // Pagamento parziale: il residuo diventa una nuova rata con la stessa scadenza
  if (amount < cur.amount_cents) {
    const now = isoNow();
    stmts.push(c.env.DB.prepare('INSERT INTO payments (id, client_id, label, amount_cents, due_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(uid(), cur.client_id, `${cur.label} (residuo)`, cur.amount_cents - amount, cur.due_date, '', now, now));
  }
  await c.env.DB.batch(stmts);
  await logActivity(c.env, actor(c), 'incassato', 'pagamento', cur.client_id, `Incassati ${(amount / 100).toFixed(2)} € (${d.method}) · ${cur.label}`);
  return c.json({ ok: true });
});

app.post('/api/payments/:id/unpay', async (c) => {
  const id = c.req.param('id');
  const cur = await first<PaymentRow>(c.env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Pagamento non trovato' }, 404);
  await run(c.env.DB, 'UPDATE payments SET paid_at=NULL, paid_amount_cents=NULL, method=NULL, updated_at=? WHERE id=?', isoNow(), id);
  await logActivity(c.env, actor(c), 'annullato', 'pagamento', cur.client_id, `Incasso annullato · ${cur.label}`);
  return c.json({ ok: true });
});

app.delete('/api/payments/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<PaymentRow>(c.env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Pagamento non trovato' }, 404);
  await run(c.env.DB, 'DELETE FROM payments WHERE id = ?', id);
  await logActivity(c.env, actor(c), 'eliminato', 'pagamento', cur.client_id, `Rata eliminata · ${cur.label} ${(cur.amount_cents / 100).toFixed(2)} €`);
  return c.json({ ok: true });
});

// ───────────── API: calendario / sessioni ─────────────

app.get('/api/sessions', async (c) => {
  const from = dateStr.parse(c.req.query('from'));
  const to = dateStr.parse(c.req.query('to'));
  const rows = await all(c.env.DB,
    `SELECT s.*, TRIM(COALESCE(c.first_name || ' ' || c.last_name, l.first_name || ' ' || l.last_name, '')) AS person
     FROM sessions s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN leads l ON l.id = s.lead_id
     WHERE s.starts_at >= ? AND s.starts_at < ? ORDER BY s.starts_at`, from, addDays(to, 1));
  return c.json({ sessions: rows, google: { connected: await google.isConnected(c.env) } });
});

const sessionSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  kind: z.enum(['lezione', 'consulenza', 'visita']).default('lezione'),
  starts_at: localDateTime,
  duration_min: z.number().int().min(5).max(600).default(60),
  mode: z.enum(['live', 'online']).default('live'),
  location: text(200).default(''),
  notes: text(2000).default(''),
});

app.post('/api/sessions', async (c) => {
  const body = await c.req.json();
  const d = sessionSchema.parse(body);
  const repeat = z.number().int().min(1).max(52).default(1).parse(body.repeat_weeks ?? 1);
  if (!d.client_id && !d.lead_id) return c.json({ error: 'Seleziona un cliente o un contatto' }, 400);
  const now = isoNow();
  const ids: string[] = [];
  const stmts = [];
  for (let i = 0; i < repeat; i++) {
    const id = uid(); ids.push(id);
    const starts = `${addDays(d.starts_at.slice(0, 10), i * 7)}T${d.starts_at.slice(11)}`;
    stmts.push(c.env.DB.prepare(`INSERT INTO sessions (id, client_id, lead_id, kind, starts_at, duration_min, mode, location, notes, gcal_status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)`).bind(id, d.client_id ?? null, d.lead_id ?? null, d.kind, starts, d.duration_min, d.mode, d.location, d.notes, now, now));
  }
  await c.env.DB.batch(stmts);
  await logActivity(c.env, actor(c), 'creato', 'appuntamento', d.client_id ?? d.lead_id ?? null, `${d.kind} ${d.starts_at.replace('T', ' ')}${repeat > 1 ? ` (+${repeat - 1} settimane)` : ''}`);
  c.executionCtx.waitUntil((async () => { for (const id of ids) await syncSessionById(c.env, id); })());
  return c.json({ ids }, 201);
});

app.patch('/api/sessions/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<SessionRow>(c.env.DB, 'SELECT * FROM sessions WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Appuntamento non trovato' }, 404);
  const body = await c.req.json();
  const d = sessionSchema.partial().extend({ status: z.enum(['programmata', 'svolta', 'saltata', 'annullata']).optional() }).parse(body);
  const m = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as SessionRow;
  await run(c.env.DB, `UPDATE sessions SET kind=?, starts_at=?, duration_min=?, mode=?, location=?, notes=?, status=?, gcal_status='pending', updated_at=? WHERE id=?`,
    m.kind, m.starts_at, m.duration_min, m.mode, m.location, m.notes, m.status, isoNow(), id);
  if (d.status && d.status !== cur.status) {
    await run(c.env.DB, "UPDATE notifications SET read_at = ? WHERE dedupe_key LIKE ? AND read_at IS NULL", isoNow(), `confirm:${id}:%`);
  }
  await logActivity(c.env, actor(c), d.status ? `stato: ${d.status}` : 'modificato', 'appuntamento', m.client_id ?? m.lead_id, `${m.kind} ${m.starts_at.replace('T', ' ')}`);
  c.executionCtx.waitUntil(syncSessionById(c.env, id));
  return c.json({ ok: true });
});

app.delete('/api/sessions/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<SessionRow>(c.env.DB, 'SELECT * FROM sessions WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Appuntamento non trovato' }, 404);
  await run(c.env.DB, 'DELETE FROM sessions WHERE id = ?', id);
  await logActivity(c.env, actor(c), 'eliminato', 'appuntamento', cur.client_id ?? cur.lead_id, `${cur.kind} ${cur.starts_at.replace('T', ' ')}`);
  c.executionCtx.waitUntil(google.deleteEvent(c.env, cur.gcal_event_id));
  return c.json({ ok: true });
});

// ───────────── API: visite (contatti / consulenze conoscitive) ─────────────

const leadSchema = z.object({
  first_name: text(80).min(1, 'nome obbligatorio'), last_name: text(80).default(''),
  email: z.union([z.literal(''), z.string().trim().email().max(200)]).default(''),
  phone: text(40).regex(/^[+0-9 ()./-]*$/, 'telefono non valido').default(''),
  source: text(80).default(''), notes: text(5000).default(''),
  status: z.enum(['da_fare', 'svolta', 'convertito', 'perso']).default('da_fare'),
});

app.get('/api/leads', async (c) => {
  const leads = await all(c.env.DB, `SELECT l.*, (SELECT starts_at FROM sessions s WHERE s.lead_id = l.id AND s.status != 'annullata' ORDER BY starts_at DESC LIMIT 1) AS visit_at
    FROM leads l ORDER BY l.created_at DESC`);
  return c.json(leads);
});

app.post('/api/leads', async (c) => {
  const body = await c.req.json();
  const d = leadSchema.parse(body);
  const visit = z.object({ visit_at: localDateTime.optional(), duration_min: z.number().int().min(5).max(600).default(60), mode: z.enum(['live', 'online']).default('live') }).parse(body);
  const id = uid(); const now = isoNow();
  const stmts = [c.env.DB.prepare('INSERT INTO leads (id, first_name, last_name, email, phone, source, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id, d.first_name, d.last_name, d.email, d.phone, d.source, d.notes, d.status, now, now)];
  let sessionId: string | null = null;
  if (visit.visit_at) {
    sessionId = uid();
    stmts.push(c.env.DB.prepare(`INSERT INTO sessions (id, lead_id, kind, starts_at, duration_min, mode, gcal_status, created_at, updated_at) VALUES (?,?,'consulenza',?,?,?,'pending',?,?)`)
      .bind(sessionId, id, visit.visit_at, visit.duration_min, visit.mode, now, now));
  }
  await c.env.DB.batch(stmts);
  await logActivity(c.env, actor(c), 'creato', 'visita', id, `Nuovo contatto ${fullName(d)}`);
  if (sessionId) c.executionCtx.waitUntil(syncSessionById(c.env, sessionId));
  return c.json({ id }, 201);
});

app.patch('/api/leads/:id', async (c) => {
  const id = c.req.param('id');
  const cur = await first<Record<string, string>>(c.env.DB, 'SELECT * FROM leads WHERE id = ?', id);
  if (!cur) return c.json({ error: 'Contatto non trovato' }, 404);
  const d = leadSchema.partial().parse(await c.req.json());
  const m = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) };
  await run(c.env.DB, 'UPDATE leads SET first_name=?, last_name=?, email=?, phone=?, source=?, notes=?, status=?, updated_at=? WHERE id=?',
    m.first_name, m.last_name, m.email, m.phone, m.source, m.notes, m.status, isoNow(), id);
  await logActivity(c.env, actor(c), 'modificato', 'visita', id, `Contatto ${m.first_name} ${m.last_name}`.trim());
  return c.json({ ok: true });
});

app.post('/api/leads/:id/convert', async (c) => {
  const id = c.req.param('id');
  const lead = await first<{ id: string; first_name: string; last_name: string; email: string; phone: string; notes: string }>(c.env.DB, 'SELECT * FROM leads WHERE id = ?', id);
  if (!lead) return c.json({ error: 'Contatto non trovato' }, 404);
  const body = await c.req.json();
  const d = clientBase.parse({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone, notes: lead.notes, ...body });
  const plan = planSchema.parse(body);
  const clientId = uid(); const now = isoNow();
  const end = addDays(addMonths(d.start_date, d.program_months), -1);
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO clients (id, first_name, last_name, email, phone, mode, program_months, start_date, end_date, price_total_cents, notes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(clientId, d.first_name, d.last_name, d.email, d.phone, d.mode, d.program_months, d.start_date, end, d.price_total_cents, d.notes, now, now),
    c.env.DB.prepare("UPDATE leads SET status='convertito', client_id=?, updated_at=? WHERE id=?").bind(clientId, now, id),
    ...insertPayments(c.env, buildPlan(clientId, d.price_total_cents, plan.installments, plan.first_due_date || d.start_date)),
  ]);
  await logActivity(c.env, actor(c), 'convertito', 'cliente', clientId, `${fullName(d)} è diventato cliente`);
  return c.json({ id: clientId }, 201);
});

app.delete('/api/leads/:id', async (c) => {
  const id = c.req.param('id');
  const events = await all<{ gcal_event_id: string }>(c.env.DB, 'SELECT gcal_event_id FROM sessions WHERE lead_id = ? AND gcal_event_id IS NOT NULL', id);
  await run(c.env.DB, 'DELETE FROM leads WHERE id = ?', id);
  await logActivity(c.env, actor(c), 'eliminato', 'visita', id, 'Contatto eliminato');
  c.executionCtx.waitUntil(Promise.all(events.map((e) => google.deleteEvent(c.env, e.gcal_event_id))));
  return c.json({ ok: true });
});

// ───────────── API: notifiche e messaggi ─────────────

app.get('/api/notifications', async (c) => c.json(await all(c.env.DB, 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200')));
app.post('/api/notifications/read-all', async (c) => { await run(c.env.DB, 'UPDATE notifications SET read_at = ? WHERE read_at IS NULL', isoNow()); return c.json({ ok: true }); });
app.post('/api/notifications/:id/read', async (c) => { await run(c.env.DB, 'UPDATE notifications SET read_at = ? WHERE id = ?', isoNow(), c.req.param('id')); return c.json({ ok: true }); });
app.delete('/api/notifications/:id', async (c) => { await run(c.env.DB, 'DELETE FROM notifications WHERE id = ?', c.req.param('id')); return c.json({ ok: true }); });

app.get('/api/messages', async (c) => {
  const status = z.enum(['da_inviare', 'inviato', 'ignorato']).default('da_inviare').parse(c.req.query('status') || undefined);
  return c.json(await all(c.env.DB, `SELECT m.*, c.first_name, c.last_name, c.phone, c.email FROM messages m LEFT JOIN clients c ON c.id = m.client_id
    WHERE m.status = ? ORDER BY m.created_at DESC LIMIT 200`, status));
});
app.post('/api/messages/:id/status', async (c) => {
  const d = z.object({ status: z.enum(['da_inviare', 'inviato', 'ignorato']), body: text(2000).optional() }).parse(await c.req.json());
  if (d.body) await run(c.env.DB, 'UPDATE messages SET body = ? WHERE id = ?', d.body, c.req.param('id'));
  await run(c.env.DB, 'UPDATE messages SET status = ?, sent_at = ? WHERE id = ?', d.status, d.status === 'inviato' ? isoNow() : null, c.req.param('id'));
  if (d.status === 'inviato') await logActivity(c.env, actor(c), 'messaggio inviato', 'messaggio', c.req.param('id'), 'Messaggio segnato come inviato');
  return c.json({ ok: true });
});

// ───────────── API: report ─────────────

async function buildReport(env: Env, month: string) {
  const today = romeNow().date;
  const prev = addMonths(month + '-01', -1).slice(0, 7);
  const monthEnd = addDays(addMonths(month + '-01', 1), -1);
  const payments = await all<PaymentRow & { first_name: string; last_name: string }>(env.DB,
    'SELECT p.*, c.first_name, c.last_name FROM payments p JOIN clients c ON c.id = p.client_id');
  const paidIn = (m: string) => payments.filter((p) => p.paid_at?.slice(0, 7) === m);
  const amt = (p: PaymentRow) => p.paid_amount_cents ?? p.amount_cents;
  const received = paidIn(month);
  const incassato = received.reduce((s, p) => s + amt(p), 0);
  const incassatoPrev = paidIn(prev).reduce((s, p) => s + amt(p), 0);
  const open = payments.filter((p) => !p.paid_at && p.due_date <= monthEnd);
  const sessions = await all<SessionRow>(env.DB, 'SELECT * FROM sessions WHERE substr(starts_at,1,7) = ?', month);
  const renewals = await first<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM activity WHERE action = 'rinnovo' AND substr(ts,1,7) = ?", month);
  const expiringNotRenewed = await first<{ n: number }>(env.DB, 'SELECT COUNT(*) AS n FROM clients WHERE substr(end_date,1,7) = ?', month);
  const newClients = await first<{ n: number }>(env.DB, 'SELECT COUNT(*) AS n FROM clients WHERE substr(created_at,1,7) = ?', month);
  const started = await first<{ n: number }>(env.DB, 'SELECT COUNT(*) AS n FROM clients WHERE substr(start_date,1,7) = ?', month);
  const byMethod: Record<string, number> = {};
  for (const p of received) byMethod[p.method || 'altro'] = (byMethod[p.method || 'altro'] || 0) + amt(p);
  const r = renewals?.n ?? 0;
  return {
    month,
    incassato, incassato_prev: incassatoPrev, pagamenti_count: received.length,
    da_incassare: open.reduce((s, p) => s + p.amount_cents, 0),
    scaduto: open.filter((p) => p.due_date < today).reduce((s, p) => s + p.amount_cents, 0),
    rinnovi: { fatti: r, totale: r + (expiringNotRenewed?.n ?? 0) },
    lezioni: {
      svolte: sessions.filter((s) => s.status === 'svolta').length,
      saltate: sessions.filter((s) => s.status === 'saltata').length,
      in_calendario: sessions.filter((s) => s.status === 'programmata').length,
    },
    chart: Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(month + '-01', i - 11).slice(0, 7);
      return { month: m, paid: paidIn(m).reduce((s, p) => s + amt(p), 0) };
    }),
    clienti: { nuovi: newClients?.n ?? 0, iniziati: started?.n ?? 0, rinnovi: r },
    per_metodo: byMethod,
    ricevuti: received.sort((a, b) => (a.paid_at! < b.paid_at! ? -1 : 1)).map((p) => ({
      id: p.id, name: fullName(p), label: p.label, paid_at: p.paid_at, amount_cents: amt(p), method: p.method,
    })),
  };
}

app.get('/api/report', async (c) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(c.req.query('month') || romeNow().date.slice(0, 7));
  return c.json(await buildReport(c.env, month));
});

app.get('/api/report/export', async (c) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(c.req.query('month'));
  const r = await buildReport(c.env, month);
  const csv = toCsv(['data', 'cliente', 'descrizione', 'metodo', 'importo_eur'],
    r.ricevuti.map((p) => ({ data: p.paid_at, cliente: p.name, descrizione: p.label, metodo: p.method, importo_eur: (p.amount_cents / 100).toFixed(2).replace('.', ',') })));
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="report_${month}.csv"` } });
});

// ───────────── API: attività ─────────────

app.get('/api/activity', async (c) => {
  const before = Number(c.req.query('before')) || 9e15;
  return c.json(await all(c.env.DB, 'SELECT * FROM activity WHERE id < ? ORDER BY id DESC LIMIT 100', before));
});

// ───────────── API: backup ─────────────

app.get('/api/backup', async (c) => {
  const history = await all(c.env.DB, 'SELECT * FROM backups ORDER BY ts DESC LIMIT 30');
  const connected = await google.isConnected(c.env);
  let drive: google.DriveFile[] = [];
  let driveError: string | null = null;
  if (connected) { try { drive = await listDriveBackups(c.env); } catch (e) { driveError = (e as Error).message; } }
  return c.json({
    connected, history, drive, drive_error: driveError,
    auto: (await getSetting(c.env.DB, 'backup_auto')) !== 'false',
    retention: Number((await getSetting(c.env.DB, 'backup_retention')) || 60),
  });
});

app.post('/api/backup/run', async (c) => c.json(await runDriveBackup(c.env, 'manuale', actor(c))));

app.get('/api/backup/download', async (c) => {
  const { files, rows } = await exportCsvs(c.env);
  await logActivity(c.env, actor(c), 'download backup', 'backup', null, `Backup scaricato (${rows} righe)`);
  const name = `rf-coaching_backup_${romeNow().date}.zip`;
  const zip = files.find((f) => f.name === 'backup_completo.zip')!.content;
  return new Response(zip, { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${name}"` } });
});

app.post('/api/backup/restore', async (c) => {
  const d = z.object({ files: z.record(z.string(), z.string().max(6 * 1024 * 1024)), confirm: z.literal('RIPRISTINA') }).parse(await c.req.json());
  if (await google.isConnected(c.env)) await runDriveBackup(c.env, 'pre-ripristino', actor(c));
  const r = await restoreFromCsvs(c.env, d.files, actor(c));
  c.executionCtx.waitUntil(syncPending(c.env, 200));
  return c.json(r);
});

app.post('/api/backup/restore-drive', async (c) => {
  const d = z.object({ folder_id: z.string().min(5).max(200), confirm: z.literal('RIPRISTINA') }).parse(await c.req.json());
  const files = await readDriveBackup(c.env, d.folder_id);
  await runDriveBackup(c.env, 'pre-ripristino', actor(c));
  const r = await restoreFromCsvs(c.env, files, actor(c));
  c.executionCtx.waitUntil(syncPending(c.env, 200));
  return c.json(r);
});

// ───────────── API: impostazioni e Google ─────────────

app.get('/api/settings', async (c) => {
  const s = Object.fromEntries((await all<{ key: string; value: string }>(c.env.DB, 'SELECT key, value FROM settings WHERE key NOT IN (?, ?)', 'google_refresh_token', 'google_script_key')).map((r) => [r.key, r.value]));
  if (await getSetting(c.env.DB, 'google_refresh_token')) s.google_refresh_token = 'presente';
  return c.json({
    coach_name: s.coach_name || 'Riccardo Falconi',
    calendar_name: s.calendar_name || 'RF Coaching',
    default_duration: Number(s.default_duration || 60),
    backup_auto: s.backup_auto !== 'false',
    backup_retention: Number(s.backup_retention || 60),
    templates: await getTemplates(c.env),
    default_templates: DEFAULT_TEMPLATES,
    google: {
      configured: google.googleConfigured(c.env),
      connected: await google.isConnected(c.env),
      mode: s.google_script_url ? 'script' : s.google_refresh_token ? 'oauth' : null,
      account: s.google_account || null,
      calendar_id: s.google_calendar_id || null,
      drive_folder_id: s.google_drive_folder_id || null,
    },
    email: actor(c),
  });
});

app.put('/api/settings', async (c) => {
  const d = z.object({
    coach_name: text(60).min(1).optional(),
    calendar_name: text(80).min(1).optional(),
    default_duration: z.number().int().min(5).max(600).optional(),
    backup_auto: z.boolean().optional(),
    backup_retention: z.number().int().min(7).max(365).optional(),
    templates: z.record(z.enum(Object.keys(DEFAULT_TEMPLATES) as [string, ...string[]]), text(2000)).optional(),
  }).parse(await c.req.json());
  if (d.coach_name) await setSetting(c.env.DB, 'coach_name', d.coach_name);
  if (d.calendar_name) await setSetting(c.env.DB, 'calendar_name', d.calendar_name);
  if (d.default_duration) await setSetting(c.env.DB, 'default_duration', String(d.default_duration));
  if (d.backup_auto !== undefined) await setSetting(c.env.DB, 'backup_auto', String(d.backup_auto));
  if (d.backup_retention) await setSetting(c.env.DB, 'backup_retention', String(d.backup_retention));
  if (d.templates) await setSetting(c.env.DB, 'message_templates', JSON.stringify(d.templates));
  await logActivity(c.env, actor(c), 'modificato', 'impostazioni', null, `Impostazioni aggiornate (${Object.keys(d).join(', ')})`);
  return c.json({ ok: true });
});

// Collegamento senza Google Cloud Console: codice dello script da incollare su script.google.com
app.get('/api/google/script', async (c) => {
  const code = appsScriptCode(await google.scriptKey(c.env));
  return new Response(code, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
});

app.post('/api/google/script', async (c) => {
  const d = z.object({ url: z.string().trim().max(300) }).parse(await c.req.json());
  const account = await google.connectScript(c.env, d.url);
  await logActivity(c.env, actor(c), 'collegato', 'google', null, `Google collegato tramite script (${account || 'account'})`);
  await run(c.env.DB, "UPDATE sessions SET gcal_status = 'pending' WHERE status != 'annullata'");
  c.executionCtx.waitUntil(syncPending(c.env, 200));
  return c.json({ ok: true, account });
});

app.get('/api/google/connect', async (c) => {
  if (!google.googleConfigured(c.env)) return c.json({ error: 'Credenziali Google non configurate sul server' }, 400);
  return c.redirect(await google.buildAuthUrl(c.env));
});

app.get('/api/google/callback', async (c) => {
  const err = c.req.query('error');
  if (err) return c.redirect(`/settings?google=error&reason=${encodeURIComponent(err)}`);
  try {
    const account = await google.handleCallback(c.env, c.req.query('code') || '', c.req.query('state') || '');
    await logActivity(c.env, actor(c), 'collegato', 'google', null, `Google collegato (${account || 'account'})`);
    await run(c.env.DB, "UPDATE sessions SET gcal_status = 'pending' WHERE status != 'annullata'");
    c.executionCtx.waitUntil(syncPending(c.env, 200));
    return c.redirect('/settings?google=ok');
  } catch (e) {
    return c.redirect(`/settings?google=error&reason=${encodeURIComponent((e as Error).message.slice(0, 120))}`);
  }
});

app.post('/api/google/disconnect', async (c) => {
  await google.disconnect(c.env);
  await logActivity(c.env, actor(c), 'scollegato', 'google', null, 'Account Google scollegato e token revocato');
  return c.json({ ok: true });
});

app.post('/api/google/resync', async (c) => {
  await run(c.env.DB, "UPDATE sessions SET gcal_status = 'pending' WHERE status != 'annullata' AND starts_at >= ?", addDays(romeNow().date, -60));
  const n = await syncPending(c.env, 200);
  return c.json({ synced: n });
});

app.all('/api/*', (c) => c.json({ error: 'Endpoint non trovato' }, 404));

// ───────────── Frontend statico (SPA) ─────────────
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

// ───────────── Cron ─────────────
async function scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
  await ensureMigrated(env.DB, MIGRATIONS);
  if (event.cron === '0 * * * *') {
    ctx.waitUntil((async () => { await refreshAutomations(env); await syncPending(env); })());
    return;
  }
  if (event.cron === '15 * * * *') {
    // backup su Drive appena i dati cambiano (al massimo uno all'ora)
    ctx.waitUntil(backupIfChanged(env).catch((e) => console.error('backup su modifiche fallito', e)));
    return;
  }
  // backup notturno
  if ((await getSetting(env.DB, 'backup_auto')) === 'false') return;
  ctx.waitUntil(runDriveBackup(env, 'automatico', 'sistema').catch((e) => console.error('backup fallito', e)));
}

export default { fetch: app.fetch, scheduled } satisfies ExportedHandler<Env>;
