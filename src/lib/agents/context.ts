import type { BrandProfile, Workflow } from '@prisma/client';

export interface PriorContent {
  title: string;
  topic: string;
  hook: string;
  publishedAt: Date | null;
}

export interface AgentContext {
  workflow: Workflow;
  brand: BrandProfile;
  priorContent: PriorContent[];
}

/** Compact, token-cheap rendering of the brand profile for every agent prompt. */
export function renderBrand(brand: BrandProfile): string {
  return [
    `Brand: ${brand.brandName}`,
    `Niche: ${brand.niche}`,
    `Positioning: ${brand.positioning}`,
    `Primary audience: ${brand.primaryAudience}`,
    brand.secondaryAudience ? `Secondary audience: ${brand.secondaryAudience}` : null,
    `Tone: ${brand.tone}`,
    `Visual style: ${brand.visualStyle}`,
    brand.colors.length ? `Colors: ${brand.colors.join(', ')}` : null,
    brand.fonts.length ? `Fonts: ${brand.fonts.join(', ')}` : null,
    brand.forbiddenStyles.length ? `Forbidden styles: ${brand.forbiddenStyles.join(', ')}` : null,
    brand.ctaOptions.length ? `CTA options: ${brand.ctaOptions.join(' | ')}` : null,
    brand.keywords.length ? `Recurring keywords: ${brand.keywords.join(', ')}` : null,
    `Preferred duration: ${brand.preferredDuration}s`,
    brand.preferredFormats.length ? `Preferred formats: ${brand.preferredFormats.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function renderPriorContent(items: PriorContent[]): string {
  if (!items.length) return 'No previous content on record.';
  return items
    .map((item) => {
      const when = item.publishedAt ? item.publishedAt.toISOString().slice(0, 10) : 'unpublished';
      return `- [${when}] ${item.title} | topic: ${item.topic} | hook: "${item.hook}"`;
    })
    .join('\n');
}

export function renderBriefBlock(workflow: Workflow): string {
  return [
    `Brief: ${workflow.brief}`,
    workflow.targetOverride ? `Target override: ${workflow.targetOverride}` : null,
    workflow.goal ? `Goal: ${workflow.goal}` : null,
    `Duration: ${workflow.durationSec}s`,
    `Aspect ratio: ${workflow.aspectRatio}`,
    workflow.styleOverride ? `Style override: ${workflow.styleOverride}` : null,
    workflow.ctaOverride ? `CTA override: ${workflow.ctaOverride}` : null,
    workflow.referenceMedia.length
      ? `Reference media URLs: ${workflow.referenceMedia.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}
