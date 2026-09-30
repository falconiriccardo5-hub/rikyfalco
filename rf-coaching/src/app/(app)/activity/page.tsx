import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { describe, SOURCE, type AuditRow } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
export const metadata = { title: "Attività" };
export default async function ActivityPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: clients }] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("clients").select("id,first_name,last_name"),
  ]);
  const names = new Map((clients ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`]));
  const rows = (data ?? []) as AuditRow[];
  return (
    <>
      <PageHeader eyebrow="Registro immutabile di ogni modifica" title="Attività" />
      {rows.length === 0 ? <Empty>Nessuna attività registrata.</Empty> : (
        <Card className="rise rise-1 divide-y divide-line overflow-hidden">
          {rows.map((a) => {
            const d = describe(a);
            return (
              <div key={a.id} className="grid gap-1 px-4 py-4 sm:grid-cols-[150px_1fr_auto] sm:gap-6 sm:px-5">
                <p className="label !text-[11px] !normal-case !tracking-normal text-dim">{fmtDateTime(a.created_at)}</p>
                <div className="min-w-0">
                  <p className="text-sm">
                    {a.client_id && names.get(a.client_id) ? <Link href={`/clients/${a.client_id}`} className="font-medium hover:text-accent-3">{names.get(a.client_id)}</Link> : <span className="text-muted">—</span>}
                    <span className="text-muted"> → </span>{d.title}
                  </p>
                  {d.changes.map((c) => <p key={c.field} className="text-[12px] text-muted">{c.field}: {c.from} → <span className="text-fg">{c.to}</span></p>)}
                </div>
                <div><Badge tone={a.source === "ai" ? "violet" : a.source === "cron" ? "blue" : "muted"}>{SOURCE[a.source] ?? a.source}</Badge></div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
