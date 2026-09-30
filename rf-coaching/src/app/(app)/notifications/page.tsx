import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Empty, cx, DOT } from "@/components/ui";
import { ActButton } from "@/components/forms/action-form";
import { markReadAction, runAutomationsAction } from "@/server/actions";
import { fmtDateTime, type Tone } from "@/lib/format";
export const metadata = { title: "Notifiche" };
const TONE: Record<string, Tone> = { pagamento_scaduto: "red", pagamento_in_arrivo: "orange", percorso_in_scadenza: "amber", nuovo_appuntamento: "blue", pagamento_ricevuto: "green", sistema: "violet", visita_in_scadenza: "amber", visita_compilata: "violet" };
const btn = "press inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] hover:bg-white/5";
export default async function Notifications() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: last }] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("settings").select("value").eq("key", "last_automation_run").maybeSingle(),
  ]);
  const list = (data ?? []) as { id: string; type: string; title: string; body: string | null; client_id: string | null; read_at: string | null; created_at: string }[];
  const unread = list.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader eyebrow={`${unread} da leggere`} title="Notifiche">
        <ActButton act={runAutomationsAction} className={btn}>Esegui controllo ora</ActButton>
        {unread > 0 && <ActButton act={() => markReadAction("all")} className={btn}>Segna tutte come lette</ActButton>}
      </PageHeader>
      <p className="label mb-5 !normal-case !tracking-normal">
        Controllo automatico ogni giorno alle 08:00 (server){last?.value ? ` · ultimo: ${fmtDateTime(String(last.value))}` : ""}
      </p>
      {list.length === 0 ? <Empty>Nessuna notifica.</Empty> : (
        <Card className="rise rise-1 divide-y divide-line overflow-hidden">
          {list.map((n) => (
            <div key={n.id} className={cx("flex items-start gap-4 px-4 py-4 sm:px-5", !n.read_at && "bg-accent/[.04]")}>
              <span className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[TONE[n.type] ?? "muted"], !n.read_at && "shadow-[0_0_10px_currentColor]")} />
              <Link href={n.client_id ? `/clients/${n.client_id}` : "#"} className="min-w-0 flex-1">
                <p className={cx("text-[15px]", !n.read_at ? "font-medium" : "text-muted")}>{n.title}</p>
                {n.body && <p className="text-[13px] text-muted">{n.body}</p>}
                <p className="label mt-1 !text-[10px] text-dim">{fmtDateTime(n.created_at)}</p>
              </Link>
              {!n.read_at && <ActButton act={() => markReadAction(n.id)} className="label shrink-0 !text-[10px] hover:text-fg">Letta</ActButton>}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
