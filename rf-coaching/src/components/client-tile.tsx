import Link from "next/link";
import { CalendarCheck, CalendarClock } from "lucide-react";
import { cx } from "./ui";
import { eur, fmtDay, fmtTime, daysLabel, DURATION_LABEL, TYPE_LABEL } from "@/lib/format";
import type { ProgramRow, PaymentRow } from "@/server/queries";

export type Appt = { starts_at: string } | null;

const MONTHS: Record<string, number> = { "3m": 3, "6m": 6, "12m": 12 };

/** Mesi trascorsi dall'inizio del percorso, limitati alla durata. */
function monthsIn(start: string, total: number) {
  const s = new Date(start + "T12:00:00");
  const now = new Date();
  const n = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()) + (now.getDate() >= s.getDate() ? 1 : 0);
  return Math.max(1, Math.min(total, n));
}

/**
 * Tessera cliente della Dashboard: avanzamento del percorso, ultima e prossima
 * lezione, stato dei pagamenti. Tutta la tessera è un link alla scheda cliente.
 */
export function ClientTile({ program, nextPayment, last, next, overdue }: {
  program: ProgramRow;
  nextPayment: PaymentRow | null;
  last: Appt;
  next: Appt;
  overdue: boolean;
}) {
  const p = program;
  const total = MONTHS[p.duration] ?? 0;
  const done = total ? monthsIn(p.start_date, total) : 0;
  const pips = total || p.lessons_total || 0;
  const filled = total ? done : p.lessons_completed;

  const payTone = overdue ? "red" : nextPayment && nextPayment.days_to_due <= 7 ? "orange" : "green";
  const payLabel = overdue ? "Rata scaduta" : nextPayment && nextPayment.days_to_due <= 7 ? "In scadenza" : "Pagato";

  return (
    <Link href={`/clients/${p.client_id}`} className="glass lift rise block p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c026d3]/70 to-accent/50 text-[15px] font-medium ring-1 ring-white/10">
          {p.first_name[0]}{p.last_name[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[20px] font-medium tracking-tight">{p.first_name} {p.last_name}</p>
          <p className="truncate text-[14px] text-muted">{TYPE_LABEL[p.type]} · {DURATION_LABEL[p.duration]}</p>
        </div>
      </div>

      {pips > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] text-muted">{total ? "Mese" : "Lezioni"}</span>
            <span className="text-[15px]">
              <span className="numeral text-[19px]">{filled}</span>
              <span className="text-muted"> / {pips}</span>
              {p.lessons_total > 0 && <span className="text-muted"> · {p.lessons_total} lez.</span>}
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: pips }, (_, i) => (
              <span key={i} className={cx("pip", i < filled - 1 && "pip-on", i === filled - 1 && "pip-now")} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border hairline p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] text-muted"><CalendarCheck size={13} /> Ultima</p>
          {last ? (
            <>
              <p className="text-[17px]">{daysLabel(-Math.round((Date.now() - new Date(last.starts_at).getTime()) / 864e5))}</p>
              <p className="text-[13px] text-dim">{fmtDay(last.starts_at)}</p>
            </>
          ) : <p className="text-[17px] text-dim">—</p>}
        </div>
        <div className="rounded-2xl border hairline p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] text-muted"><CalendarClock size={13} /> Prossima</p>
          {next ? (
            <>
              <p className="text-[17px]">{fmtDay(next.starts_at)}</p>
              <p className="text-[13px] text-dim">ore {fmtTime(next.starts_at)}</p>
            </>
          ) : <p className="text-[17px] text-dim">—</p>}
        </div>
      </div>

      <div className={cx("mt-3 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-[15px]",
        payTone === "green" && "border-ok/25 bg-ok/[.07] text-ok",
        payTone === "orange" && "border-orange/25 bg-orange/[.07] text-orange",
        payTone === "red" && "border-danger/25 bg-danger/[.07] text-danger")}>
        <span>{payLabel}</span>
        {nextPayment && (
          <span className="text-muted">prossima {eur(nextPayment.amount)} il {new Date(nextPayment.due_date + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span>
        )}
      </div>
    </Link>
  );
}
