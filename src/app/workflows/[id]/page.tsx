import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShotStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/cost';
import { assetUrl } from '@/lib/storage';
import { StatusChip } from '@/components/StatusChip';
import { AutoRefresh } from '@/components/AutoRefresh';
import { ShotActions } from './ShotActions';
import { ApprovalGate } from './ApprovalGate';
import { PipelineGraph, type PipelineNode } from './PipelineGraph';

export const dynamic = 'force-dynamic';

/** Statuses where the pipeline is still working, so the page should self-refresh. */
const IN_FLIGHT: WorkflowStatus[] = [
  WorkflowStatus.STRATEGY,
  WorkflowStatus.SCRIPT,
  WorkflowStatus.STORYBOARD,
  WorkflowStatus.ROUTING,
  WorkflowStatus.GENERATING,
  WorkflowStatus.QC,
];

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
        include: {
          assets: { orderBy: { createdAt: 'desc' }, take: 1 },
          generationJobs: { orderBy: { createdAt: 'asc' } },
        },
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
          url = await assetUrl(asset.storageKey);
        } catch {
          url = null; // Storage not configured or object missing — the page still renders.
        }
      }
      return { shot, url, mimeType: asset?.mimeType ?? null };
    }),
  );

  const script = workflow.script as { scenes?: { scene: number; voiceover: string; on_screen_text: string }[] } | null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="text-xs text-muted hover:text-secondary">
            ← Dashboard
          </Link>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{workflow.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {workflow.durationSec}s · {workflow.aspectRatio} · {workflow.brandProfile.brandName}
          </p>
        </div>
        <div className="text-right">
          <StatusChip status={workflow.status} />
          <div className="mt-2 flex justify-end">
            <AutoRefresh active={IN_FLIGHT.includes(workflow.status)} label={workflow.status.toLowerCase().replace(/_/g, ' ')} />
          </div>
          <p className="mt-2 text-xs tabular-nums text-muted">
            ${toNumber(workflow.actualCost).toFixed(2)} spent · est. $
            {toNumber(workflow.estimatedCost).toFixed(2)} · budget $
            {toNumber(workflow.maxBudgetUsd).toFixed(2)}
          </p>
        </div>
      </header>

      {workflow.errorCode && (
        <div className="panel border-danger/40 p-4">
          <p className="chip border-danger/40 bg-danger/10 text-danger">{workflow.errorCode}</p>
          <p className="mt-2 text-sm text-danger">{workflow.errorMessage}</p>
        </div>
      )}

      <PipelineGraph nodes={nodes} />

      <section id="brief" className="panel p-5">
        <h2 className="text-sm font-medium text-secondary">Brief</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{workflow.brief}</p>
      </section>

      {strategy && (
        <section id="strategy" className="panel p-5">
          <h2 className="text-sm font-medium text-secondary">Strategy</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {Object.entries(strategy).map(([key, value]) => (
              <div key={key}>
                <dt className="text-[11px] uppercase tracking-wider text-muted">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="mt-0.5 text-sm text-secondary">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {script?.scenes && (
        <section id="script" className="panel p-5">
          <h2 className="text-sm font-medium text-secondary">Script</h2>
          <ol className="mt-3 space-y-3">
            {script.scenes.map((scene) => (
              <li key={scene.scene} className="border-l-2 border-line pl-3">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Scene {scene.scene}
                </p>
                <p className="mt-0.5 text-sm text-secondary">{scene.voiceover}</p>
                {scene.on_screen_text && (
                  <p className="mt-1 text-xs text-accent">“{scene.on_screen_text}”</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section id="shots" className="space-y-4">
        <h2 className="text-sm font-medium text-secondary">Shots</h2>
        {shotsWithUrls.length === 0 && (
          <p className="panel p-5 text-sm text-muted">No shots yet — run the pipeline.</p>
        )}
        {shotsWithUrls.map(({ shot, url, mimeType }, index) => {
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
                    <span className="chip border-line bg-raised text-secondary">
                      QC {shot.qcScore.toFixed(2)}
                    </span>
                  )}
                  <StatusChip status={shot.status} />
                </div>
              </div>

              <div className="mt-3">
                <ShotActions
                  shotId={shot.id}
                  disabled={workflow.status === WorkflowStatus.PUBLISHED}
                  regenCount={shot.regenCount}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="aspect-[9/16] overflow-hidden rounded-lg border border-line bg-ink">
                  {url && mimeType?.startsWith('video/') ? (
                    <video src={url} controls className="h-full w-full object-cover" />
                  ) : url ? (
                    // A simulated shot stores a still placeholder, not footage.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`Shot ${index + 1} placeholder`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-muted">
                      no asset
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-secondary">{shot.prompt}</p>
                  {routing?.model && (
                    <p className="text-xs text-muted">
                      <span className="text-secondary">Model:</span> {routing.model} — {routing.reason}
                    </p>
                  )}
                  {qc?.issues && qc.issues.length > 0 && (
                    <ul className="space-y-1">
                      {qc.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-warning">
                          [{issue.severity}] {issue.kind}: {issue.detail}
                        </li>
                      ))}
                    </ul>
                  )}

                  <details className="group">
                    <summary className="cursor-pointer text-xs text-muted hover:text-secondary">
                      Technical detail
                    </summary>
                    <dl className="mt-2 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted">Camera</dt>
                        <dd className="text-secondary">
                          {[shot.camera, shot.lens, shot.movement].filter(Boolean).join(' · ') || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Lighting</dt>
                        <dd className="text-secondary">{shot.lighting ?? '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted">Negative prompt</dt>
                        <dd className="text-secondary">{shot.negativePrompt ?? '—'}</dd>
                      </div>
                      {shot.voiceover && (
                        <div className="sm:col-span-2">
                          <dt className="text-muted">Voiceover</dt>
                          <dd className="text-secondary">{shot.voiceover}</dd>
                        </div>
                      )}
                    </dl>

                    {shot.generationJobs.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {shot.generationJobs.map((job) => (
                          <li key={job.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-secondary">{job.stage}</span>
                            <span className="text-muted">{job.modelId}</span>
                            <span className="font-mono text-[10px] text-muted">
                              {job.requestId ?? 'no request id'}
                            </span>
                            <StatusChip status={job.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
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
