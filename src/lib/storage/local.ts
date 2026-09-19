import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env';
import { OrchestratorError } from '../errors';
import type { StoredAsset } from './s3';

/**
 * Local filesystem storage driver. Assets land under LOCAL_STORAGE_DIR and are
 * served back through /api/assets/<key>, so the dashboard shows real stored
 * files with no bucket, no credentials and no outbound request.
 */

function rootDir(): string {
  const dir = env().LOCAL_STORAGE_DIR;
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

/** Refuse anything that could escape the storage root. */
function resolveKey(storageKey: string): string {
  const root = rootDir();
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new OrchestratorError('STORAGE_FAILED', 'Refusing a storage key outside the asset root.');
  }
  return resolved;
}

async function write(storageKey: string, body: Buffer, mimeType: string): Promise<StoredAsset> {
  const target = resolveKey(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);

  return {
    storageKey,
    bytes: body.byteLength,
    checksum: createHash('sha256').update(body).digest('hex'),
    mimeType,
    // The stored file is itself the local path QC can read.
    localPath: target,
  };
}

/**
 * Placeholder standing in for generated media. It is deliberately legible as a
 * placeholder — it must never be mistaken for real footage in a review.
 */
export function placeholderSvg(label: string, detail: string, aspectRatio: string): string {
  const [w, h] = aspectRatio.split(':').map(Number);
  const width = 540;
  const height = Math.round((width * (h || 16)) / (w || 9));
  const escape = (text: string) =>
    text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#15171F"/>
      <stop offset="100%" stop-color="#0A0B0F"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="none" stroke="#C8A96A" stroke-opacity="0.35" stroke-dasharray="8 6"/>
  <text x="50%" y="46%" fill="#C8A96A" font-family="monospace" font-size="15" text-anchor="middle">SIMULATED SHOT</text>
  <text x="50%" y="53%" fill="#8A8F9C" font-family="monospace" font-size="12" text-anchor="middle">${escape(label)}</text>
  <text x="50%" y="59%" fill="#5A5F6C" font-family="monospace" font-size="10" text-anchor="middle">${escape(detail)}</text>
</svg>`;
}

export interface SyntheticAssetArgs {
  keyPrefix: string;
  label: string;
  detail: string;
  aspectRatio: string;
}

/** Create and store a placeholder asset without downloading anything. */
export async function storeSyntheticAsset(args: SyntheticAssetArgs): Promise<StoredAsset> {
  const svg = placeholderSvg(args.label, args.detail, args.aspectRatio);
  const storageKey = `${args.keyPrefix}/${randomUUID()}.svg`;
  return write(storageKey, Buffer.from(svg, 'utf8'), 'image/svg+xml');
}

/** Persist bytes fetched from a real provider into the local root. */
export async function storeBuffer(
  keyPrefix: string,
  body: Buffer,
  mimeType: string,
  extension: string,
): Promise<StoredAsset> {
  return write(`${keyPrefix}/${randomUUID()}.${extension}`, body, mimeType);
}

export async function readLocalAsset(storageKey: string): Promise<{ body: Buffer; mimeType: string }> {
  const target = resolveKey(storageKey);
  const extension = path.extname(target).slice(1).toLowerCase();
  const mimeByExtension: Record<string, string> = {
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  try {
    return {
      body: await fs.readFile(target),
      mimeType: mimeByExtension[extension] ?? 'application/octet-stream',
    };
  } catch {
    throw new OrchestratorError('STORAGE_FAILED', 'Stored asset not found.');
  }
}
