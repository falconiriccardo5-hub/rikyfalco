import Link from "next/link";
import { ArrowUpRight, CircleAlert, Clock, MessageCircle, RefreshCcw, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadOverview, currentPrograms } from "@/server/queries";
import { SectionLabel, Empty, cx } from "@/components/ui";
import PurplePlanet from "@/components/purple-planet";
import { RiccardoMage } from "@/components/riccardo-mage";
import { ClientTile } from "@/components/client-tile";
import { eur, fmtDateLong, DURATION_LABEL, daysLabel, type Tone } from "@/lib/format";

export const metadata = { title: "Dashboard" };

type Task = { key: string; tone: Tone; icon: typeof Clock; who: string; clientId: string; what: string; action: string; sort: number };

export default async function Dashboard() {
  const { supabase, profile } = await requireAdmin();
  const { programs, openPayments, appointments, pastAppointments, today } = await loadOverview(supabase);
  const current = [...currentPrograms(programs).values()];
  const active = current.filter((p) => p.status === "attivo" || p.status === "in_scadenza");
  const expiring = current.filter((p) => p.status === "in_scadenza").sort((a, b) => a.days_left - b.days_left);
  const expired = current.filter((p) => p.status === "scaduto");
  const overdue = openPayments.filter((p) => p.status === "scaduto");
  const dueSoon = openPayments.filter((p) => p.status === "in_attesa");
  const todayAppts = appointments.filter((a) => a.starts_at.slice(0, 10) === today);

  // ultima e prossima lezione per cliente
  const lastByClient = new Map<string, string>();
  for (const a of pastAppointments) if (a.client_id && !lastByClient.has(a.client_id)) lastByClient.set(a.client_id, a.starts_at);
  const nextByClient = new Map<string, string>();
  for (const a of appointments) if (a.client_id && !nextByClient.has(a.client_id)) nextByClient.set(a.client_id, a.starts_at);
  const nextPayByClient = new Map<string, (typeof openPayments)[number]>();
  for (const p of openPayments) if (!nextPayByClient.has(p.client_id)) nextPayByClient.set(p.client_id, p);
  const overdueClients = new Set(overdue.map((p) => p.client_id));

  const tasks: Task[] = [
    ...overdue.map((p) => ({ key: "o" + p.id, tone: "red" as Tone, icon: Wallet, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Rata di ${eur(p.amount)} scaduta da ${-p.days_to_due} gg`, action: "Sollecita pagamento", sort: 0 })),
    ...expired.map((p) => ({ key: "e" + p.id, tone: "red" as Tone, icon: CircleAlert, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Percorso ${DURATION_LABEL[p.duration]} scaduto il ${fmtDateLong(p.end_date)}`, action: "Rinnova o chiudi", sort: 1 })),
    ...dueSoon.map((p) => ({ key: "d" + p.id, tone: "orange" as Tone, icon: Clock, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Rata di ${eur(p.amount)} tra ${daysLabel(p.days_to_due)}`, action: "Invia promemoria", sort: 2 })),
    ...expiring.map((p) => ({ key: "x" + p.id, tone: "amber" as Tone, icon: RefreshCcw, who: `${p.first_name} ${p.last_name}`, clientId: p.client_id, what: `Percorso termina tra ${daysLabel(p.days_left)}`, action: "Proponi rinnovo", sort: 3 })),
  ].sort((a, b) => a.sort - b.sort);

  const hour = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));
  const greet = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const first = (profile.name || "Riccardo").split(" ")[0];
  const chips = [
    { label: `${active.length} ${active.length === 1 ? "cliente" : "clienti"}`, href: "/clients" },
    { label: `${todayAppts.length} ${todayAppts.length === 1 ? "lezione oggi" : "lezioni oggi"}`, href: "/calendar" },
    { label: overdue.length ? `${overdue.length} da incassare` : "Tutto incassato", href: "/payments" },
  ];

  return (
    <div className="space-y-10">
      <section className="rise relative overflow-hidden rounded-[28px] border hairline px-6 py-7 sm:px-8">
        <PurplePlanet className="absolute -top-10 -right-24 size-[320px] sm:-right-16 sm:size-[380px]" />
        <div className="relative max-w-[62%] sm:max-w-none">
          <p className="label mb-3">
            {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })}
          </p>
          <h1 className="text-[38px] leading-[1.05] font-medium tracking-[-0.04em] sm:text-[46px]">
            {greet},<br />{first}.
          </h1>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="press rounded-full border border-line bg-white/[.05] px-4 py-2.5 text-[15px] backdrop-blur-md transition hover:border-line-strong">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
        <RiccardoMage className="absolute top-5 right-[36%] sm:right-[44%]" />
      </section>

      <section>
        <SectionLabel index={1} total={2}>I tuoi clienti</SectionLabel>
        {active.length === 0 ? <Empty>Nessun cliente attivo. Aggiungine uno per iniziare.</Empty> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((p) => (
              <ClientTile
                key={p.id}
                program={p}
                nextPayment={nextPayByClient.get(p.client_id) ?? null}
                last={lastByClient.has(p.client_id) ? { starts_at: lastByClient.get(p.client_id)! } : null}
                next={nextByClient.has(p.client_id) ? { starts_at: nextByClient.get(p.client_id)! } : null}
                overdue={overdueClients.has(p.client_id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel index={2} total={2}>Da gestire</SectionLabel>
        {tasks.length === 0 ? <Empty>Nessuna azione in sospeso. Tutto sotto controllo.</Empty> : (
          <div className="glass divide-y divide-line overflow-hidden">
            {tasks.map((t) => (
              <Link key={t.key} href={`/clients/${t.clientId}`} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[.03] sm:px-5">
                <span className={cx("grid size-11 shrink-0 place-items-center rounded-full ring-1",
                  t.tone === "red" ? "bg-danger/10 text-danger ring-danger/25" : t.tone === "orange" ? "bg-orange/10 text-orange ring-orange/25" : "bg-warn/10 text-warn ring-warn/25")}>
                  <t.icon size={18} strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium">{t.who}</p>
                  <p className="truncate text-[13px] text-muted">{t.what}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border hairline text-muted transition group-hover:text-fg">
                  <MessageCircle size={16} />
                </span>
                <span className={cx("hidden shrink-0 items-center gap-1 text-[13px] sm:flex", t.tone === "red" ? "text-danger" : "text-accent-3")}>
                  {t.action} <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
