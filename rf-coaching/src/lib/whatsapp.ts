import { eur, fmtDateLong, fmtDay, fmtTime } from "./format";

/** Numero in formato wa.me: solo cifre, prefisso italiano se assente. */
export function waNumber(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return null;
  return digits.length <= 10 ? "39" + digits : digits;
}

export function waLink(phone: string | null | undefined, text: string) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export type DraftKind = "sollecito" | "promemoria_rata" | "promemoria_lezione" | "rinnovo";

export const DRAFT_LABEL: Record<DraftKind, string> = {
  sollecito: "Sollecito pagamento",
  promemoria_rata: "Promemoria rata",
  promemoria_lezione: "Promemoria lezione",
  rinnovo: "Proposta di rinnovo",
};

/** Testi dei messaggi pronti da inviare su WhatsApp. */
export const DRAFT: Record<DraftKind, (c: { name: string; amount?: number; date?: string; when?: string }) => string> = {
  sollecito: ({ name, amount, date }) =>
    `Ciao ${name}! Ti ricordo che la rata di ${eur(amount)} era in scadenza il ${fmtDateLong(date)} e non mi risulta ancora saldata. Se l'hai già fatto ignora pure il messaggio. Grazie!`,
  promemoria_rata: ({ name, amount, date }) =>
    `Ciao ${name}! Un promemoria veloce: la prossima rata di ${eur(amount)} scade il ${fmtDateLong(date)}. A presto!`,
  promemoria_lezione: ({ name, when }) =>
    `Ciao ${name}! Ci vediamo ${when ? `${fmtDay(when)} alle ${fmtTime(when)}` : "al prossimo allenamento"}. Se hai imprevisti avvisami pure in anticipo.`,
  rinnovo: ({ name, date }) =>
    `Ciao ${name}! Il tuo percorso si conclude il ${fmtDateLong(date)}. Ti va se ci sentiamo per impostare insieme il prossimo? Dimmi quando hai cinque minuti.`,
};
