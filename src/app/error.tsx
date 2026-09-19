'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary. A failing page renders this instead of a blank
 * screen or a stack trace, and the rest of the shell stays usable.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
      <div className="panel w-full p-8">
        <p className="eyebrow text-danger">Errore</p>
        <h1 className="mt-2 text-xl font-semibold">Questa pagina non si è caricata</h1>
        <p className="mt-2 text-sm text-secondary">
          Il resto dell&apos;applicazione continua a funzionare. Riprova, oppure torna alla
          dashboard.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted">riferimento: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Riprova
          </button>
          <Link href="/" className="btn">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
