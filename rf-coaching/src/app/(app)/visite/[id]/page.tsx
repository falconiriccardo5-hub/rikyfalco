import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, SectionLabel, cx } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Radar } from "@/components/visits/radar";
import { VISIT_KIND_LABEL, VISIT_STATUS, radarFor, type VisitAnswers, type VisitTemplate } from "@/lib/visit-template";
import type { VisitRow } from "@/server/visits";
import { ClientLink, VisitActions, VisitEditor } from "../widgets";

export const metadata = { title: "Visita" };

const MEASURES = [
  { id: "peso", label: "Peso", unit: "kg" }, { id: "bf", label: "BF", unit: "%" }, { id: "mg", label: "Massa grassa", unit: "kg" },
  { id: "mm", label: "Massa magra", unit: "kg" }, { id: "kcal", label: "Kcal", unit: "" },
];

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("visits").select("*, clients(first_name,last_name)").eq("id", id).maybeSingle();
  const v = data as (VisitRow & { clients: { first_name: string; last_name: string } }) | null;
  if (!v) notFound();
  const { data: prevData } = await supabase.from("visits").select("kind,visit_date,answers,template").eq("client_id", v.client_id)
    .eq("status", "completata").lt("visit_date", v.visit_date).order("visit_date", { ascending: false }).limit(1).maybeSingle();
  const prev = prevData as Pick<VisitRow, "kind" | "visit_date" | "answers" | "template"> | null;

  const tpl = (kind: string, t: VisitRow["template"]) => ({ kinds: { [kind]: t } }) as unknown as VisitTemplate;
  const radar = radarFor(v.kind, v.answers, tpl(v.kind, v.template));
  const prevRadar = prev ? radarFor(prev.kind, prev.answers, tpl(prev.kind, prev.template)) : undefined;
  const num = (a: VisitAnswers | undefined, k: string) => { const x = a?.[k]?.value; return typeof x === "number" ? x : null; };
  const st = VISIT_STATUS[v.status];

  return (
    <div className="space-y-10">
      <Link href={`/clients/${v.client_id}#visite`} className="label inline-flex items-center gap-1 hover:text-fg"><ChevronLeft size={14} /> {v.clients.first_name} {v.clients.last_name}</Link>
      <header className="rise flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2"><Badge tone={st.tone}>{st.label}</Badge><Badge>{VISIT_KIND_LABEL[v.kind]}</Badge></div>
          <h1 className="text-[32px] leading-none font-medium tracking-[-0.035em] sm:text-[44px]">{v.template.title}</h1>
          <p className="mt-3 text-sm text-muted">
            {v.clients.first_name} {v.clients.last_name} · {fmtDate(v.visit_date)}
            {v.client_submitted_at && ` · compilato dal cliente il ${fmtDateTime(v.client_submitted_at)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.status === "da_compilare" && <ClientLink clientId={v.client_id} />}
          <VisitActions id={v.id} status={v.status} />
        </div>
      </header>

      <section className="rise rise-1 grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="flex flex-col items-center p-6">
          <p className="label self-start">Area personale</p>
          <Radar points={radar} previous={prevRadar} />
          {prev && <p className="text-xs text-muted">Tratteggio: visita del {fmtDate(prev.visit_date)}</p>}
        </Card>
        <Card className="p-6">
          <p className="label">Misure{prev && ` · rispetto al ${fmtDate(prev.visit_date)}`}</p>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {MEASURES.map((m) => {
              const cur = num(v.answers, m.id), before = num(prev?.answers, m.id);
              const d = cur != null && before != null ? Math.round((cur - before) * 10) / 10 : null;
              return (
                <div key={m.id}>
                  <p className="text-sm text-muted">{m.label}</p>
                  <p className="numeral mt-1 text-[32px]">{cur ?? "—"}<span className="ml-1 text-xs text-muted">{cur != null && m.unit}</span></p>
                  {d != null && d !== 0 && <p className={cx("text-xs", d < 0 ? "text-accent-3" : "text-muted")}>{d > 0 ? "+" : ""}{d} {m.unit}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="rise rise-2">
        <SectionLabel>Modulo</SectionLabel>
        <VisitEditor id={v.id} sections={v.template.sections} initial={v.answers} date={v.visit_date} completed={v.status === "completata"} />
      </section>
    </div>
  );
}
