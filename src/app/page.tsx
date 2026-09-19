import Link from 'next/link';
import { WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { StatusChip } from '@/components/StatusChip';
import { ModeBanner } from '@/components/ModeBanner';

export const dynamic = 'force-dynamic';

const GROUPS: { label: string; statuses: WorkflowStatus[] }[] = [
  { label: 'Draft', statuses: [WorkflowStatus.DRAFT] },
  {
    label: 'Generating',
    statuses: [
      WorkflowStatus.STRATEGY,
      WorkflowStatus.SCRIPT,
      WorkflowStatus.STORYBOARD,
      WorkflowStatus.ROUTING,
      WorkflowStatus.GENERATING,
    ],
  },
  { label: 'QC', statuses: [WorkflowStatus.QC] },
  { label: 'Awaiting approval', statuses: [WorkflowStatus.AWAITING_APPROVAL] },
  { label: 'Scheduled', statuses: [WorkflowStatus.SCHEDULED] },
  { label: 'Published', statuses: [WorkflowStatus.PUBLISHED] },
  { label: 'Failed', statuses: [WorkflowStatus.FAILED] },
];

export default async function DashboardPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { _count: { select: { shots: true } } },
  });

  const counts = new Map<string, number>();
  for (const group of GROUPS) {
    counts.set(group.label, workflows.filter((w) => group.statuses.includes(w.status)).length);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            From brief to approved Reel, one gate before anything goes out.
          </p>
        </div>
        <Link href="/studio/new" className="btn btn-primary">
          + New Reel
        </Link>
      </header>

      <ModeBanner />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {GROUPS.map((group) => (
          <div key={group.label} className="panel p-4">
            <p className="text-2xl font-semibold tabular-nums">{counts.get(group.label) ?? 0}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{group.label}</p>
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-neutral-300">Recent workflows</h2>
        </div>

        {workflows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted">No workflows yet.</p>
            <Link href="/studio/new" className="btn btn-primary mt-4">
              Create the first Reel
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {workflows.map((workflow) => (
              <li key={workflow.id}>
                <Link
                  href={`/workflows/${workflow.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-raised/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {workflow.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">{workflow.brief}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted">
                    {workflow._count.shots} shots
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    ${toNumber(workflow.actualCost).toFixed(2)} / $
                    {toNumber(workflow.maxBudgetUsd).toFixed(2)}
                  </span>
                  <StatusChip status={workflow.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
