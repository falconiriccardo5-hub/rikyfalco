'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Refreshes the server components on an interval while work is in flight.
 *
 * The pipeline runs asynchronously (inline or on the worker), so a workflow
 * page opened mid-run would otherwise sit on stale data until the user
 * reloaded by hand. Polling stops as soon as `active` goes false.
 */
export function AutoRefresh({
  active,
  intervalMs = 4000,
  label = 'working',
}: {
  active: boolean;
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setTick((value) => value + 1);
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-warning">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
      </span>
      <span>
        {label} · auto-refreshing{tick > 0 ? ` (${tick})` : ''}
      </span>
    </div>
  );
}
