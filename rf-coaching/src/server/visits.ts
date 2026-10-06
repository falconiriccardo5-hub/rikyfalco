import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODELLO_VISITA, pickAnswers, withComputed, type VisitAnswers, type VisitKind, type VisitSection, type VisitTemplate } from "@/lib/visit-template";
import { randomToken } from "./crypto";

// Sezione "Visita": stessa regola del service layer, unico punto che scrive visite e modello.
type SB = SupabaseClient;

export type VisitRow = {
  id: string; client_id: string; template_id: string | null; kind: VisitKind; visit_date: string;
  status: "da_compilare" | "compilata_cliente" | "completata"; answers: VisitAnswers;
  template: { title: string; sections: VisitSection[] };
  client_submitted_at: string | null; completed_at: string | null; created_at: string;
};
export type VisitOverviewRow = {
  client_id: string; first_name: string; last_name: string; archived_at: string | null;
  last_visit_date: string | null; last_visit_kind: VisitKind | null; visits_done: number;
  open_visit_id: string | null; open_visit_status: VisitRow["status"] | null; next_due: string | null;
  visit_state: "aperta" | "mai_fatta" | "scaduta" | "in_scadenza" | "in_regola";
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const AnswerValue = z.union([z.string().max(5000), z.number(), z.array(z.string().max(200)).max(50), z.null()]);
export const AnswersInput = z.record(z.string().max(80), z.object({ value: AnswerValue.optional(), note: z.string().max(2000).optional() }));
export const NewVisitInput = z.object({ kind: z.enum(["iniziale", "check"]), visit_date: date });

function check<T>(res: { data: T; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function defaultTemplate(sb: SB) {
  const t = check(await sb.from("visit_templates").select("id,name,version,body").eq("is_default", true).maybeSingle()) as
    { id: string; name: string; version: number; body: VisitTemplate } | null;
  return t ?? { id: null, name: MODELLO_VISITA.name, version: MODELLO_VISITA.version, body: MODELLO_VISITA };
}

export async function createVisit(sb: SB, clientId: string, raw: unknown) {
  const input = NewVisitInput.parse(raw);
  const t = await defaultTemplate(sb);
  return check(await sb.from("visits").insert({
    client_id: clientId, template_id: t.id, kind: input.kind, visit_date: input.visit_date, template: t.body.kinds[input.kind],
  }).select("id").single()) as { id: string };
}

async function loadVisit(sb: SB, id: string) {
  const v = check(await sb.from("visits").select("*").eq("id", id).maybeSingle()) as VisitRow | null;
  if (!v) throw new Error("Visita non trovata");
  return v;
}

// Il coach può compilare tutte le sezioni (anche quelle del cliente, es. durante la visita in studio).
export async function saveVisit(sb: SB, id: string, rawAnswers: unknown, opts: { complete?: boolean; visit_date?: string } = {}) {
  const v = await loadVisit(sb, id);
  const incoming = AnswersInput.parse(rawAnswers) as VisitAnswers;
  const tpl = { name: "", version: 0, intervalDays: 0, kinds: { [v.kind]: v.template } } as unknown as VisitTemplate;
  const allowed = { ...pickAnswers(v.kind, incoming, "cliente", tpl), ...pickAnswers(v.kind, incoming, "coach", tpl) };
  const answers = withComputed(v.kind, { ...v.answers, ...allowed }, tpl);
  const patch: Record<string, unknown> = { answers };
  if (opts.visit_date) patch.visit_date = date.parse(opts.visit_date);
  if (opts.complete) Object.assign(patch, { status: "completata", completed_at: new Date().toISOString() });
  check(await sb.from("visits").update(patch).eq("id", id));
  return v.client_id;
}

export async function reopenVisit(sb: SB, id: string) {
  const v = await loadVisit(sb, id);
  check(await sb.from("visits").update({ status: v.client_submitted_at ? "compilata_cliente" : "da_compilare", completed_at: null }).eq("id", id));
  return v.client_id;
}

// Rimanda il modulo al cliente (es. se l'ha inviato incompleto).
export async function sendBackToClient(sb: SB, id: string) {
  const v = await loadVisit(sb, id);
  check(await sb.from("visits").update({ status: "da_compilare", client_submitted_at: null, completed_at: null }).eq("id", id));
  return v.client_id;
}

export async function deleteVisit(sb: SB, id: string) {
  const v = await loadVisit(sb, id);
  check(await sb.from("visits").delete().eq("id", id));
  return v.client_id;
}

// Token del portale cliente (stessa colonna del portale): lo crea se il cliente non ne ha ancora uno.
export async function ensurePortalToken(sb: SB, clientId: string) {
  const c = check(await sb.from("clients").select("portal_token").eq("id", clientId).single()) as { portal_token: string | null };
  if (c.portal_token) return c.portal_token;
  const token = randomToken(24);
  check(await sb.from("clients").update({ portal_token: token }).eq("id", clientId));
  return token;
}

// Portale cliente (utente anonimo): passa solo dalle funzioni SQL che accettano i campi del cliente.
export type ClientVisit = { id: string; kind: VisitKind; visit_date: string; title: string; sections: VisitSection[]; answers: VisitAnswers };
export async function clientVisit(sb: SB, token: string) {
  return check(await sb.rpc("client_visit", { p_token: token })) as ClientVisit | null;
}
export async function submitClientVisit(sb: SB, token: string, visitId: string, rawAnswers: unknown, final: boolean) {
  const answers = AnswersInput.parse(rawAnswers);
  const ok = check(await sb.rpc("client_visit_submit", { p_token: token, p_visit_id: visitId, p_answers: answers, p_final: final })) as boolean;
  if (!ok) throw new Error("Il modulo non è più modificabile o il link non è valido");
}
