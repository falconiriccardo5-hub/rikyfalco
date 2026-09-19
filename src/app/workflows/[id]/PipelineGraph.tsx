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
  done: 'border-positive/40 bg-positive/10 text-positive',
  running: 'border-warning/40 bg-warning/10 text-warning',
  pending: 'border-line bg-raised/40 text-muted',
  failed: 'border-danger/40 bg-danger/10 text-danger',
};

/** Every node is clickable and jumps to its section (spec §14). */
export function PipelineGraph({ nodes }: { nodes: PipelineNode[] }) {
  return (
    <section className="panel p-5">
      <h2 className="text-sm font-medium text-secondary">Pipeline</h2>
      <ol className="mt-4 space-y-1.5">
        {nodes.map((node) => (
          <li key={node.key}>
            <Link
              href={node.href}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs transition-colors hover:border-hairline ${TONE[node.state]}`}
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
