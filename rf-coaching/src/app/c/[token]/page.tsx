import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { supabaseServer } from "@/lib/supabase/server";
import { cx } from "@/components/ui";
import { eur, fmtDate, fmtDateLong, fmtDay, fmtTime, DURATION_LABEL, TYPE_LABEL } from "@/lib/format";

export const metadata = { title: "Area cliente", robots: { index: false } };
export const dynamic = "force-dynamic";

type Area = {
  first_name: string;
  last_name: string;
  program: null | {
    type: string; duration: string; start_date: string; end_date: string; days_left: number;
    lessons_total: number; lessons_completed: number; lessons_remaining: number;
    installments_count: number; installments_paid: number;
  };
  payments: { amount: number; due_date: string; paid_date: string | null; status: string }[];
  appointments: { starts_at: string; ends_at: string; type: string }[];
  last_appointment: string | null;
  open_visit: boolean;
};

/**
 * Area cliente: il percorso visto dal cliente, aperto con il suo link personale.
 * Nessun login — il token nell'indirizzo è la credenziale, e la funzione
 * client_area sul database decide cosa può uscire.
 */
export default async function ClientArea({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const sb = await supabaseServer();
  const area = valid ? (((await sb.rpc("client_area", { p_token: token })).data ?? null) as Area | null) : null;

  if (!area) {
    return (
      <Shell>
        <div className="glass p-7 text-center">
          <h1 className="text-xl font-medium tracking-tight">Link non valido</h1>
          <p className="mt-2 text-sm text-muted">Questo link non è più attivo. Scrivi a Riccardo e te ne manda uno nuovo.</p>
        </div>
      </Shell>
    );
  }

  const p = area.program;
  const next = area.appointments[0] ?? null;
  const open = area.payments.filter((x) => x.status !== "pagato");
  const nextPay = open[0] ?? null;
  const paid = area.payments.filter((x) => x.status === "pagato");
  const lessonPct = p && p.lessons_total > 0 ? Math.round((p.lessons_completed / p.lessons_total) * 100) : null;

  return (
    <Shell>
      <header className="mb-9">
        <p className="label mb-3">Area personale</p>
        <h1 className="text-[32px] leading-tight font-medium tracking-[-0.035em] sm:text-[40px]">
          Ciao {area.first_name}.
        </h1>
        {p && <p className="mt-3 text-[15px] text-muted">Percorso {TYPE_LABEL[p.type]} di {DURATION_LABEL[p.duration]}, fino al {fmtDateLong(p.end_date)}.</p>}
      </header>

      {area.open_visit && (
        <Link href={`/visita/${token}`} className="glass lift mb-5 flex items-center gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-3 ring-1 ring-accent/30"><ClipboardList size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-medium">Hai un modulo da compilare</span>
            <span className="block text-[13px] text-muted">Bastano pochi minuti, puoi salvare e riprendere.</span>
          </span>
          <span className="shrink-0 text-[13px] text-accent-3">Apri</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="glass p-6">
          <p className="label">Prossimo allenamento</p>
          {next ? (
            <>
              <p className="numeral mt-5 text-[34px] capitalize">{fmtDay(next.starts_at)}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[15px] text-muted"><Clock size={14} /> ore {fmtTime(next.starts_at)}</p>
            </>
          ) : (
            <p className="mt-5 text-[15px] text-muted">Nessun appuntamento fissato. Scrivi a Riccardo per il prossimo.</p>
          )}
          {area.last_appointment && <p className="mt-4 border-t hairline pt-4 text-[13px] text-dim">Ultimo: {fmtDay(area.last_appointment)}</p>}
        </section>

        {p && (
          <section className="glass p-6">
            <p className="label">Avanzamento</p>
            <p className="numeral mt-5 text-[34px]">{Math.max(0, p.days_left)}<span className="ml-2 text-[15px] font-normal tracking-normal text-muted">giorni rimanenti</span></p>
            {lessonPct !== null && (
              <>
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-3 shadow-[0_0_12px_rgba(167,139,250,.7)]" style={{ width: `${lessonPct}%` }} />
                </div>
                <p className="mt-3 text-[13px] text-muted">{p.lessons_completed} di {p.lessons_total} lezioni · {p.lessons_remaining} da fare</p>
              </>
            )}
          </section>
        )}
      </div>

      {area.appointments.length > 1 && (
        <section className="glass mt-4 divide-y divide-line overflow-hidden">
          <p className="label px-5 pt-5 pb-3">Prossime date</p>
          {area.appointments.slice(1).map((a) => (
            <div key={a.starts_at} className="flex items-center gap-4 px-5 py-3.5">
              <CalendarClock size={16} className="shrink-0 text-dim" />
              <span className="flex-1 text-[15px] capitalize">{fmtDay(a.starts_at)}</span>
              <span className="text-[14px] text-muted">{fmtTime(a.starts_at)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="mt-9">
        <p className="label mb-4">Pagamenti</p>
        {nextPay && (
          <div className={cx("mb-3 flex items-center justify-between gap-3 rounded-2xl border px-5 py-4",
            nextPay.status === "scaduto" ? "border-danger/25 bg-danger/[.07] text-danger" : "border-orange/25 bg-orange/[.07] text-orange")}>
            <span className="text-[15px]">{nextPay.status === "scaduto" ? "Rata scaduta" : "Prossima rata"}</span>
            <span className="text-[15px]"><span className="numeral text-[18px]">{eur(nextPay.amount)}</span> · {fmtDate(nextPay.due_date)}</span>
          </div>
        )}
        {paid.length > 0 ? (
          <div className="glass divide-y divide-line overflow-hidden">
            {paid.map((x) => (
              <div key={x.due_date + x.amount} className="flex items-center gap-4 px-5 py-3.5">
                <CheckCircle2 size={16} className="shrink-0 text-ok" />
                <span className="flex-1 text-[15px]">{eur(x.amount)}</span>
                <span className="text-[13px] text-muted">pagata il {fmtDate(x.paid_date)}</span>
              </div>
            ))}
          </div>
        ) : (
          !nextPay && <p className="rounded-2xl border border-dashed border-line px-4 py-7 text-center text-sm text-muted">Nessun pagamento registrato.</p>
        )}
      </section>

      <p className="mt-10 text-center text-[13px] text-dim">
        Questa pagina è solo tua: non condividere il link.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 min-h-dvh overflow-hidden px-4 pt-10 pb-16 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] overflow-hidden opacity-70"><div className="planet !bottom-[-150%] !w-[220%] sm:!w-[140%]" /></div>
      <div className="rise relative mx-auto w-full max-w-[720px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandMark size={40} />
          <p className="mt-5 text-[13px] font-semibold tracking-[.28em]">RICCARDO FALCONI</p>
          <p className="label mt-1 !tracking-[.5em] text-accent-2">Coaching</p>
        </div>
        {children}
      </div>
    </main>
  );
}
