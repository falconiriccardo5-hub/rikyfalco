import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
      <div className="panel w-full p-8">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-xl font-semibold">Pagina non trovata</h1>
        <p className="mt-2 text-sm text-secondary">
          Il contenuto che cercavi non esiste o è stato rimosso.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
