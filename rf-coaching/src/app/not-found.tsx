import Link from "next/link";
export default function NotFound() {
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center text-center">
      <div><p className="numeral text-[96px]">404</p><p className="mt-4 text-muted">Pagina non trovata.</p><Link href="/dashboard" className="mt-6 inline-block text-accent-3">Torna alla dashboard</Link></div>
    </main>
  );
}
