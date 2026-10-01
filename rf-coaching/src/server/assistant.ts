import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOverview, currentPrograms } from "./queries";
import { eur, fmtDate, fmtDay, fmtTime, daysLabel, todayISO, DURATION_LABEL } from "@/lib/format";

/**
 * Assistente dell'app.
 *
 * Risponde alle domande di gestione leggendo il database, senza modello
 * linguistico: su rate, incassi e scadenze una risposta esatta vale più di una
 * discorsiva. Riconosce l'intento da parole chiave e compone la risposta dai dati.
 *
 * Se un giorno si vuole un modello vero, basta sostituire `ask` mantenendo la
 * stessa firma: l'interfaccia e la rotta /api/assistant restano identiche.
 */

export type AssistantReply = { text: string; links?: { label: string; href: string }[] };

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w));

export const SUGGESTIONS = [
  "Chi deve ancora pagare questo mese?",
  "Quanto ho incassato questo mese?",
  "Che appuntamenti ho oggi?",
  "Quali percorsi stanno per scadere?",
];

export async function ask(sb: SupabaseClient, raw: string): Promise<AssistantReply> {
  const q = raw.toLowerCase().trim();
  if (!q) return { text: "Dimmi pure. Posso guardare pagamenti, incassi, appuntamenti e percorsi." };

  const { programs, openPayments, appointments, today } = await loadOverview(sb);
  const current = [...currentPrograms(programs).values()];

  // ── incassi ────────────────────────────────────────────────────────────────
  if (has(q, "incassat", "incasso", "guadagn", "fatturat", "entrate")) {
    const month = today.slice(0, 7);
    const { data } = await sb.from("payments").select("amount,paid_amount,paid_date").not("paid_date", "is", null).gte("paid_date", month + "-01");
    const tot = (data ?? []).reduce((s, p) => s + Number(p.paid_amount ?? p.amount ?? 0), 0);
    const n = (data ?? []).length;
    return {
      text: n === 0
        ? "Questo mese non risultano ancora incassi registrati."
        : `Questo mese hai incassato ${eur(tot)}, su ${n} ${n === 1 ? "rata" : "rate"}.`,
      links: [{ label: "Apri il report", href: "/reports" }],
    };
  }

  // ── pagamenti in sospeso ───────────────────────────────────────────────────
  if (has(q, "pagare", "pagament", "rata", "rate", "scadut", "sospeso", "deve")) {
    const overdue = openPayments.filter((p) => p.status === "scaduto");
    const soon = openPayments.filter((p) => p.status === "in_attesa");
    if (overdue.length === 0 && soon.length === 0) return { text: "Nessuna rata scoperta: sei in pari con tutti.", links: [{ label: "Pagamenti", href: "/payments" }] };
    const lines = [
      ...overdue.map((p) => `• ${p.first_name} ${p.last_name} — ${eur(p.amount)}, scaduta da ${-p.days_to_due} gg`),
      ...soon.map((p) => `• ${p.first_name} ${p.last_name} — ${eur(p.amount)}, entro il ${fmtDate(p.due_date)}`),
    ];
    const tot = [...overdue, ...soon].reduce((s, p) => s + Number(p.amount), 0);
    return {
      text: `${lines.length} ${lines.length === 1 ? "rata" : "rate"} da incassare, ${eur(tot)} in tutto:\n${lines.join("\n")}`,
      links: [{ label: "Messaggi da inviare", href: "/messages" }, { label: "Pagamenti", href: "/payments" }],
    };
  }

  // ── appuntamenti ───────────────────────────────────────────────────────────
  if (has(q, "appuntament", "lezion", "agenda", "calendario", "allenament")) {
    const domani = has(q, "domani");
    const list = domani
      ? appointments.filter((a) => a.starts_at.slice(0, 10) === new Date(Date.now() + 864e5).toLocaleDateString("sv-SE"))
      : has(q, "settimana") ? appointments
      : appointments.filter((a) => a.starts_at.slice(0, 10) === today);
    const quando = domani ? "domani" : has(q, "settimana") ? "nei prossimi 7 giorni" : "oggi";
    if (list.length === 0) return { text: `Nessun appuntamento ${quando}.`, links: [{ label: "Calendario", href: "/calendar" }] };
    return {
      text: `${list.length} ${list.length === 1 ? "appuntamento" : "appuntamenti"} ${quando}:\n` +
        list.map((a) => `• ${fmtTime(a.starts_at)} — ${a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : "—"}${has(q, "settimana") ? ` (${fmtDay(a.starts_at)})` : ""}`).join("\n"),
      links: [{ label: "Calendario", href: "/calendar" }],
    };
  }

  // ── percorsi in scadenza ───────────────────────────────────────────────────
  if (has(q, "scadenz", "rinnov", "finisce", "termina", "percors")) {
    const exp = current.filter((p) => p.status === "in_scadenza" || p.status === "scaduto").sort((a, b) => a.days_left - b.days_left);
    if (exp.length === 0) return { text: "Nessun percorso in scadenza nei prossimi 30 giorni." };
    return {
      text: `${exp.length} ${exp.length === 1 ? "percorso" : "percorsi"} da rinnovare:\n` +
        exp.map((p) => `• ${p.first_name} ${p.last_name} — ${DURATION_LABEL[p.duration]}, ${p.days_left < 0 ? `scaduto da ${-p.days_left} gg` : `tra ${daysLabel(p.days_left)}`}`).join("\n"),
      links: [{ label: "Messaggi da inviare", href: "/messages" }],
    };
  }

  // ── clienti ────────────────────────────────────────────────────────────────
  if (has(q, "quanti client", "clienti attivi", "quanti sono")) {
    const active = current.filter((p) => p.status === "attivo" || p.status === "in_scadenza");
    return { text: `Hai ${active.length} ${active.length === 1 ? "cliente attivo" : "clienti attivi"}.`, links: [{ label: "Clienti", href: "/clients" }] };
  }

  // ── ricerca di un cliente per nome ─────────────────────────────────────────
  const { data: people } = await sb.from("clients").select("id,first_name,last_name").is("archived_at", null);
  const hit = (people ?? []).find((c) => q.includes(String(c.first_name).toLowerCase()) || q.includes(String(c.last_name).toLowerCase()));
  if (hit) {
    const pr = current.find((p) => p.client_id === hit.id);
    const pay = openPayments.filter((p) => p.client_id === hit.id);
    const next = appointments.find((a) => a.client_id === hit.id);
    const bits = [
      pr ? `percorso ${DURATION_LABEL[pr.duration]} fino al ${fmtDate(pr.end_date)}` : "nessun percorso attivo",
      pay.length ? `${pay.length} ${pay.length === 1 ? "rata aperta" : "rate aperte"} per ${eur(pay.reduce((s, p) => s + Number(p.amount), 0))}` : "pagamenti in pari",
      next ? `prossima lezione ${fmtDay(next.starts_at)} alle ${fmtTime(next.starts_at)}` : "nessuna lezione in programma",
    ];
    return { text: `${hit.first_name} ${hit.last_name}: ${bits.join(", ")}.`, links: [{ label: "Apri la scheda", href: `/clients/${hit.id}` }] };
  }

  return {
    text: "Non ho capito la domanda. Posso dirti chi deve pagare, quanto hai incassato, che appuntamenti hai e quali percorsi stanno per scadere — oppure scrivimi il nome di un cliente.",
  };
}
