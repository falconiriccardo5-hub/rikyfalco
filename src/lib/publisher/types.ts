/**
 * Publishing port (spec §16). The orchestrator depends on this interface only,
 * never on a concrete platform SDK, so an implementation can be swapped without
 * touching the pipeline.
 */

export interface PublishReelInput {
  /** Publicly reachable video URL — Meta fetches the file itself. */
  videoUrl: string;
  caption: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  /** Guards against a double publish of the same workflow. */
  idempotencyKey: string;
}

export interface PublishReelResult {
  externalId: string;
  permalink?: string;
  status: 'PUBLISHED' | 'IN_PROGRESS';
}

export interface ProfileInfo {
  id: string;
  username?: string;
  followersCount?: number;
}

export type MediaState = 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'PUBLISHED' | 'EXPIRED';

export interface MediaStatus {
  id: string;
  state: MediaState;
  error?: string;
}

export interface InstagramPublisher {
  publishReel(input: PublishReelInput): Promise<PublishReelResult>;
  getProfile(): Promise<ProfileInfo>;
  getPublishingStatus(): Promise<{ quotaUsage: number; configured: boolean }>;
  getMediaStatus(containerId: string): Promise<MediaStatus>;
}

export class PublisherNotConfiguredError extends Error {
  constructor(readonly missing: string[]) {
    super(`Instagram publisher is not configured. Missing: ${missing.join(', ')}`);
    this.name = 'PublisherNotConfiguredError';
  }
}
