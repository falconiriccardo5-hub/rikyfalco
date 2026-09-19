import Link from 'next/link';
import { describeDrivers, fullyOffline } from '@/lib/drivers';

/**
 * States plainly whether this instance can reach an external service. A user
 * looking at generated shots must be able to tell simulated from real at a
 * glance, without reading env files.
 */
export function ModeBanner() {
  const offline = fullyOffline();
  const live = describeDrivers().filter((driver) => driver.live);

  return (
    <div
      className={`panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs ${
        offline ? 'border-positive/40/50' : 'border-warning/40'
      }`}
    >
      <span
        className={`chip ${
          offline
            ? 'border-positive/40 bg-positive/10 text-positive'
            : 'border-warning/40 bg-warning/10 text-warning'
        }`}
      >
        {offline ? 'local mode' : 'live services'}
      </span>
      <span className="min-w-0 flex-1 text-muted">
        {offline
          ? 'Agents, generation, storage and QC all run locally. Shots are simulated placeholders and nothing is spent.'
          : `Connected to: ${live.map((driver) => driver.label.toLowerCase()).join(', ')}. Runs may cost money.`}
      </span>
      <Link href="/agents" className="shrink-0 text-accent hover:underline">
        agents →
      </Link>
    </div>
  );
}
