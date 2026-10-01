import Link from "next/link";
import { cx } from "./ui";

export type GridEvent = {
  at: string;                 // giorno in formato ISO (yyyy-mm-dd)
  startMin?: number;          // minuti dalla mezzanotte, assente se tutto il giorno
  endMin?: number;
  kind: "appuntamento" | "rata" | "fine" | "google";
  label: string;
  href?: string;
};

const BORDER = { appuntamento: "border-l-accent-2", rata: "border-l-orange", fine: "border-l-warn", google: "border-l-info" };
const TINT = { appuntamento: "bg-accent/[.14]", rata: "bg-orange/[.12]", fine: "bg-warn/[.12]", google: "bg-info/[.12]" };

const DAY_NAMES = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const HOUR = 56; // altezza di un'ora in px

/** Griglia settimanale: 7 colonne, una riga per ora, scorrevole in orizzontale sul telefono. */
export function WeekGrid({ days, events, today, from = 7, to = 22 }: {
  days: string[];             // i 7 giorni della settimana, dal lunedì
  events: GridEvent[];
  today: string;
  from?: number;
  to?: number;
}) {
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const allDay = events.filter((e) => e.startMin == null);

  return (
    <div className="glass overflow-x-auto">
      <div className="min-w-[680px]">
        {/* intestazione dei giorni */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b hairline">
          <span />
          {days.map((d, i) => {
            const isToday = d === today;
            return (
              <div key={d} className={cx("border-l hairline px-2 py-3 text-center", isToday && "bg-accent/[.07]")}>
                <p className={cx("label !text-[10px]", isToday && "!text-accent-3")}>{DAY_NAMES[i]}</p>
                <p className={cx("numeral mt-1 text-[22px]", isToday && "text-accent-3")}>{Number(d.slice(8, 10))}</p>
              </div>
            );
          })}
        </div>

        {/* eventi senza orario (rate, fine percorso, giornate intere di Google) */}
        {allDay.length > 0 && (
          <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b hairline">
            <span className="label grid place-items-center !text-[9px]">tutto<br />il giorno</span>
            {days.map((d) => (
              <div key={d} className="space-y-1 border-l hairline p-1.5">
                {allDay.filter((e) => e.at === d).map((e, i) => (
                  <Item key={i} e={e} compact />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* griglia oraria */}
        <div className="relative grid grid-cols-[52px_repeat(7,1fr)]">
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR }} className="relative">
                <span className="label absolute -top-2 right-2 !text-[10px]">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={cx("relative border-l hairline", d === today && "bg-accent/[.04]")}>
              {hours.map((h) => <div key={h} style={{ height: HOUR }} className="border-b hairline" />)}
              {events.filter((e) => e.at === d && e.startMin != null).map((e, i) => {
                const top = ((e.startMin! - from * 60) / 60) * HOUR;
                const height = Math.max(26, (((e.endMin ?? e.startMin! + 60) - e.startMin!) / 60) * HOUR - 3);
                if (top < -HOUR) return null;
                return (
                  <div key={i} style={{ top: Math.max(0, top), height }} className="absolute inset-x-1">
                    <Item e={e} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Item({ e, compact }: { e: GridEvent; compact?: boolean }) {
  const time = e.startMin != null ? `${String(Math.floor(e.startMin / 60)).padStart(2, "0")}:${String(e.startMin % 60).padStart(2, "0")}` : null;
  const body = (
    <div className={cx("h-full overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-[11px] leading-tight", BORDER[e.kind], TINT[e.kind], compact && "truncate")}>
      <p className="truncate font-medium">{e.label}</p>
      {time && !compact && <p className="truncate text-[10px] text-muted">{time}</p>}
    </div>
  );
  return e.href ? <Link href={e.href} className="block h-full">{body}</Link> : body;
}
