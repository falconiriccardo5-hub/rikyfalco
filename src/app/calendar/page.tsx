import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatusChip } from '@/components/StatusChip';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const scheduled = await prisma.workflow.findMany({
    where: { publishAt: { not: null } },
    orderBy: { publishAt: 'asc' },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted">
          Publish dates on record. The scheduling worker that acts on them is Phase 2.
        </p>
      </header>

      <ul className="panel divide-y divide-line">
        {scheduled.length === 0 && <li className="p-5 text-sm text-muted">Nothing scheduled.</li>}
        {scheduled.map((workflow) => (
          <li key={workflow.id}>
            <Link href={`/workflows/${workflow.id}`} className="flex items-center gap-4 p-4 hover:bg-raised/60">
              <span className="w-40 shrink-0 font-mono text-xs text-accent">
                {workflow.publishAt?.toLocaleString()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{workflow.title}</span>
              <StatusChip status={workflow.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
