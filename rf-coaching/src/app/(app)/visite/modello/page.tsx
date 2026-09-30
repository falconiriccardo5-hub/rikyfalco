import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";
import { defaultTemplate } from "@/server/visits";
import type { VisitField, VisitKind } from "@/lib/visit-template";

export const metadata = { title: "Modello visita" };

const TYPE: Record<VisitField["type"], string> = {
  text: "Testo", textarea: "Testo lungo", number: "Numero", date: "Data", select: "Scelta", multiselect: "Scelta multipla",
  score: "Voto 1-5", computed: "Calcolato",
};

export default async function TemplatePage() {
  const { supabase } = await requireAdmin();
  const t = await defaultTemplate(supabase);
  const kinds = Object.entries(t.body.kinds) as [VisitKind, (typeof t.body.kinds)[VisitKind]][];
  return (
    <div className="space-y-10">
      <Link href="/visite" className="label inline-flex items-center gap-1 hover:text-fg"><ChevronLeft size={14} /> Visita</Link>
      <PageHeader eyebrow={`Versione ${t.version} · check ogni ${t.body.intervalDays} giorni`} title={t.name} />
      <p className="-mt-4 max-w-2xl text-sm text-muted">
        Il modello viene assegnato a ogni cliente: la <span className="text-fg">visita iniziale</span> all&apos;inizio del percorso, poi un
        <span className="text-fg"> check</span> ogni {t.body.intervalDays} giorni. Le sezioni <Badge tone="blue">Cliente</Badge> si compilano dal link
        del cliente, le sezioni <Badge tone="violet">Coach</Badge> le compili tu.
      </p>
      {kinds.map(([kind, spec]) => (
        <section key={kind} className="rise space-y-4">
          <h2 className="text-[22px] font-medium tracking-tight">{spec.title}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {spec.sections.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-medium">{s.title}</h3>
                  <Badge tone={s.who === "cliente" ? "blue" : "violet"}>{s.who === "cliente" ? "Cliente" : "Coach"}</Badge>
                </div>
                <ol className="space-y-2.5">
                  {s.fields.map((f) => (
                    <li key={f.id} className={f.detailOf ? "border-l-2 border-line pl-3" : ""}>
                      <p className="text-[13px] leading-snug">{f.label}</p>
                      <p className="text-[11px] text-dim">
                        {TYPE[f.type]}{f.unit && ` · ${f.unit}`}{f.formula && ` · ${f.formula}`}
                        {f.options && ` · ${f.options.join(", ")}`}{f.notes && " · con note"}
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
