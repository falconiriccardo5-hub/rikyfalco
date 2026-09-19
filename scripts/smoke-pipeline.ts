import { PrismaClient } from '@prisma/client';
import { runWorkflow } from '../src/lib/pipeline/orchestrator';
import { describeDrivers, fullyOffline } from '../src/lib/drivers';

/**
 * End-to-end smoke test of the agent pipeline against a real database, using
 * whatever drivers are configured. With the defaults it spends nothing and
 * contacts nobody: `npm run smoke`.
 */
const prisma = new PrismaClient();

const BRIEF =
  process.argv.slice(2).join(' ') ||
  'Crea un Reel di 20 secondi per donne 30-50 sul perché fare troppo cardio non è sempre la ' +
    'soluzione per migliorare la composizione corporea. Voglio un tono cinematico, premium e una ' +
    'CTA finale: scrivi DIAFRAMMA.';

async function main() {
  for (const driver of describeDrivers()) {
    console.log(`  ${driver.label.padEnd(16)} ${driver.value}${driver.live ? '  (live service)' : ''}`);
  }
  if (!fullyOffline()) {
    console.log('\n⚠ A live driver is enabled: this run may call an external service and cost money.\n');
  }

  const brand = await prisma.brandProfile.findFirstOrThrow({ where: { isDefault: true } });

  const workflow = await prisma.workflow.create({
    data: {
      workspaceId: brand.workspaceId,
      brandProfileId: brand.id,
      title: 'Smoke test Reel',
      brief: BRIEF,
      durationSec: 20,
      maxBudgetUsd: '2.0',
      idempotencyKey: `smoke-${Date.now()}`,
    },
  });

  const result = await runWorkflow(workflow.id);

  const full = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflow.id },
    include: {
      agentRuns: { orderBy: { startedAt: 'asc' } },
      shots: { orderBy: { orderIndex: 'asc' }, include: { assets: true } },
    },
  });

  console.log(`\nstatus        ${result.status}`);
  console.log(`shots         ${full.shots.length}`);
  console.log(`cost          $${String(full.actualCost)} of $${String(full.maxBudgetUsd)}`);
  console.log(`agent runs    ${full.agentRuns.map((r) => `${r.agent}=${r.status}`).join(' ')}`);
  console.log(`shot QC       ${full.shots.map((s) => `${s.sceneId}:${s.qcScore ?? '—'}`).join(' ')}`);
  console.log(`\nOpen the dashboard at /workflows/${workflow.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
