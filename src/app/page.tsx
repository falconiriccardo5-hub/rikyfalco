import Link from 'next/link';
import { RunStatus, ShotStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { fullyOffline } from '@/lib/drivers';
import { StatusChip } from '@/components/StatusChip';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Icons } from '@/components/Icons';
import { BarSeries, Meter, RadialGauge, Sparkline } from '@/components/Viz';

export const dynamic = 'force-dynamic';

const IN_FLIGHT: WorkflowStatus[] = [
  WorkflowStatus.STRATEGY,
  WorkflowStatus.SCRIPT,
  WorkflowStatus.STORYBOARD,
  WorkflowStatus.ROUTING,
  WorkflowStatus.GENERATING,
  WorkflowStatus.QC,
];

const GROUPS: { label: string; statuses: WorkflowStatus[]; tone: string }[] = [
  { label: 'Draft', statuses: [WorkflowStatus.DRAFT], tone: 'text-secondary' },
  { label: 'In pipeline', statuses: IN_FLIGHT, tone: 'text-warning' },
  {
    label: 'Attesa approvazione',
    statuses: [WorkflowStatus.AWAITING_APPROVAL],
    tone: 'text-accent',
  },
  {
    label: 'Approvati',
    statuses: [WorkflowStatus.APPROVED, WorkflowStatus.SCHEDULED],
    tone: 'text-positive',
  },
  { label: 'Pubblicati', statuses: [WorkflowStatus.PUBLISHED], tone: 'text-positive' },
  {
    label: 'Falliti',
    statuses: [WorkflowStatus.FAILED, WorkflowStatus.REJECTED],
    tone: 'text-danger',
  },
];

