'use client';

/** Last-resort boundary: catches failures in the root layout itself. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#05060B',
          color: '#F2F5FC',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Applicazione non disponibile</h1>
          <p style={{ color: '#8A93AC', fontSize: 14, marginTop: 12 }}>
            Si è verificato un errore critico. Riprova fra poco.
          </p>
          {error.digest && (
            <p style={{ color: '#8A93AC', fontSize: 11, fontFamily: 'monospace', marginTop: 12 }}>
              riferimento: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 12,
              border: 0,
              background: '#4C8DFF',
              color: '#04060F',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
