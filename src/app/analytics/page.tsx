import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [workflows, jobs, costEvents, published] = await Promise.all([
    prisma.workflow.count(),
    prisma.generationJob.count(),
    prisma.costEvent.findMany({ select: { amountUsd: true, estimated: true, category: true } }),
    prisma.contentItem.count({ where: { status: 'PUBLISHED' } }),
  ]);

  const spent = costEvents
    .filter((e) => !e.estimated)
    .reduce((sum, e) => sum + toNumber(e.amountUsd), 0);

  const byCategory = new Map<string, number>();
  for (const event of costEvents.filter((e) => !e.estimated)) {
    byCategory.set(event.category, (byCategory.get(event.category) ?? 0) + toNumber(event.amountUsd));
  }

  const tiles = [
    { label: 'Workflows', value: String(workflows) },
    { label: 'Generations', value: String(jobs) },
    { label: 'Total spend', value: `$${spent.toFixed(2)}` },
    { label: 'Published', value: String(published) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Production and cost analytics. Instagram performance analytics arrive with the publisher
          in Phase 2.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel p-4">
            <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{tile.label}</p>
          </div>
        ))}
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-medium text-neutral-300">Spend by category</h2>
        <dl className="mt-3 space-y-2">
          {byCategory.size === 0 && <p className="text-sm text-muted">No spend recorded yet.</p>}
          {[...byCategory.entries()].map(([category, amount]) => (
            <div key={category} className="flex items-center justify-between text-sm">
              <dt className="text-muted">{category}</dt>
              <dd className="tabular-nums">${amount.toFixed(3)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
