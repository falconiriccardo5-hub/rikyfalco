export const TZ = "Europe/Rome";
const d = (v: string | Date) => (typeof v === "string" && v.length === 10 ? new Date(v + "T12:00:00") : new Date(v));
export const fmtDate = (v?: string | null) => (v ? d(v).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }) : "—");
export const fmtDateLong = (v?: string | null) => (v ? d(v).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }) : "—");
export const fmtTime = (v: string) => new Date(v).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const fmtDateTime = (v: string) => `${fmtDate(v)} ${fmtTime(v)}`;
export const fmtDay = (v: string) => new Date(v).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
export const eur = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n ?? 0));
export const todayISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
export const addDaysISO = (iso: string, days: number) => { const x = d(iso); x.setDate(x.getDate() + days); return x.toLocaleDateString("sv-SE"); };
export const addMonthsISO = (iso: string, months: number) => { const x = d(iso); x.setMonth(x.getMonth() + months); return x.toLocaleDateString("sv-SE"); };
export const TYPE_LABEL: Record<string, string> = { live: "Live", online: "Online", misto: "Misto" };
export const DURATION_LABEL: Record<string, string> = { "3m": "3 mesi", "6m": "6 mesi", "12m": "12 mesi", "10l": "10 lezioni" };
export const METHOD_LABEL: Record<string, string> = { bonifico: "Bonifico", contanti: "Contanti", carta: "Carta", paypal: "PayPal", altro: "Altro" };
export const PROGRAM_STATUS: Record<string, { label: string; tone: Tone }> = {
  attivo: { label: "Attivo", tone: "green" }, in_scadenza: { label: "In scadenza", tone: "amber" },
  scaduto: { label: "Scaduto", tone: "red" }, sospeso: { label: "Sospeso", tone: "muted" }, terminato: { label: "Terminato", tone: "muted" },
};
export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pagato: { label: "Pagato", tone: "green" }, parziale: { label: "Parziale", tone: "amber" }, scaduto: { label: "Scaduto", tone: "red" },
  in_attesa: { label: "In attesa", tone: "orange" }, programmato: { label: "Programmato", tone: "muted" },
};
export const PAYMENT_STATE: Record<string, { label: string; tone: Tone }> = {
  pagato: { label: "Saldato", tone: "green" }, parziale: { label: "Regolare", tone: "violet" }, scaduto: { label: "Rata scaduta", tone: "red" }, in_attesa: { label: "Da pagare", tone: "orange" },
};
export type Tone = "green" | "amber" | "orange" | "red" | "blue" | "violet" | "muted";
export const daysLabel = (n: number) => (n === 0 ? "oggi" : n > 0 ? `${n} ${n === 1 ? "giorno" : "giorni"}` : `${-n} gg fa`);
