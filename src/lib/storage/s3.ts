import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';
import { OrchestratorError } from '../errors';

let client: S3Client | null = null;

function s3(): S3Client {
  const e = env();
  if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) {
    throw new OrchestratorError(
      'STORAGE_FAILED',
      'Object storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.',
    );
  }
  if (!client) {
    client = new S3Client({
      region: e.S3_REGION,
      ...(e.S3_ENDPOINT ? { endpoint: e.S3_ENDPOINT } : {}),
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

export function resetS3Client(): void {
  client = null;
}

export interface StoredAsset {
  storageKey: string;
  bytes: number;
  checksum: string;
  mimeType: string;
  /** Local copy, kept so QC can probe the real file before it is cleaned up. */
  localPath: string;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Pull a provider result into our own bucket. Provider URLs expire; assets we
 * publish or re-review must live in storage we control.
 */
export async function ingestFromUrl(sourceUrl: string, keyPrefix: string): Promise<StoredAsset> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new OrchestratorError(
      'STORAGE_FAILED',
      `Could not download the generated asset (${response.status}).`,
    );
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'bin';
  const storageKey = `${keyPrefix}/${randomUUID()}.${extension}`;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asset-'));
  const localPath = path.join(workDir, path.basename(storageKey));
  await fs.writeFile(localPath, buffer);

  const e = env();
  await s3().send(
    new PutObjectCommand({
      Bucket: e.S3_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      ChecksumSHA256: createHash('sha256').update(buffer).digest('base64'),
    }),
  );

  return { storageKey, bytes: buffer.byteLength, checksum, mimeType, localPath };
}

/** Media is never served from a public bucket URL — always a short-lived signed URL. */
export async function signedUrl(storageKey: string, ttlSeconds?: number): Promise<string> {
  const e = env();
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: e.S3_BUCKET, Key: storageKey }), {
    expiresIn: ttlSeconds ?? e.SIGNED_URL_TTL_SECONDS,
  });
}

export async function cleanupLocal(localPath: string): Promise<void> {
  await fs.rm(path.dirname(localPath), { recursive: true, force: true });
}
