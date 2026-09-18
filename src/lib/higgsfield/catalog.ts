import fs from 'node:fs';
import { z } from 'zod';
import catalogJson from './catalog.json';
import { logger } from '../logger';

export const CAPABILITIES = [
  'text-to-image',
  'text-to-video',
  'image-to-video',
  'video-to-video',
  'motion-transfer',
  'audio-video',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const modelEntrySchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  capability: z.enum(CAPABILITIES),
  label: z.string(),
  /**
   * true only for endpoints confirmed against the official SDK. The router
   * refuses unverified entries unless HF_ALLOW_UNVERIFIED_MODELS=true, so an
   * invented model ID can never silently reach the API.
   */
  verified: z.boolean().default(false),
  supportsAudio: z.boolean().default(false),
  referenceConsistency: z.boolean().default(false),
  motionTransfer: z.boolean().default(false),
  qualityTier: z.enum(['draft', 'standard', 'high', 'premium']).default('standard'),
  aspectRatios: z.array(z.string()).default([]),
  durationsSec: z.array(z.number()).default([]),
  resolutions: z.array(z.string()).default([]),
  estimatedCostUsd: z.number().nonnegative(),
  defaults: z.record(z.unknown()).default({}),
  sizeByAspectRatio: z.record(z.string()).optional(),
});

export type ModelEntry = z.infer<typeof modelEntrySchema>;

const catalogSchema = z.object({ models: z.array(modelEntrySchema).min(1) });

let cached: ModelEntry[] | null = null;

/**
 * Catalog is data, not code: an operator can point HF_CATALOG_PATH at an
 * updated file when Higgsfield ships new models, without a redeploy.
 */
export function loadCatalog(): ModelEntry[] {
  if (cached) return cached;

  const override = process.env.HF_CATALOG_PATH;
  if (override) {
    try {
      const parsed = catalogSchema.parse(JSON.parse(fs.readFileSync(override, 'utf8')));
      cached = parsed.models;
      return cached;
    } catch (error) {
      logger.warn('Falling back to the bundled Higgsfield catalog', {
        path: override,
        error: (error as Error).message,
      });
    }
  }

  cached = catalogSchema.parse(catalogJson).models;
  return cached;
}

export function resetCatalogCache(): void {
  cached = null;
}

export function findModel(id: string): ModelEntry | undefined {
  return loadCatalog().find((m) => m.id === id);
}

export function modelsByCapability(capability: Capability): ModelEntry[] {
  return loadCatalog().filter((m) => m.capability === capability);
}

export function allowUnverifiedModels(): boolean {
  return process.env.HF_ALLOW_UNVERIFIED_MODELS === 'true';
}

export function selectableModels(): ModelEntry[] {
  const all = loadCatalog();
  return allowUnverifiedModels() ? all : all.filter((m) => m.verified);
}
