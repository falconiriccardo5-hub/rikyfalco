import { BrandMark } from "@/components/brand-mark";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDateLong } from "@/lib/format";
import { clientVisit } from "@/server/visits";
import { ClientVisitForm } from "./form";

export const metadata = { title: "Modulo visita", robots: { index: false } };
export const dynamic = "force-dynamic";

// Link personale del cliente: mostra solo il modulo aperto e solo le sezioni che compila il cliente.
export default async function ClientVisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = /^[A-Za-z0-9_-]{20,100}$/.test(token) ? await clientVisit(await supabaseServer(), token).catch(() => null) : null;
  return (
    <main className="relative z-10 min-h-dvh overflow-hidden px-4 pt-10 pb-16 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] overflow-hidden opacity-70"><div className="planet !bottom-[-150%] !w-[220%] sm:!w-[140%]" /></div>
      <div className="rise relative mx-auto w-full max-w-[720px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandMark size={40} />
          <p className="mt-5 text-[13px] font-semibold tracking-[.28em]">RICCARDO FALCONI</p>
          <p className="label mt-1 !tracking-[.5em] text-accent-2">Coaching</p>
        </div>
        {visit ? (
          <>
            <header className="mb-8">
              <p className="label mb-3">{fmtDateLong(visit.visit_date)}</p>
              <h1 className="text-[30px] leading-tight font-medium tracking-[-0.03em] sm:text-[38px]">{visit.title}</h1>
              <p className="mt-3 text-sm text-muted">
                Rispondi con calma: puoi salvare e riprendere quando vuoi. Quando hai finito premi <span className="text-fg">Invia a Riccardo</span>.
              </p>
            </header>
            <ClientVisitForm token={token} visitId={visit.id} sections={visit.sections} initial={visit.answers} />
          </>
        ) : (
          <div className="glass p-7 text-center">
            <h1 className="text-xl font-medium tracking-tight">Nessun modulo da compilare</h1>
            <p className="mt-2 text-sm text-muted">Hai già inviato il modulo oppure il link non è più valido. Per qualsiasi dubbio scrivi a Riccardo.</p>
          </div>
        )}
      </div>
    </main>
  );
}
