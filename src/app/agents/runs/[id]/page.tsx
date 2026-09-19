import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RunStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { agentDefinition } from '@/lib/agents/registry';
import { JsonBlock } from '@/components/JsonBlock';

export const dynamic = 'force-dynamic';

/**
 * Inspector for one agent run: exactly what went in, what came out, how long it
 * took and what it cost. This is the audit trail the pipeline writes for every
 * stage — reviewing an agent means reading its actual IO, not its prompt.
 */
export default async function AgentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: { workflow: { select: { id: true, title: true, brief: true } } },
  });

  if (!run) notFound();

  const definition = agentDefinition(run.agent);
  const durationMs = run.completedAt ? run.completedAt.getTime() - run.startedAt.getTime() : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link href="/agents" className="text-xs text-muted hover:text-neutral-300">
          ← Agents
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {definition?.name ?? run.agent}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Run on{' '}
          <Link href={`/workflows/${run.workflow.id}`} className="text-accent hover:underline">
            {run.workflow.title}
          </Link>
        </p>
      </header>

      <section className="panel p-5">
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Status</dt>
            <dd
              className={`mt-0.5 text-sm ${
                run.status === RunStatus.FAILED
                  ? 'text-red-300'
                  : run.status === RunStatus.SUCCEEDED
                    ? 'text-emerald-300'
                    : 'text-amber-300'
              }`}
            >
              {run.status}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Duration</dt>
            <dd className="mt-0.5 text-sm tabular-nums text-neutral-300">
              {durationMs === null ? 'running' : `${(durationMs / 1000).toFixed(2)}s`}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Cost</dt>
            <dd className="mt-0.5 text-sm tabular-nums text-neutral-300">
              ${toNumber(run.costUsd).toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Model</dt>
            <dd className="mt-0.5 font-mono text-xs text-neutral-300">{run.model ?? '—'}</dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
          Started {run.startedAt.toLocaleString()}
          {run.completedAt ? ` · finished ${run.completedAt.toLocaleString()}` : ''}
        </p>
      </section>

      {run.error && (
        <section className="panel border-red-900/70 p-5">
          <h2 className="text-sm font-medium text-red-300">Error</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-200">{run.error}</p>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="text-sm font-medium text-neutral-300">Input</h2>
        <JsonBlock value={run.input} />
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-medium text-neutral-300">Output</h2>
        {run.output ? (
          <JsonBlock value={run.output} />
        ) : (
          <p className="mt-2 text-sm text-muted">No output recorded.</p>
        )}
      </section>

      {definition && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium text-neutral-300">Guardrails for this agent</h2>
          <ul className="mt-2 space-y-1">
            {definition.guardrails.map((rule) => (
              <li key={rule} className="text-xs text-neutral-400">
                · {rule}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
