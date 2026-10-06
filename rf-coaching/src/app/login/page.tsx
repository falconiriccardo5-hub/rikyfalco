import { LoginForm } from "./form";
import { BrandMark } from "@/components/brand-mark";
export const metadata = { title: "Accesso" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] overflow-hidden"><div className="planet !bottom-[-150%] !w-[220%] sm:!w-[140%]" /></div>
      <div className="rise relative w-full max-w-[380px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandMark size={44} />
          <p className="mt-6 text-[13px] font-semibold tracking-[.28em]">RICCARDO FALCONI</p>
          <p className="label mt-1 !tracking-[.5em] text-accent-2">Coaching</p>
        </div>
        <div className="glass p-6 sm:p-7">
          <h1 className="text-2xl font-medium tracking-tight">Bentornato</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Accedi al tuo spazio di gestione.</p>
          {e === "forbidden" && <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">Questo account non ha accesso all&apos;area admin.</p>}
          <LoginForm />
        </div>
        <p className="label mt-6 text-center !text-[10px] text-dim">Connessione cifrata · accesso protetto</p>
      </div>
    </main>
  );
}
