import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Eye, Loader2, Play, RotateCcw } from 'lucide-react'
import { NODE_DEFS } from '@shared/nodeDefs'
import { NodeIcon } from '../lib/icons'
import { STATUS_LABEL, clsx } from '../lib/util'
import { useNodeStatus } from '../store/hooks'
import { runNodes, selectNode, useStore } from '../store/store'

function FlowNodeImpl({ id }: NodeProps): React.JSX.Element | null {
  const node = useStore((s) => s.project?.workflow.nodes.find((n) => n.id === id))
  const rt = useStore((s) => s.runtimes[id])
  const selected = useStore((s) => s.selected === id)
  const running = useStore((s) => s.running)
  const status = useNodeStatus(id)
  if (!node) return null
  const def = NODE_DEFS[node.type]
  const progress = rt?.progress ?? 0

  let body: React.ReactNode
  if (status === 'error') body = <span className="fnode-err" title={rt?.error}>{rt?.error}</span>
  else if (status === 'running') body = <span className="ellipsis">{rt?.message || 'Elaborazione…'}</span>
  else if (rt?.result && (status === 'done' || status === 'stale')) body = <span className="ellipsis" title={rt.result.summary}>{rt.result.summary}</span>
  else if (rt?.message && status === 'idle') body = <span className="ellipsis" style={{ color: 'var(--warn)' }}>{rt.message}</span>
  else body = <span className="ellipsis dim" title={def.description}>{def.description}</span>

  return (
    <div className={clsx('fnode', status, selected && 'selected', node.bypass && 'bypass')}>
      {def.hasInput && <Handle type="target" position={Position.Left} />}
      <div className="fnode-head">
        <div className="fnode-icon">
          {status === 'running' ? <Loader2 size={16} className="spin" /> : <NodeIcon type={node.type} />}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="fnode-title ellipsis">{node.label || def.name}</div>
          <div className="fnode-sub">{def.category}</div>
        </div>
      </div>
      <div className="fnode-body">{body}</div>
      {status === 'running' && (
        <div className={clsx('progress', progress <= 0.001 && 'indet')}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="fnode-foot">
        <span className={`badge st-${status}`}>
          <span className="dot" />
          {status === 'running' && progress > 0 ? `${Math.round(progress * 100)}%` : STATUS_LABEL[status]}
        </span>
        <span className="ports ellipsis">{node.bypass ? 'disattivato' : ''}</span>
        {status === 'error' ? (
          <button
            className="btn xs nodrag"
            disabled={running}
            title="Riprova"
            onClick={(e) => {
              e.stopPropagation()
              void runNodes([id], true)
            }}
          >
            <RotateCcw size={11} /> Riprova
          </button>
        ) : (
          <button
            className="btn icon xs nodrag"
            disabled={running}
            title={status === 'done' ? 'Riesegui questo nodo' : 'Esegui fino a questo nodo'}
            onClick={(e) => {
              e.stopPropagation()
              void runNodes([id], status === 'done')
            }}
          >
            <Play size={11} fill="currentColor" />
          </button>
        )}
        <button
          className="btn icon xs nodrag"
          title="Mostra proprietà e risultato"
          onClick={(e) => {
            e.stopPropagation()
            selectNode(id)
          }}
        >
          <Eye size={11} />
        </button>
      </div>
      {def.hasOutput && <Handle type="source" position={Position.Right} />}
    </div>
  )
}

export const FlowNode = memo(FlowNodeImpl)
