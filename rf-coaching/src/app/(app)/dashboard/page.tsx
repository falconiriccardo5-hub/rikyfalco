import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleAlert, Clock, RefreshCcw, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadOverview, currentPrograms } from "@/server/queries";
import { Badge, Card, SectionLabel, Empty, cx, LinkButton } from "@/components/ui";
import { eur, fmtDateLong, fmtTime, fmtDay, daysLabel, DURATION_LABEL, TYPE_LABEL, PROGRAM_STATUS, PAYMENT_STATE, type Tone } from "@/lib/format";
export const metadata = { title: "Dashboard" };
type Task = { key: string; tone: Tone; icon: typeof Clock; who: string; clientId: string; what: string; action: string; sort: number };
export default async function Dashboard() {
  const { supabase, profile } = await requireAdmin();
  const { programs, openPayments, appointments, today } = await loadOverview(supabase);
  const current = [...currentPrograms(programs).values()];
  const active = current.filter((p) => p.status === "attivo" || p.status === "in_scadenza");
  const expiring = current.filter((p) => p.status === "in_scadenza").sort((a, b) => a.days_left - b.days_left);
  const expired = current.filter((p) => p.status === "scaduto");
  const overdue = openPayments.filter((p) => p.status === "scaduto");
  const dueSoon = openPayments.filter((p) => p.status === "in_attesa");
  const pending = openPayments.filter((p) => p.status !== "programmato");
  const ending30 = programs.filter((p) => !p.manual_status && p.days_left >= 0 && p.days_left <= 30);
  const todayAppts = appointments.filter((a) => a.starts_at.slice(0, 10) === today);
  const weekAppts = appointments.filter((a) => a.starts_at.slice(0, 10) > today);
  const tasks: Task[] = [
    ...overdue.map((p) => ({ key: "o" + p.id, tone: "red" as Tone, icon: Wallet, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Rata di ${eur(p.amount)} scaduta da ${-p.days_to_due} gg`, action: "Sollecita pagamento", sort: 0 })),
    ...expired.map((p) => ({ key: "e" + p.id, tone: "red" as Tone, icon: CircleAlert, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Percorso ${DURATION_LABEL[p.duration]} scaduto il ${fmtDateLong(p.end_date)}`, action: "Rinnova o chiudi", sort: 1 })),
    ...dueSoon.map((p) => ({ key: "d" + p.id, tone: "orange" as Tone, icon: Clock, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Rata di ${eur(p.amount)} tra ${daysLabel(p.days_to_due)}`, action: "Invia promemoria", sort: 2 })),
    ...expiring.map((p) => ({ key: "x" + p.id, tone: "amber" as Tone, icon: RefreshCcw, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Percorso termina tra ${daysLabel(p.days_left)}`, action: "Proponi rinnovo", sort: 3 })),
  ].sort((a, b) => a.sort - b.sort);
  const hour = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));
  const greet = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const first = (profile.name || "Riccardo").split(" ")[0];
  const kpis: { label: string; value: number | string; sub?: string; href: string; tone?: Tone }[] = [
    { label: "Clienti attivi", value: active.length, href: "/clients?f=attivi" },
    { label: "In scadenza", value: expiring.length, sub: "entro 30 giorni", href: "/clients?f=in_scadenza", tone: expiring.length ? "amber" : undefined },
    { label: "Scaduti", value: expired.length, href: "/clients?f=scaduti", tone: expired.length ? "red" : undefined },
    { label: "Pagamenti in sospeso", value: pending.length, sub: eur(pending.reduce((s, p) => s + Number(p.amount) - Number(p.paid_amount ?? 0), 0)), href: "/payments", tone: overdue.length ? "red" : undefined },
    { label: "Rate in scadenza", value: dueSoon.length, sub: "prossimi 7 giorni", href: "/payments?f=in_attesa", tone: dueSoon.length ? "orange" : undefined },
    { label: "Percorsi in chiusura", value: ending30.length, sub: "prossimi 30 giorni", href: "/clients?f=in_scadenza" },
    { label: "Appuntamenti oggi", value: todayAppts.length, href: "/calendar" },
    { label: "Prossimi 7 giorni", value: weekAppts.length, sub: "appuntamenti", href: "/calendar" },
  ];
  return (
    <div className="space-y-12">
      <section className="rise relative overflow-hidden rounded-[28px] border hairline px-6 pt-8 pb-28 sm:px-10 sm:pt-12 sm:pb-40">
        <div className="planet" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label mb-4">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })}</p>
            <h1 className="max-w-xl text-[34px] leading-[1.02] font-medium tracking-[-0.04em] sm:text-[52px]">
              {greet}, {first}.<br /><span className="text-muted">Chi devi gestire oggi?</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="numeral text-[72px] sm:text-[96px]">{tasks.length + todayAppts.length}</p>
            <p className="label mt-2">{tasks.length} azioni · {todayAppts.length} appuntamenti</p>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link key={k.label} href={k.href} className={cx("glass lift rise group relative p-5 sm:p-6", `rise-${(i % 5) + 1}`, k.tone === "red" && "glow")}>
            <div className="flex items-start justify-between">
              <p className="label !text-[10px] sm:!text-[11px]">{k.label}</p>
              <ArrowUpRight size={14} className="text-dim transition group-hover:text-accent-3" />
            </div>
            <p className={cx("numeral mt-6 text-[44px] sm:text-[56px]", k.tone === "red" && "text-danger", k.tone === "orange" && "text-orange", k.tone === "amber" && "text-warn")}>{k.value}</p>
            {k.sub && <p className="mt-2 text-xs text-muted">{k.sub}</p>}
          </Link>
        ))}
      </section>
      <div className="grid gap-12 xl:grid-cols-[1.25fr_1fr] xl:gap-8">
        <section className="rise rise-2">
          <SectionLabel index={1} total={3}>Da gestire</SectionLabel>
          {tasks.length === 0 ? <Empty>Nessuna azione in sospeso. Tutto sotto controllo.</Empty> : (
            <Card className="divide-y divide-line overflow-hidden">
              {tasks.map((t) => (
                <Link key={t.key} href={`/clients/${t.clientId}`} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[.03] sm:px-5">
                  <span className={cx("grid size-10 shrink-0 place-items-center rounded-full ring-1",
                    t.tone === "red" ? "bg-danger/10 text-danger ring-danger/25" : t.tone === "orange" ? "bg-orange/10 text-orange ring-orange/25" : "bg-warn/10 text-warn ring-warn/25")}>
                    <t.icon size={17} strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{t.who}</p>
                    <p className="truncate text-[13px] text-muted">{t.what}</p>
                  </div>
                  <span className="hidden text-[12px] text-accent-3 sm:block">{t.action}</span>
                  <ArrowUpRight size={16} className="shrink-0 text-dim transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
                </Link>
              ))}
            </Card>
          )}
        </section>
        <section className="rise rise-3">
          <SectionLabel index={2} total={3} action={<LinkButton href="/calendar" size="sm">Calendario</LinkButton>}>Agenda</SectionLabel>
          {appointments.length === 0 ? <Empty>Nessun appuntamento nei prossimi 7 giorni.</Empty> : (
            <Card className="p-2">
              {appointments.map((a) => {
                const isToday = a.starts_at.slice(0, 10) === today;
                return (
                  <Link key={a.id} href={a.client_id ? `/clients/${a.client_id}` : "/calendar"} className={cx("flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-white/[.03]", isToday && "bg-accent/[.07]")}>
                    <div className="w-16 shrink-0">
                      <p className="numeral text-lg">{fmtTime(a.starts_at)}</p>
                      <p className={cx("label !text-[10px]", isToday && "!text-accent-3")}>{isToday ? "Oggi" : fmtDay(a.starts_at)}</p>
                    </div>
                    <span className={cx("h-8 w-[2px] rounded-full", isToday ? "bg-accent-2 shadow-[0_0_8px_rgba(167,139,250,.9)]" : "bg-line-strong")} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : "—"}</p>
                      <p className="text-xs text-muted capitalize">{a.type}</p>
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </section>
      </div>
      <section className="rise rise-4">
        <SectionLabel index={3} total={3}>In scadenza</SectionLabel>
        {expiring.length + expired.length === 0 ? <Empty>Nessun percorso in scadenza nei prossimi 30 giorni.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...expired, ...expiring].map((p) => {
              const st = PROGRAM_STATUS[p.status]; const pay = PAYMENT_STATE[p.payment_state];
              return (
                <Link key={p.id} href={`/clients/${p.client_id}`} className={cx("glass lift block p-5", p.status === "scaduto" && "glow")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium tracking-tight">{p.first_name} {p.last_name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">Percorso {DURATION_LABEL[p.duration]} — {TYPE_LABEL[p.type]}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className={cx("numeral text-[40px]", p.days_left < 0 ? "text-danger" : p.days_left <= 14 ? "text-orange" : "text-warn")}>{Math.abs(p.days_left)}</p>
                      <p className="label mt-1.5 !text-[10px]">{p.days_left < 0 ? "giorni fa" : "giorni rimanenti"}</p>
                    </div>
                    <div className="text-right text-[13px]">
                      <p className="text-muted">Scadenza</p>
                      <p>{fmtDateLong(p.end_date)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t hairline pt-4 text-[13px]">
                    <span className="text-muted">Pagamento: <span className={cx(pay.tone === "red" ? "text-danger" : "text-fg")}>{pay.label}</span></span>
                    <span className="flex items-center gap-1 text-accent-3"><CalendarClock size={13} /> Proponi rinnovo</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
