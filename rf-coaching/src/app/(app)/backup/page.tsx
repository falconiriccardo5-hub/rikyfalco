import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, SectionLabel, Badge, Empty, cx } from "@/components/ui";
import { googleStatus } from "@/server/integrations/google";
import { fmtDateTime } from "@/lib/format";
import { BackupNow, Restore } from "./widgets";
export const metadata = { title: "Backup" };
const dl = "press inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-[13px] transition hover:bg-white/5";
export default async function BackupPage() {
  const { supabase } = await requireAdmin();
  const [{ data: list }, gs] = await Promise.all([
    supabase.from("backups").select("id,kind,status,destination,file_url,error,size_bytes,created_at,finished_at").order("created_at", { ascending: false }).limit(20),
    googleStatus(supabase),
  ]);
  const last = list?.find((b) => b.kind !== "pre-restore");
  const drive = gs.connected && gs.drive;
  return (
    <>
      <PageHeader eyebrow="Backup e recovery" title="Backup"><BackupNow /></PageHeader>
      <section className="rise rise-1 mb-10 grid gap-3 sm:grid-cols-3">
        <Card className={cx("p-5 sm:col-span-2", last?.status === "errore" && "glow")}>
          <p className="label">Ultimo backup</p>
          {last ? (
            <>
              <p className="numeral mt-5 text-[34px]">{fmtDateTime(last.created_at)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={last.status === "completato" ? "green" : last.status === "errore" ? "red" : "amber"}>{last.status === "completato" ? "✓ Completato" : last.status}</Badge>
                <span className="text-muted">{last.destination === "google_drive" ? "Database + Google Drive" : "Solo database (Drive non collegato)"}</span>
                {last.file_url && <a href={last.file_url} target="_blank" rel="noreferrer" className="text-accent-3">Apri su Drive →</a>}
              </div>
              {last.error && <p className="mt-3 text-sm text-danger">{last.error}</p>}
            </>
          ) : <p className="mt-5 text-muted">Nessun backup eseguito finora.</p>}
        </Card>
        <Card className="p-5">
          <p className="label">Google Drive</p>
          <p className="mt-5 text-lg">{drive ? "Collegato" : "Google Drive non configurato"}</p>
          <p className="mt-1 text-sm text-muted">{drive ? gs.email : "I backup restano nel database. Collega Google da Impostazioni."}</p>
        </Card>
      </section>
      <section className="rise rise-2 mb-10">
        <SectionLabel>Esporta</SectionLabel>
        <Card className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-sm text-muted">Tutti i dati (clienti, percorsi, pagamenti, appuntamenti)</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export?format=json&entity=all" className={dl}>JSON</a>
            <a href="/api/export?format=xlsx&entity=all" className={dl}>Excel</a>
          </div>
          {(["clients", "programs", "payments", "appointments"] as const).map((e) => (
            <div key={e} className="contents">
              <p className="border-t hairline pt-3 text-sm capitalize sm:border-0 sm:pt-0">{{ clients: "Clienti", programs: "Percorsi", payments: "Pagamenti", appointments: "Appuntamenti" }[e]}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/export?format=csv&entity=${e}`} className={dl}>CSV</a>
                <a href={`/api/export?format=xlsx&entity=${e}`} className={dl}>Excel</a>
                <a href={`/api/export?format=json&entity=${e}`} className={dl}>JSON</a>
              </div>
            </div>
          ))}
        </Card>
      </section>
      <section className="rise rise-3 mb-10">
        <SectionLabel>Storico backup</SectionLabel>
        {!list?.length ? <Empty>Nessun backup.</Empty> : (
          <Card className="divide-y divide-line overflow-hidden">
            {list.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                <span className="w-36">{fmtDateTime(b.created_at)}</span>
                <Badge tone={b.status === "completato" ? "green" : b.status === "errore" ? "red" : "amber"}>{b.status}</Badge>
                <span className="text-muted">{b.kind} · {b.destination === "google_drive" ? "Drive" : "database"}{b.size_bytes ? ` · ${Math.round(b.size_bytes / 1024)} KB` : ""}</span>
                {b.file_url && <a href={b.file_url} target="_blank" rel="noreferrer" className="ml-auto text-accent-3">Drive →</a>}
              </div>
            ))}
          </Card>
        )}
      </section>
      <section className="rise rise-4">
        <SectionLabel>Ripristino</SectionLabel>
        <Restore backups={(list ?? []).filter((b) => b.status === "completato").map((b) => ({ id: b.id, label: `${fmtDateTime(b.created_at)} · ${b.kind}` }))} />
      </section>
    </>
  );
}
