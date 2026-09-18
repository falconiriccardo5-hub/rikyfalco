import { z } from 'zod';

/**
 * Server-only environment access. Never import this from a client component:
 * every secret below must stay on the server (no NEXT_PUBLIC_* mirrors).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TEXT_MODEL: z.string().default('gpt-4.1'),
  OPENAI_VISION_MODEL: z.string().default('gpt-4.1'),

  // Higgsfield: "KEY_ID:KEY_SECRET" (official format), or the split pair.
  HF_CREDENTIALS: z.string().optional(),
  HF_API_KEY: z.string().optional(),
  HF_API_SECRET: z.string().optional(),
  HF_BASE_URL: z.string().default('https://api.higgsfield.ai'),
  HF_WEBHOOK_SECRET: z.string().optional(),
  HF_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  HF_MAX_POLL_MS: z.coerce.number().int().positive().default(600_000),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  QC_FRAME_COUNT: z.coerce.number().int().min(2).max(12).default(4),
  QC_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.75),

  AUTH_SECRET: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),

  // Phase 2 (Instagram publisher) — interface exists, credentials optional here.
  IG_GRAPH_API_VERSION: z.string().default('v21.0'),
  IG_USER_ID: z.string().optional(),
  IG_ACCESS_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** Test helper: drop the memoized snapshot after mutating process.env. */
export function resetEnvCache(): void {
  cached = null;
}

/** Resolve Higgsfield credentials in the officially documented precedence. */
export function higgsfieldCredentials(): string | null {
  const e = env();
  if (e.HF_CREDENTIALS && e.HF_CREDENTIALS.includes(':')) return e.HF_CREDENTIALS;
  if (e.HF_API_KEY && e.HF_API_SECRET) return `${e.HF_API_KEY}:${e.HF_API_SECRET}`;
  return null;
}
