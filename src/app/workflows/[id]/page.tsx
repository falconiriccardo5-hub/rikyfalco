import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShotStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { signedUrl } from '@/lib/storage/s3';
import { StatusChip } from '@/components/StatusChip';
import { ApprovalGate } from './ApprovalGate';
import { PipelineGraph, type PipelineNode } from './PipelineGraph';

export const dynamic = 'force-dynamic';

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      brandProfile: true,
      agentRuns: { orderBy: { startedAt: 'asc' } },
      approvals: { orderBy: { createdAt: 'desc' } },
      shots: {
        orderBy: { orderIndex: 'asc' },
        include: { assets: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
  });

  if (!workflow) notFound();

  const strategy = workflow.strategy as Record<string, string> | null;
  const runByAgent = new Map(workflow.agentRuns.map((run) => [run.agent, run]));

  const stageState = (agent: string): PipelineNode['state'] => {
    const run = runByAgent.get(agent as never);
    if (!run) return 'pending';
    if (run.status === 'SUCCEEDED') return 'done';
    if (run.status === 'FAILED') return 'failed';
    return 'running';
  };

  const nodes: PipelineNode[] = [
    { key: 'brief', label: 'BRIEF', state: 'done', href: '#brief' },
    { key: 'strategy', label: 'STRATEGY', state: stageState('STRATEGIST'), href: '#strategy' },
    { key: 'script', label: 'SCRIPT', state: stageState('SCRIPTWRITER'), href: '#script' },
    { key: 'storyboard', label: 'STORYBOARD', state: stageState('DIRECTOR'), href: '#shots' },
    ...workflow.shots.map((shot, index) => ({
      key: `shot-${shot.id}`,
      label: `SHOT ${String(index + 1).padStart(2, '0')}`,
      state:
        shot.status === ShotStatus.QC_PASSED
          ? ('done' as const)
          : shot.status === ShotStatus.QC_FAILED || shot.status === ShotStatus.FAILED
            ? ('failed' as const)
            : shot.status === ShotStatus.PENDING || shot.status === ShotStatus.ROUTED
              ? ('pending' as const)
              : ('running' as const),
      href: `#shot-${shot.id}`,
    })),
    {
      key: 'qc',
      label: 'QC',
      state:
        workflow.shots.length > 0 && workflow.shots.every((s) => s.status === ShotStatus.QC_PASSED)
          ? 'done'
          : workflow.shots.some((s) => s.status === ShotStatus.QC_FAILED)
            ? 'failed'
            : 'pending',
      href: '#shots',
    },
    {
      key: 'approval',
      label: 'APPROVAL',
      state:
        workflow.status === WorkflowStatus.APPROVED ||
        workflow.status === WorkflowStatus.SCHEDULED ||
        workflow.status === WorkflowStatus.PUBLISHED
          ? 'done'
          : workflow.status === WorkflowStatus.REJECTED
            ? 'failed'
            : workflow.status === WorkflowStatus.AWAITING_APPROVAL
              ? 'running'
              : 'pending',
      href: '#approval',
    },
    {
      key: 'publish',
      label: 'PUBLISH',
      state: workflow.status === WorkflowStatus.PUBLISHED ? 'done' : 'pending',
      href: '#approval',
    },
  ];

  const shotsWithUrls = await Promise.all(
    workflow.shots.map(async (shot) => {
      const asset = shot.assets[0];
      let url: string | null = null;
      if (asset) {
        try {
          url = await signedUrl(asset.storageKey);
        } catch {
          url = null; // Storage not configured or object missing — the page still renders.
        }
      }
      return { shot, url };
    }),
  );

  const script = workflow.script as { scenes?: { scene: number; voiceover: string; on_screen_text: string }[] } | null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="text-xs text-muted hover:text-neutral-300">
            ← Dashboard
          </Link>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{workflow.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {workflow.durationSec}s · {workflow.aspectRatio} · {workflow.brandProfile.brandName}
          </p>
        </div>
        <div className="text-right">
          <StatusChip status={workflow.status} />
          <p className="mt-2 text-xs tabular-nums text-muted">
            ${toNumber(workflow.actualCost).toFixed(2)} spent · est. $
            {toNumber(workflow.estimatedCost).toFixed(2)} · budget $
            {toNumber(workflow.maxBudgetUsd).toFixed(2)}
          </p>
        </div>
      </header>

      {workflow.errorCode && (
        <div className="panel border-red-900/70 p-4">
          <p className="chip border-red-900 bg-red-950/60 text-red-300">{workflow.errorCode}</p>
          <p className="mt-2 text-sm text-red-200">{workflow.errorMessage}</p>
        </div>
      )}

      <PipelineGraph nodes={nodes} />

      <section id="brief" className="panel p-5">
        <h2 className="text-sm font-medium text-neutral-300">Brief</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">{workflow.brief}</p>
      </section>

      {strategy && (
        <section id="strategy" className="panel p-5">
          <h2 className="text-sm font-medium text-neutral-300">Strategy</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {Object.entries(strategy).map(([key, value]) => (
              <div key={key}>
                <dt className="text-[11px] uppercase tracking-wider text-muted">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="mt-0.5 text-sm text-neutral-300">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {script?.scenes && (
        <section id="script" className="panel p-5">
          <h2 className="text-sm font-medium text-neutral-300">Script</h2>
          <ol className="mt-3 space-y-3">
            {script.scenes.map((scene) => (
              <li key={scene.scene} className="border-l-2 border-line pl-3">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Scene {scene.scene}
                </p>
                <p className="mt-0.5 text-sm text-neutral-300">{scene.voiceover}</p>
                {scene.on_screen_text && (
                  <p className="mt-1 text-xs text-accent">“{scene.on_screen_text}”</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section id="shots" className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-300">Shots</h2>
        {shotsWithUrls.length === 0 && (
          <p className="panel p-5 text-sm text-muted">No shots yet — run the pipeline.</p>
        )}
        {shotsWithUrls.map(({ shot, url }, index) => {
          const qc = shot.qcReport as {
            score?: number;
            issues?: { kind: string; severity: string; detail: string }[];
          } | null;
          const routing = shot.routing as { model?: string; reason?: string } | null;

          return (
            <article key={shot.id} id={`shot-${shot.id}`} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    Shot {String(index + 1).padStart(2, '0')} · {shot.durationSec}s
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{shot.visualGoal}</p>
                </div>
                <div className="flex items-center gap-2">
                  {typeof shot.qcScore === 'number' && (
                    <span className="chip border-line bg-raised text-neutral-300">
                      QC {shot.qcScore.toFixed(2)}
                    </span>
                  )}
                  <StatusChip status={shot.status} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="aspect-[9/16] overflow-hidden rounded-lg border border-line bg-ink">
                  {url ? (
                    <video src={url} controls className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-muted">
                      no asset
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-neutral-400">{shot.prompt}</p>
                  {routing?.model && (
                    <p className="text-xs text-muted">
                      <span className="text-neutral-400">Model:</span> {routing.model} — {routing.reason}
                    </p>
                  )}
                  {qc?.issues && qc.issues.length > 0 && (
                    <ul className="space-y-1">
                      {qc.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-amber-300/90">
                          [{issue.severity}] {issue.kind}: {issue.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section id="approval">
        <ApprovalGate
          workflowId={workflow.id}
          status={workflow.status}
          caption={workflow.caption}
          cta={workflow.ctaOverride ?? strategy?.cta ?? null}
          publishAt={workflow.publishAt?.toISOString() ?? null}
          actualCost={toNumber(workflow.actualCost)}
          shotIds={workflow.shots.map((shot) => shot.id)}
          allShotsPassed={
            workflow.shots.length > 0 &&
            workflow.shots.every((shot) => shot.status === ShotStatus.QC_PASSED)
          }
        />
      </section>
    </div>
  );
}
