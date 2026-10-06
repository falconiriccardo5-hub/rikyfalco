import { useNavigate } from 'react-router-dom';
import { CalendarClock, CalendarDays, Wallet } from 'lucide-react';
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

export function LessonsBar({ done, target }: { done: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  return (
    <div className="lessons-bar" role="progressbar" aria-valuemin={0} aria-valuemax={target || undefined} aria-valuenow={done}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

function PayLine({ c }: { c: ClientSummary }) {
  const last = c.last_payment;
  const state = c.overdue_count > 0
    ? <span className="pay-state ko">Da saldare {euro(c.overdue_cents)}</span>
    : c.payments_total === 0 ? <span className="pay-state na">Nessun piano</span>
    : <span className="pay-state ok">In regola</span>;
  return (
    <div className="pay-line">
      <div className="k"><Wallet /> Ultimo pagamento</div>
      <div className="pay-row">
        <span className="v">{last ? <>{euro(last.amount_cents)} <span className="dim">· {dayMonth(last.paid_at)}</span></> : <span className="dim">nessuno</span>}</span>
        {state}
      </div>
    </div>
  );
}

export default function ClientCard({ c, delay = 0 }: { c: ClientSummary; delay?: number }) {
  const nav = useNavigate();
  return (
    <SpotCard className="client-card hover fade-in" onClick={() => nav(`/clients/${c.id}`)} style={{ cursor: 'pointer', animationDelay: `${delay}ms` }}>
      <div className="head">
        <div className="avatar sm">{initials(c.first_name, c.last_name)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="name truncate">{c.name}</div>
          <div className="muted">{MODE_LABEL[c.mode]} · {c.program_months} mesi</div>
        </div>
      </div>
      <div className="progress-head">
        <span>Lezioni</span>
        <span><b>{c.lessons_done}</b> <span className="dim">/ {c.lessons_target > 0 ? c.lessons_target : '–'}</span></span>
      </div>
      <LessonsBar done={c.lessons_done} target={c.lessons_target} />
      <div className="mini-grid">
        <div className="mini">
          <div className="k"><CalendarDays /> Ultima</div>
          <div className="v">{c.last_session ? shortDay(c.last_session.starts_at) : '—'}</div>
          <div className="s">{c.last_session ? relDays(c.last_session.starts_at) : 'nessuna lezione'}</div>
        </div>
        <div className="mini">
          <div className="k"><CalendarClock /> Prossima</div>
          <div className="v">{c.next_session ? shortDay(c.next_session.starts_at) : '—'}</div>
          <div className="s">{c.next_session ? `ore ${time(c.next_session.starts_at)}` : 'da programmare'}</div>
        </div>
      </div>
      <PayLine c={c} />
    </SpotCard>
  );
}
