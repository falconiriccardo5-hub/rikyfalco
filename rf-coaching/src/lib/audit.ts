import { eur, fmtDate, METHOD_LABEL } from "./format";
export type AuditRow = { id: number; source: string; action: string; entity: string; entity_id: string; client_id: string | null; old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; created_at: string };
const FIELD: Record<string, string> = {
  first_name: "Nome", last_name: "Cognome", email: "Email", phone: "Telefono", birth_date: "Data di nascita", notes: "Note", archived_at: "Archiviazione",
  type: "Tipologia", duration: "Durata", start_date: "Data inizio", end_date: "Data fine", total_price: "Prezzo", lessons_total: "Lezioni acquistate",
  lessons_completed: "Lezioni effettuate", manual_status: "Stato", installments: "Rate", payment_method: "Metodo", amount: "Importo", due_date: "Scadenza",
  paid_date: "Data pagamento", paid_amount: "Importo pagato", method: "Metodo", starts_at: "Inizio", ends_at: "Fine",
};
const ENTITY: Record<string, string> = { clients: "Cliente", programs: "Percorso", payments: "Pagamento", appointments: "Appuntamento" };
export const SOURCE: Record<string, string> = { ui: "App", ai: "AI Assistant", cron: "Automazione", seed: "Dati demo", system: "Sistema" };
function fmt(k: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (["amount", "paid_amount", "total_price"].includes(k)) return eur(v as number);
  if (/_date$/.test(k)) return fmtDate(String(v));
  if (k === "archived_at") return "archiviato";
  if (k === "method" || k === "payment_method") return METHOD_LABEL[String(v)] ?? String(v);
  return String(v);
}
export function describe(a: AuditRow): { title: string; changes: { field: string; from: string; to: string }[] } {
  const ent = ENTITY[a.entity] ?? a.entity;
  if (a.action === "insert") {
    const n = a.new_value ?? {};
    if (a.entity === "clients") return { title: "Nuovo cliente", changes: [] };
    if (a.entity === "payments") return { title: `Rata programmata · ${fmt("amount", n.amount)} il ${fmt("due_date", n.due_date)}`, changes: [] };
    if (a.entity === "programs") return { title: `Nuovo percorso · ${fmt("start_date", n.start_date)} → ${fmt("end_date", n.end_date)}`, changes: [] };
    return { title: `${ent} creato`, changes: [] };
  }
  if (a.action === "delete") return { title: `${ent} eliminato`, changes: [] };
  const n = a.new_value ?? {}; const o = a.old_value ?? {};
  let title = `${ent} modificato`;
  if (a.entity === "payments" && n.paid_date) title = `Pagamento registrato`;
  if (a.entity === "payments" && "paid_date" in n && !n.paid_date) title = `Pagamento annullato`;
  if (a.entity === "programs" && "lessons_completed" in n && Object.keys(n).length === 1) title = `Lezioni aggiornate`;
  if (a.entity === "programs" && "end_date" in n) title = `Data fine percorso modificata`;
  if (a.entity === "clients" && "archived_at" in n) title = n.archived_at ? "Cliente archiviato" : "Cliente ripristinato";
  return { title, changes: Object.keys(n).filter((k) => FIELD[k] && k !== "archived_at").map((k) => ({ field: FIELD[k], from: fmt(k, o[k]), to: fmt(k, n[k]) })) };
}
