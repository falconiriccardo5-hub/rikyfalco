import { useNavigate } from 'react-router-dom';
import { CalendarClock, CalendarDays } from 'lucide-react';
import type { ClientSummary } from '../lib/api';
import { dayMonth, euro, initials, MODE_LABEL, relDays, shortDay, time } from '../lib/format';
import { SpotCard } from './ui';

export function Segments({ total, current }: { total: number; current: number }) {
  return (
    <div className="segments" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i + 1 < current ? 'on' : i + 1 === current ? 'now' : ''} />)}
    </div>
  );
}

export function PayBanner({ c }: { c: ClientSummary }) {
  if (c.overdue_count > 0) {
    return <div className="pay-banner ko"><span>Da saldare</span><span>{euro(c.overdue_cents)} · scaduta da {c.oldest_overdue_days} gg</span></div>;
  }
  if (c.payments_total === 0) return <div className="pay-banner na"><span>Nessun piano rate</span></div>;
  return (
    <div className="pay-banner ok">
      <span>Pagato</span>
      <span>{c.next_due ? `prossima ${euro(c.next_due.amount_cents)} il ${dayMonth(c.next_due.due_date)}` : 'percorso saldato'}</span>
    </div>
  );
}

export default function ClientCard({ c, delay = 0 }: { c: ClientSummary; delay?: number }) {
  const nav = useNavigate();
  return (
    <SpotCard className="client-card hover fade-in" onClick={() => nav(`/clients/${c.id}`)} style={{ cursor: 'pointer', animationDelay: `${delay}ms` }}>
      <div className="head">
        <div className="avatar">{initials(c.first_name, c.last_name)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="name truncate">{c.name}</div>
          <div className="muted">{MODE_LABEL[c.mode]} · {c.program_months} mesi</div>
        </div>
      </div>
      <div className="progress-head">
        <span>Mese</span>
        <span><b>{c.month}</b> <span className="dim">/ {c.program_months}</span> <span className="dim" style={{ fontSize: 14 }}>· {c.lessons_done} lez.</span></span>
      </div>
      <Segments total={c.program_months} current={c.month} />
      <div className="mini-grid">
        <div className="mini">
          <div className="k"><CalendarDays /> Ultima</div>
          <div className="v">{c.last_session ? relDays(c.last_session.starts_at) : '—'}</div>
          <div className="s">{c.last_session ? shortDay(c.last_session.starts_at) : 'nessuna lezione'}</div>
        </div>
        <div className="mini">
          <div className="k"><CalendarClock /> Prossima</div>
          <div className="v">{c.next_session ? shortDay(c.next_session.starts_at) : '—'}</div>
          <div className="s">{c.next_session ? `ore ${time(c.next_session.starts_at)}` : 'da programmare'}</div>
        </div>
      </div>
      <PayBanner c={c} />
    </SpotCard>
  );
}
