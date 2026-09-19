import { drivers } from '../drivers';
import { OrchestratorError } from '../errors';
import { isSyntheticUrl } from '../higgsfield/localClient';
import {
  cleanupLocal as cleanupS3Temp,
  ingestFromUrl as ingestToS3,
  signedUrl as s3SignedUrl,
  type StoredAsset,
} from './s3';
import { storeBuffer, storeSyntheticAsset } from './local';

export type { StoredAsset };

const EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface IngestArgs {
  sourceUrl: string;
  keyPrefix: string;
  /** Used to label a placeholder when the media is simulated. */
  label: string;
  detail: string;
  aspectRatio: string;
}

/**
 * Bring a generated result into storage we control.
 *
 * A `local:` URL never touches the network: the local generation driver has no
 * media to hand over, so a clearly-marked placeholder is stored in its place.
 */
export async function ingestAsset(args: IngestArgs): Promise<StoredAsset> {
  const driver = drivers().storage;

  if (isSyntheticUrl(args.sourceUrl)) {
    if (driver === 's3') {
      throw new OrchestratorError(
        'STORAGE_FAILED',
        'Simulated media cannot be uploaded to S3. Use STORAGE_DRIVER=local with GENERATION_DRIVER=local.',
      );
    }
    return storeSyntheticAsset({
      keyPrefix: args.keyPrefix,
      label: args.label,
      detail: args.detail,
      aspectRatio: args.aspectRatio,
    });
  }

  if (driver === 's3') return ingestToS3(args.sourceUrl, args.keyPrefix);

  // Real provider media, stored on the local filesystem.
  const response = await fetch(args.sourceUrl);
  if (!response.ok) {
    throw new OrchestratorError(
      'STORAGE_FAILED',
      `Could not download the generated asset (${response.status}).`,
    );
  }
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream';
  const body = Buffer.from(await response.arrayBuffer());
  return storeBuffer(args.keyPrefix, body, mimeType, EXTENSION_BY_MIME[mimeType] ?? 'bin');
}

/** A URL the browser can load for a stored asset. */
export async function assetUrl(storageKey: string): Promise<string> {
  if (drivers().storage === 's3') return s3SignedUrl(storageKey);
  return `/api/assets/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Drop the temporary working copy. With the local driver the stored file IS
 * the asset, so there is nothing to clean up.
 */
export async function cleanupWorkingCopy(localPath: string): Promise<void> {
  if (drivers().storage === 's3') await cleanupS3Temp(localPath);
}
