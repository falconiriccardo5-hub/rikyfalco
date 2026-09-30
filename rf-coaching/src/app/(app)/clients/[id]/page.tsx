import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Cake, ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { ClientRow, PaymentRow, ProgramRow } from "@/server/queries";
import { Avatar, Badge, Card, SectionLabel, Empty, Progress, cx } from "@/components/ui";
import { describe, SOURCE, type AuditRow } from "@/lib/audit";
import { eur, fmtDate, fmtDateLong, fmtDateTime, fmtTime, fmtDay, daysLabel, todayISO, DURATION_LABEL, TYPE_LABEL, PROGRAM_STATUS, PAYMENT_STATUS, METHOD_LABEL } from "@/lib/format";
import { NewAppointment, EditAppointment } from "@/components/appointments";
import { emailConfigured } from "@/server/integrations/email";
import { VISIT_KIND_LABEL, VISIT_STATE, VISIT_STATUS, progress, type VisitAnswers } from "@/lib/visit-template";
import type { VisitOverviewRow } from "@/server/visits";
import { NewVisit, ClientLink } from "../../visite/widgets";
import { EditClient, SendEmail, ClientDanger, EditProgram, NewProgram, Lessons, PayButton, UndoPay, AddPayment, DeletePayment } from "./widgets";
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const [c, pr, pay, ap, au, tpl, mails, vs, vo] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("program_overview").select("*").eq("client_id", id).order("start_date", { ascending: false }),
    supabase.from("payment_overview").select("*").eq("client_id", id).order("due_date"),
    supabase.from("appointments").select("*").eq("client_id", id).gte("starts_at", today).order("starts_at").limit(6),
    supabase.from("audit_logs").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(40),
    supabase.from("email_templates").select("subject,body").eq("key", "manuale").maybeSingle(),
    supabase.from("email_logs").select("id,type,subject,status,created_at,error").eq("client_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("visits").select("id,kind,visit_date,status,answers").eq("client_id", id).order("visit_date", { ascending: false }),
    supabase.from("visit_overview").select("*").eq("client_id", id).maybeSingle(),
  ]);
  const visitList = (vs.data ?? []) as { id: string; kind: "iniziale" | "check"; visit_date: string; status: string; answers: VisitAnswers }[];
  const visitState = vo.data as VisitOverviewRow | null;
  const client = c.data as ClientRow | null;
  if (!client) notFound();
  const programs = (pr.data ?? []) as ProgramRow[];
  const payments = (pay.data ?? []) as PaymentRow[];
  const cur = programs[0];
  const st = cur ? PROGRAM_STATUS[cur.status] : null;
  const curPayments = cur ? payments.filter((p) => p.program_id === cur.id) : [];
  const otherPayments = payments.filter((p) => !cur || p.program_id !== cur.id);
  return (
    <div className="space-y-10">
      <Link href="/clients" className="label inline-flex items-center gap-1 hover:text-fg"><ChevronLeft size={14} /> Clienti</Link>
      {/* HEADER */}
      <header className="rise flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-5">
          <Avatar first={client.first_name} last={client.last_name} size={64} />
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {client.archived_at ? <Badge>Archiviato</Badge> : st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>Senza percorso</Badge>}
            </div>
            <h1 className="text-[32px] leading-none font-medium tracking-[-0.035em] sm:text-[44px]">{client.first_name} {client.last_name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.phone && <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="press inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-white/5"><Phone size={15} /> Chiama</a>}
          <SendEmail clientId={client.id} email={client.email} subject={tpl.data?.subject ?? ""} body={tpl.data?.body ?? ""} configured={emailConfigured()} />
          <EditClient client={client} />
        </div>
      </header>
      {/* PROGRAM + NUMBERS */}
      {cur ? (
        <section className="rise rise-1 grid gap-3 sm:gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <Card className={cx("p-6", cur.status === "scaduto" && "glow")}>
            <div className="flex items-start justify-between">
              <p className="label">Percorso</p>
              <EditProgram program={cur} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-y-5 text-sm">
              <div><p className="text-muted">Tipo</p><p className="mt-1 text-lg tracking-tight">{TYPE_LABEL[cur.type]}</p></div>
              <div><p className="text-muted">Durata</p><p className="mt-1 text-lg tracking-tight">{DURATION_LABEL[cur.duration]}</p></div>
              <div><p className="text-muted">Inizio</p><p className="mt-1">{fmtDate(cur.start_date)}</p></div>
              <div><p className="text-muted">Fine</p><p className="mt-1">{fmtDate(cur.end_date)}</p></div>
            </div>
            <div className="mt-6 flex items-end justify-between border-t hairline pt-5">
              <div>
                <p className={cx("numeral text-[40px]", cur.days_left < 0 ? "text-danger" : cur.status === "in_scadenza" ? "text-warn" : "")}>{Math.abs(cur.days_left)}</p>
                <p className="label mt-1.5 !text-[10px]">{cur.days_left < 0 ? "giorni dalla scadenza" : "giorni rimanenti"}</p>
              </div>
              <NewProgram clientId={client.id} today={today} renewal={cur.status !== "attivo"} />
            </div>
          </Card>
          <Card className="p-6">
            <p className="label">Pagamenti</p>
            <p className="numeral mt-6 text-[44px]">{eur(cur.total_price)}</p>
            <p className="mt-3 text-sm text-muted"><span className="text-fg">{cur.installments_paid}/{cur.installments_count}</span> rate pagate · {eur(cur.paid_total)} incassati</p>
            <div className="mt-5"><Progress value={Number(cur.paid_total)} max={Number(cur.total_price)} tone={cur.installments_overdue ? "red" : "violet"} /></div>
          </Card>
          <Card className="p-6">
            <p className="label">Lezioni</p>
            <p className="numeral mt-6 text-[44px]">{cur.lessons_completed}<span className="text-dim"> / {cur.lessons_total || "—"}</span></p>
            <p className="mt-3 text-sm text-muted">{cur.lessons_total ? `${cur.lessons_remaining} rimanenti` : "Percorso senza lezioni conteggiate"}</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1"><Progress value={cur.lessons_completed} max={cur.lessons_total} /></div>
              <Lessons programId={cur.id} clientId={client.id} />
            </div>
          </Card>
        </section>
      ) : (
        <Card className="rise rise-1 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-muted">Nessun percorso attivo per questo cliente.</p>
          <NewProgram clientId={client.id} today={today} renewal={false} />
        </Card>
      )}
      {/* VISITE */}
      <section id="visite" className="rise rise-2 scroll-mt-24">
        <SectionLabel action={<div className="flex gap-2">
          <ClientLink clientId={client.id} />
          <NewVisit clientId={client.id} today={today} suggested={visitList.some((v) => v.kind === "iniziale") ? "check" : "iniziale"} />
        </div>}>Visite</SectionLabel>
        {visitState && !visitState.open_visit_id && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={VISIT_STATE[visitState.visit_state].tone}>{VISIT_STATE[visitState.visit_state].label}</Badge>
            {visitState.next_due && <>Prossimo check: <span className="text-fg">{fmtDate(visitState.next_due)}</span></>}
          </p>
        )}
        {visitList.length === 0 ? <Empty>Nessuna visita. Crea la visita iniziale per assegnare il Modello visita a questo cliente.</Empty> : (
          <Card className="divide-y divide-line overflow-hidden">
            {visitList.map((v) => {
              const st = VISIT_STATUS[v.status];
              const pr = progress(v.kind, v.answers ?? {});
              const peso = v.answers?.peso?.value;
              return (
                <Link key={v.id} href={`/visite/${v.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[.03] sm:px-5">
                  <div className="w-24 shrink-0">
                    <p className="numeral text-lg">{fmtDate(v.visit_date)}</p>
                    <p className="label !text-[10px]">{VISIT_KIND_LABEL[v.kind]}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Progress value={pr.filled} max={pr.total} tone={v.status === "completata" ? "green" : "violet"} />
                    <p className="mt-1.5 text-xs text-muted">{pr.filled}/{pr.total} risposte{typeof peso === "number" && ` · ${peso} kg`}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
      <div className="grid gap-10 xl:grid-cols-[1.35fr_1fr] xl:gap-8">
        <div className="space-y-10">
          {/* PAYMENT TIMELINE */}
          <section className="rise rise-2">
            <SectionLabel index={1} total={4} action={<AddPayment clientId={client.id} programId={cur?.id} today={today} />}>Timeline pagamenti</SectionLabel>
            {curPayments.length + otherPayments.length === 0 ? <Empty>Nessuna rata registrata.</Empty> : (
              <Card className="p-2 sm:p-3">
                {[...curPayments, ...otherPayments].map((p, i, arr) => {
                  const s = PAYMENT_STATUS[p.status];
                  return (
                    <div key={p.id} className="relative flex items-center gap-4 rounded-2xl px-3 py-3.5">
                      <div className="relative flex flex-col items-center self-stretch">
                        <span className={cx("mt-1.5 size-2.5 rounded-full ring-4 ring-bg", s.tone === "green" ? "bg-ok" : s.tone === "red" ? "bg-danger" : s.tone === "orange" ? "bg-orange shadow-[0_0_10px_rgba(251,146,60,.8)]" : s.tone === "amber" ? "bg-warn" : "bg-dim")} />
                        {i < arr.length - 1 && <span className="absolute top-5 -bottom-5 w-px bg-line-strong" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px]"><span className="numeral text-lg">{eur(p.amount)}</span> <span className="text-muted">· {fmtDate(p.due_date)}</span></p>
                        <p className="mt-0.5 text-[12px] text-muted">
                          {p.paid_date ? `Pagato il ${fmtDate(p.paid_date)}${p.method ? " · " + METHOD_LABEL[p.method] : ""}${p.paid_amount != null && Number(p.paid_amount) !== Number(p.amount) ? " · " + eur(p.paid_amount) : ""}` : p.status === "scaduto" ? `Scaduta da ${daysLabel(-p.days_to_due)}` : `Scade tra ${daysLabel(p.days_to_due)}`}
                        </p>
                      </div>
                      <Badge tone={s.tone} className="hidden sm:inline-flex">{s.label}</Badge>
                      {p.paid_date ? <UndoPay id={p.id} clientId={client.id} /> : <PayButton payment={p} defaultMethod={cur?.payment_method ?? "bonifico"} today={today} />}
                      {!p.paid_date && <DeletePayment id={p.id} clientId={client.id} />}
                    </div>
                  );
                })}
              </Card>
            )}
          </section>
          {/* NOTES */}
          <section className="rise rise-3">
            <SectionLabel index={2} total={4}>Note</SectionLabel>
            <Card className="p-5 text-[15px] leading-relaxed whitespace-pre-wrap text-fg/90">{client.notes || <span className="text-muted">Nessuna nota.</span>}</Card>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
              {client.birth_date && <span className="flex items-center gap-1.5"><Cake size={13} /> {fmtDateLong(client.birth_date)}</span>}
              <span>Cliente dal {fmtDate(client.created_at)}</span>
            </div>
          </section>
        </div>
        <div className="space-y-10">
          {/* APPOINTMENTS */}
          <section className="rise rise-3">
            <SectionLabel index={3} total={4} action={<NewAppointment clientId={client.id} today={today} />}>Prossimi appuntamenti</SectionLabel>
            {(ap.data ?? []).length === 0 ? <Empty>Nessun appuntamento programmato.</Empty> : (
              <Card className="p-2">
                {(ap.data ?? []).map((a: { id: string; client_id: string | null; starts_at: string; ends_at: string; type: string; notes: string | null }) => (
                  <div key={a.id} className="flex items-center gap-4 rounded-2xl px-3 py-3">
                    <p className="numeral w-14 text-lg">{fmtTime(a.starts_at)}</p>
                    <div className="flex-1"><p className="text-sm capitalize">{a.type}</p><p className="text-xs text-muted">{fmtDay(a.starts_at)}</p></div>
                    <EditAppointment a={a} today={today} />
                  </div>
                ))}
              </Card>
            )}
          </section>
          {/* ACTIVITY */}
          <section className="rise rise-4">
            <SectionLabel index={4} total={4}>Attività</SectionLabel>
            {(au.data ?? []).length === 0 ? <Empty>Nessuna attività.</Empty> : (
              <ol className="relative space-y-5 border-l hairline pl-5">
                {((au.data ?? []) as AuditRow[]).map((a) => {
                  const d = describe(a);
                  return (
                    <li key={a.id} className="relative">
                      <span className="absolute top-1.5 -left-[23.5px] size-2 rounded-full bg-accent-2/70 ring-4 ring-bg" />
                      <p className="text-sm">{d.title}</p>
                      {d.changes.slice(0, 3).map((ch) => <p key={ch.field} className="text-[12px] text-muted">{ch.field}: {ch.from} → <span className="text-fg">{ch.to}</span></p>)}
                      <p className="label mt-1 !text-[10px] text-dim">{fmtDateTime(a.created_at)} · {SOURCE[a.source] ?? a.source}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          {(mails.data ?? []).length > 0 && (
            <section>
              <SectionLabel>Email</SectionLabel>
              <Card className="divide-y divide-line">
                {(mails.data ?? []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate">{m.subject || m.type}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[12px] text-muted">{fmtDate(m.created_at)} <Badge tone={m.status === "inviata" ? "green" : m.status === "errore" ? "red" : "muted"}>{m.status.replace("_", " ")}</Badge></span>
                  </div>
                ))}
              </Card>
            </section>
          )}
          {programs.length > 1 && (
            <section>
              <SectionLabel>Percorsi precedenti</SectionLabel>
              <Card className="divide-y divide-line">
                {programs.slice(1).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>{DURATION_LABEL[p.duration]} · {TYPE_LABEL[p.type]}</span>
                    <span className="text-muted">{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
                  </div>
                ))}
              </Card>
            </section>
          )}
          <ClientDanger id={client.id} archived={!!client.archived_at} />
        </div>
      </div>
    </div>
  );
}
