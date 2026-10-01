"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Avatar, Badge, cx, Empty } from "@/components/ui";
import { DURATION_LABEL, TYPE_LABEL, PROGRAM_STATUS, PAYMENT_STATE, fmtDate, daysLabel } from "@/lib/format";
export type Row = {
  id: string; first_name: string; last_name: string; email: string | null; phone: string | null; archived: boolean;
  program: { type: string; duration: string; start_date: string; end_date: string; status: string; days_left: number; payment_state: string; paid: number; total: number } | null;
};
const FILTERS: [string, string][] = [
  ["tutti", "Tutti"], ["attivi", "Attivi"], ["in_scadenza", "In scadenza"], ["scaduti", "Scaduti"], ["pagamenti", "Pagamenti mancanti"],
  ["live", "Live"], ["online", "Online"], ["misto", "Misto"], ["archiviati", "Archiviati"],
];
const SORTS: [string, string][] = [["nome", "Nome"], ["inizio", "Data inizio"], ["fine", "Data fine"], ["scadenza", "Scadenza"], ["pagamento", "Pagamento"]];
const PAY_RANK: Record<string, number> = { scaduto: 0, in_attesa: 1, parziale: 2, pagato: 3 };
export function ClientsTable({ rows, initialFilter }: { rows: Row[]; initialFilter: string }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState(initialFilter);
  const [sort, setSort] = useState("nome");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows.filter((x) => (f === "archiviati" ? x.archived : !x.archived));
    if (needle) r = r.filter((x) => {
      const hay = [x.first_name, x.last_name, x.email, x.phone, x.phone?.replace(/\s/g, "")].join(" ").toLowerCase();
      return needle.split(/\s+/).every((w) => hay.includes(w));
    });
    const st = (x: Row) => x.program?.status;
    if (f === "attivi") r = r.filter((x) => st(x) === "attivo" || st(x) === "in_scadenza");
    if (f === "in_scadenza") r = r.filter((x) => st(x) === "in_scadenza");
    if (f === "scaduti") r = r.filter((x) => st(x) === "scaduto");
    if (f === "pagamenti") r = r.filter((x) => x.program && ["scaduto", "in_attesa"].includes(x.program.payment_state));
    if (["live", "online", "misto"].includes(f)) r = r.filter((x) => x.program?.type === f);
    const k = (x: Row) => x.program;
    return [...r].sort((a, b) => {
      switch (sort) {
        case "inizio": return (k(b)?.start_date ?? "").localeCompare(k(a)?.start_date ?? "");
        case "fine": return (k(a)?.end_date ?? "9").localeCompare(k(b)?.end_date ?? "9");
        case "scadenza": return (k(a)?.days_left ?? 1e9) - (k(b)?.days_left ?? 1e9);
        case "pagamento": return (PAY_RANK[k(a)?.payment_state ?? ""] ?? 9) - (PAY_RANK[k(b)?.payment_state ?? ""] ?? 9);
        default: return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      }
    });
  }, [rows, q, f, sort]);
  return (
    <div className="rise rise-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, email o telefono" className="field !rounded-full !pl-11" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !w-auto !rounded-full" aria-label="Ordina">
          {SORTS.map(([v, l]) => <option key={v} value={v}>Ordina: {l}</option>)}
        </select>
      </div>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setF(v)} className={cx("press h-8 shrink-0 rounded-full border px-3.5 text-[13px] transition-all duration-300",
            f === v ? "border-accent/50 bg-accent/15 text-fg shadow-[0_0_20px_-6px_rgba(139,92,246,.8)]" : "border-line text-muted hover:text-fg")}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? <Empty>Nessun cliente corrisponde ai filtri.</Empty> : (
        <div className="glass divide-y divide-line overflow-hidden">
          <div className="label hidden grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr_20px] gap-4 px-5 py-3 !text-[10px] lg:grid">
            <span>Cliente</span><span>Percorso</span><span>Periodo</span><span>Stato</span><span>Pagamento</span><span />
          </div>
          {list.map((r) => {
            const p = r.program; const st = p ? PROGRAM_STATUS[p.status] : null; const pay = p ? PAYMENT_STATE[p.payment_state] : null;
            return (
              <Link key={r.id} href={`/clients/${r.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition hover:bg-white/[.03] sm:px-5 lg:grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr_20px]">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar first={r.first_name} last={r.last_name} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{r.first_name} {r.last_name}</p>
                    <p className="truncate text-[12px] text-muted">{r.email ?? r.phone ?? "—"}</p>
                  </div>
                </div>
                <div className="lg:hidden">{st && <Badge tone={st.tone}>{st.label}</Badge>}</div>
                <p className="col-span-2 text-[13px] text-muted lg:col-span-1 lg:text-fg">
                  {p ? <>{DURATION_LABEL[p.duration]} · {TYPE_LABEL[p.type]}<span className="lg:hidden"> · {p.days_left >= 0 ? `fine tra ${daysLabel(p.days_left)}` : `scaduto ${daysLabel(p.days_left)}`}</span></> : "Nessun percorso"}
                </p>
                <p className="hidden text-[13px] text-muted lg:block">{p ? `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}` : "—"}</p>
                <div className="hidden lg:block">{st && <Badge tone={st.tone}>{st.label}</Badge>}</div>
                <div className="hidden text-[13px] lg:block">{pay && <span className={cx(pay.tone === "red" ? "text-danger" : pay.tone === "orange" ? "text-orange" : "text-muted")}>{pay.label} <span className="text-dim">· {p!.paid}/{p!.total}</span></span>}</div>
                <ChevronRight size={16} className="hidden text-dim transition group-hover:translate-x-0.5 group-hover:text-fg lg:block" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
