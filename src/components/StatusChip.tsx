import type { WorkflowStatus } from '@prisma/client';

/**
 * Status is never colour-only: every chip carries its label as text
 * (ux: color is not the only indicator).
 */
const STYLES: Record<string, string> = {
  DRAFT: 'border-line bg-raised text-secondary',
  STRATEGY: 'border-accent/30 bg-accent/10 text-accent-soft',
  SCRIPT: 'border-accent/30 bg-accent/10 text-accent-soft',
  STORYBOARD: 'border-accent/30 bg-accent/10 text-accent-soft',
  ROUTING: 'border-accent/30 bg-accent/10 text-accent-soft',
  GENERATING: 'border-warning/35 bg-warning/10 text-warning',
  QC: 'border-violet/40 bg-violet/10 text-[#C4B5FD]',
  AWAITING_APPROVAL: 'border-accent/45 bg-accent/12 text-accent-soft',
  APPROVED: 'border-positive/35 bg-positive/10 text-positive',
  REJECTED: 'border-danger/35 bg-danger/10 text-danger',
  SCHEDULED: 'border-cyan/35 bg-cyan/10 text-cyan',
  PUBLISHED: 'border-positive/45 bg-positive/15 text-positive',
  FAILED: 'border-danger/40 bg-danger/12 text-danger',

  // Shot + job statuses reuse the same vocabulary.
  PENDING: 'border-line bg-raised text-muted',
  ROUTED: 'border-line bg-raised text-secondary',
  SUBMITTED: 'border-accent/30 bg-accent/10 text-accent-soft',
  QC_PASSED: 'border-positive/35 bg-positive/10 text-positive',
  QC_FAILED: 'border-danger/35 bg-danger/10 text-danger',
  CREATED: 'border-line bg-raised text-muted',
  QUEUED: 'border-line bg-raised text-secondary',
  IN_PROGRESS: 'border-warning/35 bg-warning/10 text-warning',
  COMPLETED: 'border-positive/35 bg-positive/10 text-positive',
  NSFW: 'border-danger/35 bg-danger/10 text-danger',
  TIMEOUT: 'border-danger/35 bg-danger/10 text-danger',
  CANCELED: 'border-line bg-raised text-muted',
  SUCCEEDED: 'border-positive/35 bg-positive/10 text-positive',
  RUNNING: 'border-warning/35 bg-warning/10 text-warning',
};

export function StatusChip({ status }: { status: WorkflowStatus | string }) {
  return (
    <span className={`chip ${STYLES[status] ?? STYLES.DRAFT}`}>{status.replace(/_/g, ' ')}</span>
  );
}
