import Link from 'next/link';
import { RunStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { describeDrivers, drivers, fullyOffline } from '@/lib/drivers';

export const dynamic = 'force-dynamic';

function driverFor(agentDriver: 'agents' | 'router' | 'qc') {
  const d = drivers();
  if (agentDriver === 'router') return { value: 'deterministic', live: false };
  if (agentDriver === 'qc') return { value: d.qc, live: d.qc === 'ffmpeg' };
  return { value: d.agents, live: d.agents === 'openai' };
}

export default async function AgentsPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 200,
    include: { workflow: { select: { id: true, title: true } } },
  });

  const stats = new Map(
    AGENT_REGISTRY.map((agent) => {
      const mine = runs.filter((run) => run.agent === agent.kind);
      const done = mine.filter((r) => r.completedAt);
      const avgMs =
        done.length === 0
          ? null
          : done.reduce(
              (sum, r) => sum + (r.completedAt!.getTime() - r.startedAt.getTime()),
              0,
            ) / done.length;

      return [
        agent.kind,
        {
          total: mine.length,
          failed: mine.filter((r) => r.status === RunStatus.FAILED).length,
          cost: mine.reduce((sum, r) => sum + toNumber(r.costUsd), 0),
          avgMs,
          lastModel: mine.find((r) => r.model)?.model ?? null,
        },
      ];
    }),
  );

  const offline = fullyOffline();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted">
          The five agents that carry a brief to an approvable Reel, with the contract each one
          honours and how it is currently running.
        </p>
      </header>

      <section className={`panel p-5 ${offline ? 'border-emerald-900/60' : 'border-amber-900/60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-300">Runtime mode</h2>
          <span
            className={`chip ${
              offline
                ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
                : 'border-amber-900 bg-amber-950/50 text-amber-300'
            }`}
          >
            {offline ? 'fully offline' : 'live services enabled'}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {offline
            ? 'Nothing in this process contacts a third-party service. Every driver below runs locally.'
            : 'At least one driver reaches an external service. Check the list before running a workflow.'}
        </p>
        <ul className="mt-4 divide-y divide-line">
          {describeDrivers().map((driver) => (
            <li key={driver.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className="w-32 shrink-0 text-sm text-neutral-300">{driver.label}</span>
              <span
                className={`chip ${
                  driver.live
                    ? 'border-amber-900 bg-amber-950/40 text-amber-300'
                    : 'border-line bg-raised text-neutral-400'
                }`}
              >
                {driver.value}
              </span>
              <span className="min-w-0 flex-1 text-xs text-muted">{driver.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        {AGENT_REGISTRY.map((agent) => {
          const stat = stats.get(agent.kind)!;
          const driver = driverFor(agent.driver);

          return (
            <article key={agent.kind} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-accent">
                      {String(agent.order).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-medium">{agent.name}</h3>
                    {agent.deterministic && (
                      <span className="chip border-line bg-raised text-neutral-400">
                        deterministic
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">{agent.role}</p>
                </div>
                <span
                  className={`chip ${
                    driver.live
                      ? 'border-amber-900 bg-amber-950/40 text-amber-300'
                      : 'border-line bg-raised text-neutral-400'
                  }`}
                >
                  {driver.value}
                </span>
              </div>

              <p className="mt-3 text-sm text-neutral-400">{agent.responsibility}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">Inputs</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {agent.inputs.map((input) => (
                      <li key={input} className="chip border-line bg-raised/60 text-neutral-400">
                        {input}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">Output contract</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {agent.outputKeys.map((key) => (
                      <li key={key} className="chip border-line bg-raised/60 font-mono text-accent">
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted">Guardrails</p>
                <ul className="mt-1.5 space-y-1">
                  {agent.guardrails.map((rule) => (
                    <li key={rule} className="text-xs text-neutral-400">
                      · {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-xs">
                <div>
                  <dt className="text-muted">Runs</dt>
                  <dd className="tabular-nums text-neutral-300">{stat.total}</dd>
                </div>
                <div>
                  <dt className="text-muted">Failed</dt>
                  <dd className={`tabular-nums ${stat.failed ? 'text-red-300' : 'text-neutral-300'}`}>
                    {stat.failed}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Avg duration</dt>
                  <dd className="tabular-nums text-neutral-300">
                    {stat.avgMs === null ? '—' : `${(stat.avgMs / 1000).toFixed(2)}s`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Spend</dt>
                  <dd className="tabular-nums text-neutral-300">${stat.cost.toFixed(3)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Last model</dt>
                  <dd className="font-mono text-neutral-300">{stat.lastModel ?? '—'}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-neutral-300">Recent agent runs</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No runs yet. Create a Reel in the{' '}
            <Link href="/studio/new" className="text-accent hover:underline">
              Content Studio
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {runs.slice(0, 25).map((run) => (
              <li key={run.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="w-36 shrink-0 font-mono text-xs text-neutral-300">
                  {run.agent}
                </span>
                <Link
                  href={`/workflows/${run.workflow.id}`}
                  className="min-w-0 flex-1 truncate text-muted hover:text-accent"
                >
                  {run.workflow.title}
                </Link>
                <span className="text-xs tabular-nums text-muted">
                  {run.completedAt
                    ? `${((run.completedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(2)}s`
                    : 'running'}
                </span>
                <span
                  className={`chip ${
                    run.status === RunStatus.FAILED
                      ? 'border-red-900 bg-red-950/50 text-red-300'
                      : run.status === RunStatus.SUCCEEDED
                        ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300'
                        : 'border-amber-900 bg-amber-950/40 text-amber-300'
                  }`}
                >
                  {run.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
