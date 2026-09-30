import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { PaymentRow } from "@/server/queries";
import { PageHeader, Card, Badge, Empty, cx } from "@/components/ui";
import { eur, fmtDate, daysLabel, todayISO, PAYMENT_STATUS, METHOD_LABEL } from "@/lib/format";
import { PayButton, UndoPay } from "../clients/[id]/widgets";
export const metadata = { title: "Pagamenti" };
const TABS: [string, string][] = [["aperti", "Da incassare"], ["scaduto", "Scaduti"], ["in_attesa", "In arrivo"], ["programmato", "Programmati"], ["pagato", "Pagati"]];
export default async function Payments({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { supabase } = await requireAdmin();
  const f = (await searchParams).f ?? "aperti";
  let q = supabase.from("payment_overview").select("*").order("due_date", { ascending: f !== "pagato" });
  q = f === "aperti" ? q.in("status", ["scaduto", "in_attesa", "parziale"]) : q.eq("status", f);
  const [{ data }, { data: all }] = await Promise.all([q.limit(300), supabase.from("payment_overview").select("amount,paid_amount,paid_date,status,due_date")]);
  const rows = (data ?? []) as PaymentRow[];
  const a = (all ?? []) as PaymentRow[];
  const month = todayISO().slice(0, 7);
  const sum = (xs: PaymentRow[], paid = false) => xs.reduce((s, p) => s + Number(paid ? p.paid_amount ?? p.amount : Number(p.amount) - Number(p.paid_amount ?? 0)), 0);
  const stats = [
    { l: "Incassato questo mese", v: eur(sum(a.filter((p) => p.paid_date?.startsWith(month)), true)) },
    { l: "Da incassare", v: eur(sum(a.filter((p) => ["scaduto", "in_attesa", "parziale"].includes(p.status)))) },
    { l: "Scaduto", v: eur(sum(a.filter((p) => p.status === "scaduto"))), red: a.some((p) => p.status === "scaduto") },
    { l: "Programmato", v: eur(sum(a.filter((p) => p.status === "programmato"))) },
  ];
  return (
    <>
      <PageHeader eyebrow="Rate e incassi" title="Pagamenti" />
      <section className="rise rise-1 mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.l} className={cx("p-5", s.red && "glow")}>
            <p className="label !text-[10px]">{s.l}</p>
            <p className={cx("numeral mt-5 text-[30px] sm:text-[38px]", s.red && "text-danger")}>{s.v}</p>
          </Card>
        ))}
      </section>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map(([v, l]) => (
          <Link key={v} href={`/payments?f=${v}`} className={cx("press flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[13px] transition", f === v ? "border-accent/50 bg-accent/15 text-fg" : "border-line text-muted hover:text-fg")}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? <Empty>Nessuna rata in questa vista.</Empty> : (
        <Card className="rise rise-2 divide-y divide-line overflow-hidden">
          {rows.map((p) => {
            const s = PAYMENT_STATUS[p.status];
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Link href={`/clients/${p.client_id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{p.first_name} {p.last_name}</p>
                  <p className="truncate text-[12px] text-muted">
                    {p.paid_date ? `Pagato il ${fmtDate(p.paid_date)}${p.method ? " · " + METHOD_LABEL[p.method] : ""}` : `Scadenza ${fmtDate(p.due_date)} · ${p.days_to_due < 0 ? "scaduta da " + daysLabel(-p.days_to_due) : "tra " + daysLabel(p.days_to_due)}`}
                  </p>
                </Link>
                <p className="numeral text-lg">{eur(p.amount)}</p>
                <Badge tone={s.tone} className="hidden sm:inline-flex">{s.label}</Badge>
                {p.paid_date ? <UndoPay id={p.id} clientId={p.client_id} /> : <PayButton payment={p} defaultMethod="bonifico" today={todayISO()} />}
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
