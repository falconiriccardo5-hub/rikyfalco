export const metadata = { title: "Offline" };
export default function Offline() {
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 text-center">
      <div><p className="label mb-4">Nessuna connessione</p><h1 className="text-3xl font-medium tracking-tight">Sei offline</h1>
        <p className="mt-3 text-muted">I dati sono sul server: riconnettiti per vederli aggiornati.</p></div>
    </main>
  );
}
