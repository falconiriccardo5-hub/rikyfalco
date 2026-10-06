import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Empty, cx, SectionLabel, Badge } from "@/components/ui";
import { NewAppointment, EditAppointment } from "@/components/appointments";
import { ActButton } from "@/components/forms/action-form";
import { syncCalendarAction } from "@/server/actions";
import { accessToken, googleStatus, listEvents } from "@/server/integrations/google";
import { fmtTime, todayISO, addDaysISO, eur } from "@/lib/format";
export const metadata = { title: "Calendario" };
type Ev = { at: string; time?: string; kind: "appuntamento" | "rata" | "fine" | "google"; label: string; href?: string; appt?: { id: string; client_id: string | null; starts_at: string; ends_at: string; type: string; notes: string | null }; synced?: boolean };
const COLOR = { appuntamento: "bg-accent-2", rata: "bg-orange", fine: "bg-warn", google: "bg-info" };
const LABEL = { appuntamento: "appuntamento", rata: "rata", fine: "fine percorso", google: "Google Calendar" };
const romeDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
export default async function CalendarPage() {
  const { supabase } = await requireAdmin();
  const from = todayISO(); const to = addDaysISO(from, 30);
  const [ap, pay, pr, cl, gs] = await Promise.all([
    supabase.from("appointments").select("id,client_id,starts_at,ends_at,type,notes,google_event_id,clients(first_name,last_name)").gte("starts_at", from).lt("starts_at", to).order("starts_at"),
    supabase.from("payment_overview").select("id,client_id,due_date,amount,first_name,last_name").is("paid_date", null).gte("due_date", from).lt("due_date", to),
    supabase.from("program_overview").select("id,client_id,end_date,first_name,last_name").is("manual_status", null).gte("end_date", from).lt("end_date", to),
    supabase.from("clients").select("id,first_name,last_name").is("archived_at", null).order("last_name"),
    googleStatus(supabase),
  ]);
  const clients = (cl.data ?? []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }));
  const appts = (ap.data ?? []) as unknown as (NonNullable<Ev["appt"]> & { google_event_id: string | null; clients: { first_name: string; last_name: string } | null })[];
  let google: Ev[] = []; let gError: string | null = null;
  if (gs.connected && gs.calendar) {
    try {
      const token = await accessToken(supabase);
      const mine = new Set(appts.map((a) => a.google_event_id));
      const items = token ? await listEvents(token, new Date(from + "T00:00:00Z").toISOString(), new Date(to + "T00:00:00Z").toISOString()) : [];
      google = items.filter((e) => !mine.has(e.id) && !e.extendedProperties?.private?.rfAppointmentId).map((e) => {
        const s = e.start.dateTime ?? e.start.date!;
        return { at: e.start.dateTime ? romeDay(s) : s, time: e.start.dateTime ? fmtTime(s) : undefined, kind: "google" as const, label: e.summary ?? "(senza titolo)" };
      });
    } catch (e) { gError = (e as Error).message; }
  }
  const ev: Ev[] = ([
    ...appts.map((a) => ({ at: romeDay(a.starts_at), time: fmtTime(a.starts_at), kind: "appuntamento" as const, label: `${a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : "Senza cliente"} · ${a.type}`, href: a.client_id ? `/clients/${a.client_id}` : undefined, appt: a, synced: !!a.google_event_id })),
    ...(pay.data ?? []).map((p) => ({ at: p.due_date, kind: "rata" as const, label: `Rata ${eur(p.amount)} · ${p.first_name} ${p.last_name}`, href: `/clients/${p.client_id}` })),
    ...(pr.data ?? []).map((p) => ({ at: p.end_date, kind: "fine" as const, label: `Fine percorso · ${p.first_name} ${p.last_name}`, href: `/clients/${p.client_id}` })),
    ...google,
  ] as Ev[]).sort((a, b) => (a.at + (a.time ?? "00")).localeCompare(b.at + (b.time ?? "00")));
  const days = [...new Set(ev.map((e) => e.at))];
  return (
    <>
      <PageHeader eyebrow="Prossimi 30 giorni" title="Calendario">
        <NewAppointment clients={clients} today={from} label="Nuovo appuntamento" primary />
      </PageHeader>
      <Card className="rise rise-1 mb-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 text-sm">
          <span className={cx("size-2 rounded-full", gs.connected && gs.calendar ? "bg-ok shadow-[0_0_8px_rgba(74,222,128,.8)]" : "bg-dim")} />
          {gs.connected && gs.calendar ? <>Google Calendar collegato <span className="text-muted">· {gs.email}</span></> : <span className="text-muted">Google Calendar non collegato — calendario interno attivo</span>}
          {gError && <Badge tone="red">Errore Google: {gError.slice(0, 60)}</Badge>}
        </div>
        {gs.connected && gs.calendar
          ? <ActButton act={syncCalendarAction} className="press h-8 rounded-full border border-line px-3.5 text-[13px] hover:bg-white/5">Sincronizza ora</ActButton>
          : <Link href="/settings#google" className="text-[13px] text-accent-3">Collega →</Link>}
      </Card>
      <SectionLabel>Agenda</SectionLabel>
      <div className="mb-4 flex flex-wrap gap-4 text-[12px] text-muted">
        {(Object.keys(COLOR) as (keyof typeof COLOR)[]).filter((k) => k !== "google" || gs.connected).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={cx("size-2 rounded-full", COLOR[k])} />{LABEL[k]}</span>)}
      </div>
      {days.length === 0 ? <Empty>Nessun evento nei prossimi 30 giorni.</Empty> : (
        <div className="space-y-3">
          {days.map((d) => (
            <Card key={d} className="grid gap-3 p-4 sm:grid-cols-[140px_1fr] sm:p-5">
              <p className={cx("label pt-1", d === from && "!text-accent-3")}>{d === from ? "Oggi" : new Date(d + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</p>
              <div className="space-y-2.5">
                {ev.filter((e) => e.at === d).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={cx("size-2 shrink-0 rounded-full", COLOR[e.kind])} />
                    <span className="w-12 shrink-0 text-muted">{e.time ?? "—"}</span>
                    {e.href ? <Link href={e.href} className="min-w-0 flex-1 truncate hover:text-accent-3">{e.label}</Link> : <span className="min-w-0 flex-1 truncate">{e.label}</span>}
                    {e.synced && <span className="label hidden !text-[9px] text-info sm:inline">Google ✓</span>}
                    {e.appt && <EditAppointment a={e.appt} clients={clients} today={from} />}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
