import { createHash, randomUUID } from 'node:crypto';

/**
 * Deterministic keys (spec §18). The same logical operation always derives the
 * same key, so a duplicate submission collides on the unique index instead of
 * starting a second billable generation or a second publish.
 */
export function idempotencyKey(...parts: (string | number)[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40);
}

export function workflowKey(workspaceId: string, brief: string, createdAtIso: string): string {
  return idempotencyKey('workflow', workspaceId, brief, createdAtIso);
}

export function generationKey(shotId: string, stage: string, attempt: number): string {
  return idempotencyKey('generation', shotId, stage, attempt);
}

export function publicationKey(workflowId: string, platform: string): string {
  // Deliberately NOT attempt-scoped: one workflow publishes once per platform.
  return idempotencyKey('publication', workflowId, platform);
}

export function newRequestId(): string {
  return randomUUID();
}
