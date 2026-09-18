import Link from 'next/link';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { StatusChip } from '@/components/StatusChip';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { shot: { select: { id: true, workflowId: true, orderIndex: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Generation Jobs</h1>
        <p className="mt-1 text-sm text-muted">
          Every submission to the provider, with its request id — the record that keeps a retry from
          becoming a double charge.
        </p>
      </header>

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {jobs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No generation jobs yet.</td></tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-raised/40">
                <td className="px-4 py-3">
                  <Link href={`/workflows/${job.shot.workflowId}`} className="hover:text-accent">
                    {job.modelId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{job.stage}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{job.requestId ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  ${toNumber(job.actualCost).toFixed(3)}
                </td>
                <td className="px-4 py-3"><StatusChip status={job.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
