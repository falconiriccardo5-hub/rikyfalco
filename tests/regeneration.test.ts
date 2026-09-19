import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Attempt numbering decides whether a render is genuinely redone.
 *
 * Generation keys are (shot, stage, attempt). If a deliberate regeneration
 * reused the completed attempt's number, runStage would reconcile the old
 * request instead of submitting a new one, and the shot would silently keep
 * its previous footage. A crashed attempt must still resume in place, or a
 * half-finished submission could be billed twice.
 */

type Job = { attempt: number; status: string };

const jobs: Job[] = [];

vi.mock('@/lib/db', () => ({
  prisma: {
    generationJob: { findMany: vi.fn(async () => jobs) },
    workflow: { findUniqueOrThrow: vi.fn() },
    shot: { findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock('@/lib/cost', () => ({
  recordCost: vi.fn(),
  toNumber: (v: unknown) => Number(v ?? 0),
}));

vi.mock('@/lib/storage', () => ({ ingestAsset: vi.fn(), cleanupWorkingCopy: vi.fn() }));

const { __attempts } = await import('@/lib/pipeline/orchestrator');

beforeEach(() => {
  jobs.length = 0;
});

describe('nextAttemptNumber', () => {
  it('starts at 1 for a shot that has never been rendered', async () => {
    expect(await __attempts.nextAttemptNumber('shot-1')).toBe(1);
  });

  it('moves to a fresh attempt after a completed render, so a regeneration really re-renders', async () => {
    jobs.push({ attempt: 1, status: 'COMPLETED' }, { attempt: 1, status: 'COMPLETED' });
    expect(await __attempts.nextAttemptNumber('shot-1')).toBe(2);
  });

  it('resumes an unfinished attempt instead of starting a new one, so nothing is billed twice', async () => {
    jobs.push({ attempt: 1, status: 'COMPLETED' }, { attempt: 1, status: 'IN_PROGRESS' });
    expect(await __attempts.nextAttemptNumber('shot-1')).toBe(1);
  });

  it('resumes a failed attempt in place rather than skipping past it', async () => {
    jobs.push({ attempt: 2, status: 'FAILED' });
    expect(await __attempts.nextAttemptNumber('shot-1')).toBe(2);
  });

  it('counts from the highest attempt on record, not the number of jobs', async () => {
    jobs.push(
      { attempt: 1, status: 'COMPLETED' },
      { attempt: 1, status: 'COMPLETED' },
      { attempt: 3, status: 'COMPLETED' },
    );
    expect(await __attempts.nextAttemptNumber('shot-1')).toBe(4);
  });
});
