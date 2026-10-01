import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, ClipboardList, CircleAlert, Clock, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Avatar, Badge, Card, Empty, SectionLabel, cx } from "@/components/ui";
import { daysLabel, fmtDate, todayISO, type Tone } from "@/lib/format";
import { MODELLO_VISITA, VISIT_KIND_LABEL, VISIT_STATE, VISIT_STATUS, fieldsFor } from "@/lib/visit-template";
import type { VisitOverviewRow } from "@/server/visits";
import { RunVisitAutomations } from "./widgets";

export const metadata = { title: "Visita" };

const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

export default async function VisitsPage() {
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const [ov, open] = await Promise.all([
    supabase.from("visit_overview").select("*").is("archived_at", null).order("last_name"),
    supabase.from("visits").select("id,client_id,kind,visit_date,status,client_submitted_at,clients(first_name,last_name)")
      .neq("status", "completata").order("visit_date"),
  ]);
  const rows = (ov.data ?? []) as VisitOverviewRow[];
  const openVisits = (open.data ?? []) as unknown as { id: string; client_id: string; kind: "iniziale" | "check"; visit_date: string; status: string; clients: { first_name: string; last_name: string } | null }[];
  const toComplete = openVisits.filter((v) => v.status === "compilata_cliente");
  const waiting = openVisits.filter((v) => v.status === "da_compilare");
  const overdue = rows.filter((r) => r.visit_state === "scaduta");
  const dueSoon = rows.filter((r) => r.visit_state === "in_scadenza");
  const never = rows.filter((r) => r.visit_state === "mai_fatta");

  type Task = { key: string; tone: Tone; icon: typeof Clock; who: string; href: string; what: string; action: string };
  const tasks: Task[] = [
    ...toComplete.map((v) => ({ key: "c" + v.id, tone: "violet" as Tone, icon: ClipboardCheck, who: name(v.clients), href: `/visite/${v.id}`, what: `${VISIT_KIND_LABEL[v.kind]} compilata dal cliente`, action: "Completa la visita" })),
    ...overdue.map((r) => ({ key: "o" + r.client_id, tone: "red" as Tone, icon: CircleAlert, who: name(r), href: `/clients/${r.client_id}#visite`, what: `Check scaduto da ${daysLabel(dayDiff(today, r.next_due!))}`, action: "Crea il check" })),
    ...dueSoon.map((r) => ({ key: "d" + r.client_id, tone: "amber" as Tone, icon: Clock, who: name(r), href: `/clients/${r.client_id}#visite`, what: `Check previsto il ${fmtDate(r.next_due)}`, action: "Prepara il check" })),
  ];
  const kpis: { label: string; value: number; sub?: string; tone?: Tone }[] = [
    { label: "Da completare", value: toComplete.length, sub: "compilate dal cliente", tone: toComplete.length ? "violet" : undefined },
    { label: "Check scaduti", value: overdue.length, sub: `oltre ${MODELLO_VISITA.intervalDays} giorni`, tone: overdue.length ? "red" : undefined },
    { label: "In scadenza", value: dueSoon.length, sub: "prossimi 7 giorni", tone: dueSoon.length ? "amber" : undefined },
    { label: "In attesa del cliente", value: waiting.length, sub: "moduli inviati" },
  ];

  return (
    <div className="space-y-12">
      <section className="rise relative overflow-hidden rounded-[28px] border hairline px-6 pt-8 pb-28 sm:px-10 sm:pt-12 sm:pb-40">
        <div className="planet" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label mb-4">Visita · check ogni {MODELLO_VISITA.intervalDays} giorni</p>
            <h1 className="max-w-xl text-[34px] leading-[1.02] font-medium tracking-[-0.04em] sm:text-[52px]">
              Visite e check.<br /><span className="text-muted">Chi devi rivedere?</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="numeral text-[72px] sm:text-[96px]">{tasks.length}</p>
            <p className="label mt-2">{tasks.length} azioni · {never.length} senza visita</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className={cx("rise p-5 sm:p-6", `rise-${i + 1}`, k.tone === "red" && "glow")}>
            <p className="label !text-[10px] sm:!text-[11px]">{k.label}</p>
            <p className={cx("numeral mt-6 text-[44px] sm:text-[56px]", k.tone === "red" && "text-danger", k.tone === "amber" && "text-warn", k.tone === "violet" && "text-accent-3")}>{k.value}</p>
            {k.sub && <p className="mt-2 text-xs text-muted">{k.sub}</p>}
          </Card>
        ))}
      </section>

      <div className="grid gap-12 xl:grid-cols-[1.25fr_1fr] xl:gap-8">
        <section className="rise rise-2">
          <SectionLabel index={1} total={3} action={<RunVisitAutomations />}>Da gestire</SectionLabel>
          {tasks.length === 0 ? <Empty>Nessuna visita da gestire. Tutti i check sono in regola.</Empty> : (
            <Card className="divide-y divide-line overflow-hidden">
              {tasks.map((t) => (
                <Link key={t.key} href={t.href} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[.03] sm:px-5">
                  <span className={cx("grid size-10 shrink-0 place-items-center rounded-full ring-1",
                    t.tone === "red" ? "bg-danger/10 text-danger ring-danger/25" : t.tone === "amber" ? "bg-warn/10 text-warn ring-warn/25" : "bg-accent/15 text-accent-3 ring-accent/30")}>
                    <t.icon size={17} strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{t.who}</p>
                    <p className="truncate text-[13px] text-muted">{t.what}</p>
                  </div>
                  <span className="hidden text-[12px] text-accent-3 sm:block">{t.action}</span>
                  <ArrowUpRight size={16} className="shrink-0 text-dim transition group-hover:text-fg" />
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section className="rise rise-3">
          <SectionLabel index={2} total={3}>Modello visita</SectionLabel>
          <Link href="/visite/modello" className="glass lift group flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-3 ring-1 ring-accent/30"><FileText size={20} strokeWidth={1.6} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{MODELLO_VISITA.name}</p>
              <p className="text-[13px] text-muted">
                Visita iniziale · {fieldsFor("iniziale").length} campi — Check · {fieldsFor("check").length} campi
              </p>
            </div>
            <ArrowUpRight size={16} className="text-dim transition group-hover:text-fg" />
          </Link>
          <p className="mt-3 px-1 text-xs text-muted">Assegnato a tutti i clienti: il check viene creato in automatico quando è in scadenza e il cliente lo trova nel suo link.</p>
        </section>
      </div>

      <section className="rise rise-4">
        <SectionLabel index={3} total={3}>Clienti</SectionLabel>
        {rows.length === 0 ? <Empty>Nessun cliente.</Empty> : (
          <Card className="divide-y divide-line overflow-hidden">
            {rows.map((r) => {
              const st = r.open_visit_status ? VISIT_STATUS[r.open_visit_status] : VISIT_STATE[r.visit_state];
              return (
                <Link key={r.client_id} href={r.open_visit_id ? `/visite/${r.open_visit_id}` : `/clients/${r.client_id}#visite`}
                  className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[.03] sm:px-5">
                  <Avatar first={r.first_name} last={r.last_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{r.first_name} {r.last_name}</p>
                    <p className="truncate text-xs text-muted">
                      {r.last_visit_date ? `Ultima: ${fmtDate(r.last_visit_date)} · ${r.visits_done} ${r.visits_done === 1 ? "visita" : "visite"}` : "Nessuna visita completata"}
                      {r.next_due && ` · Prossimo check: ${fmtDate(r.next_due)}`}
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
      <p className="flex items-center gap-2 text-xs text-dim"><ClipboardList size={14} /> Le visite si creano dalla scheda del cliente.</p>
    </div>
  );
}

function name(c: { first_name: string; last_name: string } | null) {
  return c ? `${c.first_name} ${c.last_name}` : "—";
}
