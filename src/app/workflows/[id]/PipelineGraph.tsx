import Link from 'next/link';

export interface PipelineNode {
  key: string;
  label: string;
  state: 'done' | 'running' | 'pending' | 'failed';
  href: string;
}

const MARK: Record<PipelineNode['state'], string> = {
  done: '✓',
  running: '⏳',
  pending: '○',
  failed: '✕',
};

const TONE: Record<PipelineNode['state'], string> = {
  done: 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300',
  running: 'border-amber-900/70 bg-amber-950/30 text-amber-300',
  pending: 'border-line bg-raised/40 text-muted',
  failed: 'border-red-900/70 bg-red-950/40 text-red-300',
};

/** Every node is clickable and jumps to its section (spec §14). */
export function PipelineGraph({ nodes }: { nodes: PipelineNode[] }) {
  return (
    <section className="panel p-5">
      <h2 className="text-sm font-medium text-neutral-300">Pipeline</h2>
      <ol className="mt-4 space-y-1.5">
        {nodes.map((node) => (
          <li key={node.key}>
            <Link
              href={node.href}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs transition-colors hover:border-neutral-600 ${TONE[node.state]}`}
            >
              <span className="tracking-widest">{node.label}</span>
              <span aria-label={node.state}>{MARK[node.state]}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