function greeting(hour: number): string {
  if (hour < 6) return 'Buonanotte';
  if (hour < 13) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default async function DashboardPage() {
  const [workflows, shots, runs, costEvents] = await Promise.all([
    prisma.workflow.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: { _count: { select: { shots: true } } },
    }),
    prisma.shot.findMany({ select: { status: true, qcScore: true } }),
    prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 80,
      select: { status: true, startedAt: true },
    }),
    prisma.costEvent.findMany({ where: { estimated: false }, select: { amountUsd: true } }),
  ]);

  const working = workflows.some((workflow) => IN_FLIGHT.includes(workflow.status));
  const now = new Date();

  const qcScores = shots
    .map((shot) => shot.qcScore)
    .filter((score): score is number => score !== null);
  const avgQc = qcScores.length ? qcScores.reduce((a, b) => a + b, 0) / qcScores.length : 0;
  const passed = shots.filter((shot) => shot.status === ShotStatus.QC_PASSED).length;

  const spend = costEvents.reduce((sum, event) => sum + toNumber(event.amountUsd), 0);
  const budget = workflows.reduce((sum, workflow) => sum + toNumber(workflow.maxBudgetUsd), 0);

  // Agent runs over the last 7 days — real activity, never decorative filler.
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return {
      label: day.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3),
      value: runs.filter((run) => run.startedAt >= day && run.startedAt < next).length,
      highlight: index === 6,
    };
  });

  const trend = workflows
    .slice(0, 12)
    .reverse()
    .map((workflow) => toNumber(workflow.actualCost));

  const failedRuns = runs.filter((run) => run.status === RunStatus.FAILED).length;
  const awaiting = workflows.filter((w) => w.status === WorkflowStatus.AWAITING_APPROVAL);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Riccardo AI Content Orchestrator</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting(now.getHours())}, Riccardo
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh active={working} label="pipeline attiva" />
          <Link href="/studio/new" className="btn btn-primary">
            <Icons.plus className="h-4 w-4" />
            Nuovo Reel
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="panel animate-fade-up p-5 lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Dal brief al Reel approvato</h2>
              <p className="mt-1 max-w-xl text-sm text-secondary">
                Cinque agenti portano un brief fino al gate di approvazione. Niente viene pubblicato
                senza il tuo sì.
              </p>
            </div>
            <span
              className={`chip ${
                fullyOffline()
                  ? 'border-positive/40 bg-positive/10 text-positive'
                  : 'border-warning/40 bg-warning/10 text-warning'
              }`}
            >
              {fullyOffline() ? 'modalità locale' : 'servizi live'}
            </span>
          </div>

          {trend.length > 1 && (
            <div className="mt-5">
              <Sparkline
                points={trend}
                ariaLabel={`Costo dei workflow recenti, da $${Math.min(...trend).toFixed(2)} a $${Math.max(...trend).toFixed(2)}`}
              />
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
            <div>
              <dt className="eyebrow">Workflow</dt>
              <dd className="metric mt-1 text-metric">{workflows.length}</dd>
            </div>
            <div>
              <dt className="eyebrow">Shot</dt>
              <dd className="metric mt-1 text-metric">{shots.length}</dd>
            </div>
            <div>
              <dt className="eyebrow">Spesa</dt>
              <dd className="metric mt-1 text-metric">${spend.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Run agenti</dt>
              <dd className="metric mt-1 text-metric">{runs.length}</dd>
            </div>
          </dl>
        </section>

        <section className="panel animate-fade-up p-5 lg:col-span-4">
          <h2 className="text-sm font-medium text-secondary">Qualità media</h2>
          <div className="mt-3 flex justify-center">
            <RadialGauge
              value={avgQc}
              label="QC score"
              tone={avgQc >= 0.85 ? 'positive' : avgQc >= 0.7 ? 'accent' : 'warning'}
            />
          </div>
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <Meter
              value={passed}
              max={Math.max(1, shots.length)}
              label="Shot approvati dal QC"
              formatted={`${passed}/${shots.length}`}
              tone="positive"
            />
            <Meter
              value={spend}
              max={Math.max(spend, budget, 1)}
              label="Budget consumato"
              formatted={`$${spend.toFixed(2)} / $${budget.toFixed(2)}`}
              tone={budget > 0 && spend / budget > 0.8 ? 'warning' : 'accent'}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-6">
          {GROUPS.map((group) => {
            const count = workflows.filter((workflow) =>
              group.statuses.includes(workflow.status),
            ).length;
            return (
              <div key={group.label} className="panel-flat p-4">
                <p className={`metric text-metric ${count > 0 ? group.tone : 'text-muted'}`}>
                  {count}
                </p>
                <p className="mt-1 text-[11px] uppercase leading-tight tracking-wider text-muted">
                  {group.label}
                </p>
              </div>
            );
          })}
        </section>

        <section className="panel animate-fade-up p-5 lg:col-span-4 lg:row-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-secondary">Attività agenti</h2>
            <Link href="/agents" className="text-xs text-accent hover:underline">
              dettaglio
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted">Run degli ultimi 7 giorni</p>
          <div className="mt-4">
            <BarSeries
              bars={days}
              ariaLabel={`Run per giorno: ${days.map((d) => `${d.label} ${d.value}`).join(', ')}`}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs">
            {failedRuns === 0 ? (
              <>
                <Icons.check className="h-4 w-4 text-positive" />
                <span className="text-secondary">Nessuna run fallita</span>
              </>
            ) : (
              <>
                <Icons.alert className="h-4 w-4 text-danger" />
                <span className="text-secondary">
                  {failedRuns} run fallite su {runs.length}
                </span>
              </>
            )}
          </div>
        </section>

        <section className="panel animate-fade-up overflow-hidden lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-medium text-secondary">Workflow recenti</h2>
            {awaiting.length > 0 && (
              <span className="chip border-accent/40 bg-accent/10 text-accent">
                {awaiting.length} in attesa di approvazione
              </span>
            )}
          </div>

          {workflows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-secondary">Nessun workflow: parti da un brief.</p>
              <Link href="/studio/new" className="btn btn-primary mt-4">
                <Icons.plus className="h-4 w-4" />
                Crea il primo Reel
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {workflows.slice(0, 7).map((workflow) => (
                <li key={workflow.id}>
                  <Link
                    href={`/workflows/${workflow.id}`}
                    className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors duration-200 hover:bg-raised/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">{workflow.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{workflow.brief}</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted">
                      {workflow._count.shots} shot
                    </span>
                    <span className="text-xs tabular-nums text-secondary">
                      ${toNumber(workflow.actualCost).toFixed(2)}
                    </span>
                    <StatusChip status={workflow.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
