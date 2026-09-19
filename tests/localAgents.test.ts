import { beforeEach, describe, expect, it } from 'vitest';
import type { BrandProfile, Workflow } from '@prisma/client';
import {
  localQcVision,
  localScript,
  localStoryboard,
  localStrategy,
  resolveAudience,
  resolveCta,
  resolveDuration,
  resolveTopic,
} from '@/lib/agents/local';
import { scriptSchema, storyboardSchema, strategySchema } from '@/lib/agents/schemas';
import type { AgentContext } from '@/lib/agents/context';
import { resetEnvCache } from '@/lib/env';
import { drivers, fullyOffline } from '@/lib/drivers';

const brand = {
  id: 'brand-1',
  brandName: 'Riccardo Fitness',
  niche: 'Ricomposizione corporea',
  primaryAudience: 'Donne 30-50 anni',
  secondaryAudience: 'Uomini 25-40 anni',
  positioning: 'Personal trainer',
  tone: 'Premium, educational',
  visualStyle: 'Cinematic premium',
  colors: ['#000000'],
  fonts: ['Inter'],
  forbiddenStyles: ['body shaming'],
  ctaOptions: ['Scrivimi in DM'],
  keywords: ['ricomposizione corporea', 'forza', 'postura'],
  preferredDuration: 20,
  preferredFormats: ['instagram_reel_9:16'],
  isDefault: true,
} as unknown as BrandProfile;

const BRIEF =
  'Crea un Reel di 20 secondi per donne 30-50 sul perché fare troppo cardio non è sempre la ' +
  'soluzione per migliorare la composizione corporea. Tono cinematico e CTA finale: scrivi DIAFRAMMA.';

function contextFor(overrides: Partial<Workflow> = {}, priorContent: AgentContext['priorContent'] = []): AgentContext {
  const workflow = {
    id: 'wf-1',
    brief: BRIEF,
    durationSec: 20,
    aspectRatio: '9:16',
    referenceMedia: [],
    targetOverride: null,
    ctaOverride: null,
    goal: null,
    ...overrides,
  } as unknown as Workflow;

  return { workflow, brand, priorContent };
}

beforeEach(() => {
  resetEnvCache();
});

describe('drivers', () => {
  it('default to fully local, so nothing reaches a third-party service', () => {
    expect(drivers()).toMatchObject({
      agents: 'local',
      generation: 'local',
      storage: 'local',
      queue: 'inline',
      qc: 'local',
    });
    expect(fullyOffline()).toBe(true);
  });
});

describe('brief parsing', () => {
  it('reads the duration out of the brief', () => {
    expect(resolveDuration(BRIEF, 15)).toBe(20);
    expect(resolveDuration('Un Reel senza durata', 15)).toBe(15);
    expect(resolveDuration('Un Reel di 900 secondi', 15)).toBe(15);
  });

  it('lifts the CTA keyword out of the brief', () => {
    expect(resolveCta(BRIEF, brand)).toBe('Scrivi DIAFRAMMA in DM');
    expect(resolveCta('Nessuna call to action', brand)).toBe('Scrivimi in DM');
    expect(resolveCta(BRIEF, brand, 'Prenota una call')).toBe('Prenota una call');
  });

  it('derives a topic from the brief subject', () => {
    expect(resolveTopic(BRIEF).toLowerCase()).toContain('cardio');
  });
});

describe('audience selection', () => {
  it('uses the primary audience when the brief names it', () => {
    expect(resolveAudience(BRIEF, brand)).toBe('Donne 30-50 anni');
  });

  it('switches to the secondary audience when only that one is named', () => {
    expect(resolveAudience('Un Reel per uomini 25-40 sulla forza', brand)).toBe('Uomini 25-40 anni');
  });

  it('falls back to the primary audience when the brief names neither', () => {
    expect(resolveAudience('Un Reel sulla postura', brand)).toBe('Donne 30-50 anni');
  });

  it('never merges the two audiences', () => {
    const audience = resolveAudience('Un Reel per tutti', brand);
    expect(audience === brand.primaryAudience || audience === brand.secondaryAudience).toBe(true);
  });

  it('honours an explicit override', () => {
    expect(resolveAudience(BRIEF, brand, 'Atleti master')).toBe('Atleti master');
  });
});

describe('local agents', () => {
  it('produces a strategy matching the published contract', () => {
    const { data, costUsd } = localStrategy(contextFor());
    expect(() => strategySchema.parse(data)).not.toThrow();
    expect(data.cta).toBe('Scrivi DIAFRAMMA in DM');
    expect(costUsd).toBe(0);
  });

  it('is deterministic for the same brief', () => {
    expect(localStrategy(contextFor()).data).toEqual(localStrategy(contextFor()).data);
  });

  it('shifts the angle when the topic was already covered', () => {
    const strategy = localStrategy(contextFor()).data;
    const repeated = localStrategy(
      contextFor({}, [{ title: 'Old', topic: strategy.topic, hook: strategy.hook, publishedAt: null }]),
    ).data;

    expect(repeated.angle).not.toBe(strategy.angle);
  });

  it('writes a script whose scenes add up to the requested duration', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const { data: script } = localScript(context, strategy);

    expect(() => scriptSchema.parse(script)).not.toThrow();
    const total = script.scenes.reduce((sum, scene) => sum + scene.duration, 0);
    expect(total).toBe(20);
    expect(script.scenes[0].duration).toBeLessThanOrEqual(3);
    expect(script.scenes.at(-1)!.voiceover).toContain('DIAFRAMMA');
  });

  it('keeps the total right for an odd duration too', () => {
    const context = contextFor({ durationSec: 17, brief: 'Un Reel sulla postura per donne 30-50.' } as Partial<Workflow>);
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;

    expect(script.scenes.reduce((sum, s) => sum + s.duration, 0)).toBe(17);
    expect(script.scenes.every((s) => s.duration > 0)).toBe(true);
  });

  it('builds one shot per scene, all on the workflow aspect ratio', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;
    const { data: storyboard } = localStoryboard(context, strategy, script);

    expect(() => storyboardSchema.parse(storyboard)).not.toThrow();
    expect(storyboard.shots).toHaveLength(script.scenes.length);
    expect(storyboard.shots.every((shot) => shot.aspect_ratio === '9:16')).toBe(true);
  });

  it('bans on-screen text and the brand forbidden styles in every negative prompt', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;
    const { shots } = localStoryboard(context, strategy, script).data;

    for (const shot of shots) {
      expect(shot.negative_prompt).toContain('text');
      expect(shot.negative_prompt).toContain('body shaming');
    }
  });

  it('repeats one subject description across shots for consistency', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;
    const { shots } = localStoryboard(context, strategy, script).data;

    const subject = 'charcoal training top';
    expect(shots.every((shot) => shot.prompt.includes(subject))).toBe(true);
  });

  it('writes a caption with the CTA and no duplicated hashtag', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;
    const { caption } = localStoryboard(context, strategy, script).data;

    expect(caption).toContain('DIAFRAMMA');
    const hashtags = caption.match(/#[\wàèéìòù]+/g) ?? [];
    expect(new Set(hashtags).size).toBe(hashtags.length);
  });

  it('marks its QC verdict as simulated rather than claiming a real review', () => {
    const context = contextFor();
    const strategy = localStrategy(context).data;
    const script = localScript(context, strategy).data;
    const { shots } = localStoryboard(context, strategy, script).data;

    const { data } = localQcVision(shots[0]);
    expect(data.notes.toLowerCase()).toContain('simulated');
    expect(data.score).toBeGreaterThan(0);
    expect(data.score).toBeLessThanOrEqual(1);
  });
});
