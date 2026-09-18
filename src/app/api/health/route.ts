import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env, higgsfieldCredentials } from '@/lib/env';
import { ffmpegAvailable } from '@/lib/qc/ffmpeg';
import { redisConnection } from '@/lib/queue';
import { publisherConfigured } from '@/lib/publisher';
import { selectableModels } from '@/lib/higgsfield/catalog';

export const dynamic = 'force-dynamic';

/** Dependency readiness. Reports what is configured — never the values. */
export async function GET() {
  const e = env();

  const database = await prisma.$queryRaw`SELECT 1`.then(
    () => true,
    () => false,
  );

  const redis = await redisConnection()
    .ping()
    .then(
      () => true,
      () => false,
    );

  const binaries = await ffmpegAvailable();

  const checks = {
    database,
    redis,
    ffmpeg: binaries.ffmpeg,
    ffprobe: binaries.ffprobe,
    openai: Boolean(e.OPENAI_API_KEY),
    higgsfield: higgsfieldCredentials() !== null,
    storage: Boolean(e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY),
    instagramPublisher: publisherConfigured(),
  };

  // The publisher is Phase 2, so it does not gate readiness.
  const required = { ...checks, instagramPublisher: true };
  const healthy = Object.values(required).every(Boolean);

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      catalogModels: selectableModels().length,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
