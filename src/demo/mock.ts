// Backend finto per l'anteprima pubblica: legge i dati di esempio e non salva nulla.
import fixtures from './fixtures.json';

const fx = fixtures as Record<string, unknown>;

export function demoGet(path: string): unknown {
  if (path in fx) return structuredClone(fx[path]);
  const [base, query = ''] = path.split('?');
  const q = new URLSearchParams(query);
  if (base === '/search') {
    const s = (q.get('q') || '').toLowerCase();
    const clients = (fx['/clients'] as { first_name: string; last_name: string; email: string }[])
      .filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(s));
    return { clients, leads: [] };
  }
  if (base === '/sessions') return { sessions: [], google: { connected: false } };
  if (base === '/report') return structuredClone(fx['/report?month=2026-01']);
  throw new Error('Non disponibile nell\'anteprima');
}

export const DEMO_READONLY = 'Anteprima: le modifiche non vengono salvate. Nell\'app vera questa azione funziona.';
