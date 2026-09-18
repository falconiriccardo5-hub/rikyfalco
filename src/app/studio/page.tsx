import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatusChip } from '@/components/StatusChip';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { brandProfile: { select: { brandName: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
          <p className="mt-1 text-sm text-muted">Every Reel in production.</p>
        </div>
        <Link href="/studio/new" className="btn btn-primary">+ New Reel</Link>
      </header>

      <ul className="panel divide-y divide-line">
        {workflows.length === 0 && <li className="p-5 text-sm text-muted">Nothing here yet.</li>}
        {workflows.map((workflow) => (
          <li key={workflow.id}>
            <Link href={`/workflows/${workflow.id}`} className="flex items-center gap-3 p-4 hover:bg-raised/60">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{workflow.title}</p>
                <p className="text-xs text-muted">
                  {workflow.brandProfile.brandName} · {workflow.durationSec}s · {workflow.aspectRatio}
                </p>
              </div>
              <StatusChip status={workflow.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
