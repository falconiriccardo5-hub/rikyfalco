import { z } from 'zod';

export const strategySchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  objective: z.string().min(1),
  core_problem: z.string().min(1),
  angle: z.string().min(1),
  hook: z.string().min(1),
  promise: z.string().min(1),
  cta: z.string().min(1),
  retention_strategy: z.string().min(1),
});
export type Strategy = z.infer<typeof strategySchema>;

export const sceneSchema = z.object({
  scene: z.number().int().positive(),
  duration: z.number().positive(),
  voiceover: z.string(),
  visual: z.string().min(1),
  on_screen_text: z.string(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const scriptSchema = z.object({
  duration_seconds: z.number().positive(),
  voiceover: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
});
export type Script = z.infer<typeof scriptSchema>;

export const shotSchema = z.object({
  scene_id: z.string().min(1),
  duration: z.number().positive(),
  visual_goal: z.string().min(1),
  prompt: z.string().min(1),
  camera: z.string(),
  lens: z.string(),
  movement: z.string(),
  lighting: z.string(),
  environment: z.string(),
  style: z.string(),
  negative_prompt: z.string(),
  aspect_ratio: z.string().default('9:16'),
  references: z.array(z.string()).default([]),
});
export type ShotSpec = z.infer<typeof shotSchema>;

export const storyboardSchema = z.object({
  shots: z.array(shotSchema).min(1),
  caption: z.string().min(1),
});
export type Storyboard = z.infer<typeof storyboardSchema>;

export const routingSchema = z.object({
  model: z.string().min(1),
  reason: z.string().min(1),
  estimated_cost: z.string(),
  parameters: z.record(z.unknown()).default({}),
});
export type Routing = z.infer<typeof routingSchema>;

export const qcIssueSchema = z.object({
  kind: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  detail: z.string().min(1),
});
export type QcIssue = z.infer<typeof qcIssueSchema>;

export const qcReportSchema = z.object({
  approved: z.boolean(),
  score: z.number().min(0).max(1),
  issues: z.array(qcIssueSchema).default([]),
  regeneration_required: z.boolean(),
});
export type QcReport = z.infer<typeof qcReportSchema>;

/** Vision-model half of QC; deterministic checks are merged in afterwards. */
export const qcVisionSchema = z.object({
  score: z.number().min(0).max(1),
  issues: z.array(qcIssueSchema).default([]),
  subject_consistent: z.boolean(),
  brand_style_match: z.boolean(),
  safe: z.boolean(),
  notes: z.string().default(''),
});
export type QcVision = z.infer<typeof qcVisionSchema>;
