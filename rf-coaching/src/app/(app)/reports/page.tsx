import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, SectionLabel, Empty, cx } from "@/components/ui";
import { eur, todayISO } from "@/lib/format";

export const metadata = { title: "Report mensile" };

const MONTH = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "Europe/Rome" });

export default async function Reports() {
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const from = today.slice(0, 4) + "-01-01";

  const [{ data: paid }, { data: appts }, { data: clients }] = await Promise.all([
    supabase.from("payments").select("amount,paid_amount,paid_date,method").not("paid_date", "is", null).gte("paid_date", from).order("paid_date"),
    supabase.from("appointments").select("starts_at").gte("starts_at", from + "T00:00:00"),
    supabase.from("clients").select("id,created_at").gte("created_at", from),
  ]);

  // aggregazione per mese dell'anno corrente
  const months = new Map<string, { income: number; lessons: number; newClients: number }>();
  const bucket = (k: string) => months.get(k) ?? months.set(k, { income: 0, lessons: 0, newClients: 0 }).get(k)!;
  for (const p of paid ?? []) bucket(String(p.paid_date).slice(0, 7)).income += Number(p.paid_amount ?? p.amount ?? 0);
  for (const a of appts ?? []) bucket(String(a.starts_at).slice(0, 7)).lessons += 1;
  for (const c of clients ?? []) bucket(String(c.created_at).slice(0, 7)).newClients += 1;

  const rows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const peak = Math.max(1, ...rows.map((r) => r[1].income));
  const ytd = rows.reduce((s, r) => s + r[1].income, 0);
  const cur = months.get(today.slice(0, 7));

  const byMethod = new Map<string, number>();
  for (const p of paid ?? []) byMethod.set(String(p.method ?? "altro"), (byMethod.get(String(p.method ?? "altro")) ?? 0) + Number(p.paid_amount ?? p.amount ?? 0));

  return (
    <>
      <PageHeader title="Report mensile" eyebrow={MONTH(today)} />

      <section className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Incassato nel mese", value: eur(cur?.income ?? 0) },
          { label: "Lezioni nel mese", value: cur?.lessons ?? 0 },
          { label: "Nuovi clienti", value: cur?.newClients ?? 0 },
          { label: "Incassato nell'anno", value: eur(ytd) },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="label !text-[10px]">{k.label}</p>
            <p className="numeral mt-5 text-[34px]">{k.value}</p>
          </Card>
        ))}
      </section>

      <section className="mb-10">
        <SectionLabel index={1} total={2}>Andamento dell&apos;anno</SectionLabel>
        {rows.length === 0 ? <Empty>Nessun incasso registrato quest&apos;anno.</Empty> : (
          <Card className="divide-y divide-line overflow-hidden">
            {rows.map(([key, m]) => (
              <div key={key} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] capitalize">{MONTH(key + "-01")}</span>
                  <span className="numeral text-[19px]">{eur(m.income)}</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-3 shadow-[0_0_12px_rgba(167,139,250,.7)]" style={{ width: `${(m.income / peak) * 100}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-muted">{m.lessons} lezioni · {m.newClients} nuovi clienti</p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionLabel index={2} total={2}>Metodi di pagamento</SectionLabel>
        {byMethod.size === 0 ? <Empty>Nessun pagamento registrato.</Empty> : (
          <Card className="divide-y divide-line overflow-hidden">
            {[...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <div key={m} className={cx("flex items-center justify-between px-5 py-4 text-[15px]")}>
                <span className="capitalize">{m}</span>
                <span className="numeral text-[17px]">{eur(v)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
