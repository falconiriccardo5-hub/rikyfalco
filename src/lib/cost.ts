import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { BudgetExceededError } from './errors';

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

export interface CostSnapshot {
  estimatedUsd: number;
  actualUsd: number;
  budgetUsd: number;
  remainingUsd: number;
  generations: number;
  retries: number;
  withinBudget: boolean;
}

export async function costSnapshot(workflowId: string): Promise<CostSnapshot> {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { shots: { include: { generationJobs: true } } },
  });

  const jobs = workflow.shots.flatMap((shot) => shot.generationJobs);
  const estimated = toNumber(workflow.estimatedCost);
  const actual = toNumber(workflow.actualCost);
  const budget = toNumber(workflow.maxBudgetUsd);

  return {
    estimatedUsd: estimated,
    actualUsd: actual,
    budgetUsd: budget,
    remainingUsd: Math.max(0, budget - Math.max(actual, 0)),
    generations: jobs.length,
    retries: workflow.shots.reduce((sum, shot) => sum + shot.regenCount, 0),
    withinBudget: Math.max(actual, estimated) <= budget,
  };
}

/**
 * Gate every spend before it happens. A workflow that would cross its budget
 * stops rather than silently overspending (spec §8).
 */
export async function assertWithinBudget(workflowId: string, nextSpendUsd: number): Promise<void> {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    select: { actualCost: true, maxBudgetUsd: true },
  });

  const projected = toNumber(workflow.actualCost) + nextSpendUsd;
  const budget = toNumber(workflow.maxBudgetUsd);
  if (projected > budget) throw new BudgetExceededError(projected, budget);
}

export interface RecordCostArgs {
  workflowId: string;
  category: 'agent' | 'generation' | 'qc' | 'storage';
  amountUsd: number;
  reference?: string;
  estimated?: boolean;
  metadata?: Prisma.InputJsonValue;
}

/** Append a CostEvent and roll it into the workflow's running total. */
export async function recordCost(args: RecordCostArgs): Promise<void> {
  const { workflowId, category, amountUsd, reference, estimated = false, metadata } = args;

  await prisma.$transaction(async (tx) => {
    await tx.costEvent.create({
      data: {
        workflowId,
        category,
        reference,
        estimated,
        amountUsd: new Prisma.Decimal(amountUsd.toFixed(4)),
        ...(metadata ? { metadata } : {}),
      },
    });

    await tx.workflow.update({
      where: { id: workflowId },
      data: estimated
        ? { estimatedCost: { increment: new Prisma.Decimal(amountUsd.toFixed(4)) } }
        : { actualCost: { increment: new Prisma.Decimal(amountUsd.toFixed(4)) } },
    });
  });
}
