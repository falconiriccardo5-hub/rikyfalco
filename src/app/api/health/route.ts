import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env, higgsfieldCredentials } from '@/lib/env';
import { drivers, fullyOffline } from '@/lib/drivers';
import { ffmpegAvailable } from '@/lib/qc/ffmpeg';
import { redisConnection } from '@/lib/queue';
import { publisherConfigured } from '@/lib/publisher';
import { selectableModels } from '@/lib/higgsfield/catalog';

export const dynamic = 'force-dynamic';

interface Check {
  ok: boolean;
  required: boolean;
  detail: string;
}

/**
 * Dependency readiness, judged against the ACTIVE drivers: a service that no
 * driver uses is reported but does not make the app unhealthy. Never reports
 * a credential's value, only whether one is present.
 */
export async function GET() {
  const e = env();
  const d = drivers();
  const checks: Record<string, Check> = {};

  checks.database = {
    ok: await prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    ),
    required: true,
    detail: 'PostgreSQL via Prisma.',
  };

  if (d.queue === 'redis') {
    checks.redis = {
      ok: await redisConnection()
        .ping()
        .then(
          () => true,
          () => false,
        ),
      required: true,
      detail: 'BullMQ queue backend.',
    };
  } else {
    checks.redis = { ok: true, required: false, detail: 'Not used: queue runs inline.' };
  }

  if (d.qc === 'ffmpeg') {
    const binaries = await ffmpegAvailable();
    checks.ffmpeg = { ok: binaries.ffmpeg, required: true, detail: 'Frame extraction.' };
    checks.ffprobe = { ok: binaries.ffprobe, required: true, detail: 'File measurement.' };
  } else {
    checks.ffmpeg = { ok: true, required: false, detail: 'Not used: QC is simulated locally.' };
  }

  checks.openai = {
    ok: Boolean(e.OPENAI_API_KEY),
    required: d.agents === 'openai',
    detail: d.agents === 'openai' ? 'Agent pipeline.' : 'Not used: local agent driver.',
  };

  checks.higgsfield = {
    ok: higgsfieldCredentials() !== null,
    required: d.generation === 'higgsfield',
    detail:
      d.generation === 'higgsfield' ? 'Shot generation.' : 'Not used: local generation driver.',
  };

  checks.storage = {
    ok:
      d.storage === 's3'
        ? Boolean(e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY)
        : true,
    required: d.storage === 's3',
    detail: d.storage === 's3' ? 'S3-compatible bucket.' : `Local directory ${e.LOCAL_STORAGE_DIR}.`,
  };

  // Phase 2 — never gates readiness.
  checks.instagramPublisher = {
    ok: publisherConfigured(),
    required: false,
    detail: 'Phase 2: adapter not implemented yet.',
  };

  const healthy = Object.values(checks).every((check) => !check.required || check.ok);

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      offline: fullyOffline(),
      drivers: d,
      checks,
      catalogModels: selectableModels().length,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
