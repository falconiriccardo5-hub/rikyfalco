import type { WorkflowStatus } from '@prisma/client';

const STYLES: Record<string, string> = {
  DRAFT: 'border-neutral-700 bg-neutral-900 text-neutral-400',
  STRATEGY: 'border-sky-900 bg-sky-950/60 text-sky-300',
  SCRIPT: 'border-sky-900 bg-sky-950/60 text-sky-300',
  STORYBOARD: 'border-sky-900 bg-sky-950/60 text-sky-300',
  ROUTING: 'border-sky-900 bg-sky-950/60 text-sky-300',
  GENERATING: 'border-amber-900 bg-amber-950/50 text-amber-300',
  QC: 'border-violet-900 bg-violet-950/50 text-violet-300',
  AWAITING_APPROVAL: 'border-accent/50 bg-accent/10 text-accent',
  APPROVED: 'border-emerald-900 bg-emerald-950/50 text-emerald-300',
  REJECTED: 'border-red-900 bg-red-950/50 text-red-300',
  SCHEDULED: 'border-indigo-900 bg-indigo-950/50 text-indigo-300',
  PUBLISHED: 'border-emerald-800 bg-emerald-950/70 text-emerald-200',
  FAILED: 'border-red-900 bg-red-950/60 text-red-300',
};

export function StatusChip({ status }: { status: WorkflowStatus | string }) {
  return (
    <span className={`chip ${STYLES[status] ?? STYLES.DRAFT}`}>{status.replace(/_/g, ' ')}</span>
  );
}
