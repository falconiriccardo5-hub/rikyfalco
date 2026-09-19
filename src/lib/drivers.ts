import { env } from './env';

/**
 * Which implementation backs each external capability.
 *
 * Everything defaults to a local driver: the dashboard and the full agent
 * pipeline run with no outbound connection to OpenAI, Higgsfield, S3 or Redis.
 * The live adapters are already written and are selected purely by env, so
 * wiring the real services later is configuration, not a rewrite.
 */
export interface DriverSet {
  agents: 'local' | 'openai';
  generation: 'local' | 'higgsfield';
  storage: 'local' | 's3';
  queue: 'inline' | 'redis';
  qc: 'local' | 'ffmpeg';
}

export function drivers(): DriverSet {
  const e = env();
  return {
    agents: e.AGENTS_DRIVER,
    generation: e.GENERATION_DRIVER,
    storage: e.STORAGE_DRIVER,
    queue: e.QUEUE_DRIVER,
    qc: e.QC_DRIVER,
  };
}

/** True when nothing in this process will talk to a third-party service. */
export function fullyOffline(): boolean {
  const d = drivers();
  return (
    d.agents === 'local' &&
    d.generation === 'local' &&
    d.storage === 'local' &&
    d.qc === 'local'
  );
}

export interface DriverDescription {
  key: keyof DriverSet;
  label: string;
  value: string;
  live: boolean;
  detail: string;
}

/** Rendered in the dashboard so the active mode is never a guess. */
export function describeDrivers(): DriverDescription[] {
  const d = drivers();
  return [
    {
      key: 'agents',
      label: 'Agents',
      value: d.agents,
      live: d.agents === 'openai',
      detail:
        d.agents === 'openai'
          ? 'Strategy, script, storyboard and QC come from the OpenAI API.'
          : 'Deterministic local agents — no API key needed, no request leaves the machine.',
    },
    {
      key: 'generation',
      label: 'Generation',
      value: d.generation,
      live: d.generation === 'higgsfield',
      detail:
        d.generation === 'higgsfield'
          ? 'Shots are rendered by the Higgsfield API.'
          : 'Shots are simulated locally: routing and job records are real, no media is bought.',
    },
    {
      key: 'storage',
      label: 'Storage',
      value: d.storage,
      live: d.storage === 's3',
      detail:
        d.storage === 's3'
          ? 'Assets live in the configured S3-compatible bucket.'
          : 'Assets live on the local filesystem and are served through the app.',
    },
    {
      key: 'queue',
      label: 'Queue',
      value: d.queue,
      live: d.queue === 'redis',
      detail:
        d.queue === 'redis'
          ? 'Work is dispatched to the BullMQ worker.'
          : 'Work runs inline in the server process — no Redis required.',
    },
    {
      key: 'qc',
      label: 'Quality control',
      value: d.qc,
      live: d.qc === 'ffmpeg',
      detail:
        d.qc === 'ffmpeg'
          ? 'ffprobe measures the file and a vision model reviews extracted frames.'
          : 'QC is simulated against the shot spec — no ffmpeg binary, no vision call.',
    },
  ];
}
