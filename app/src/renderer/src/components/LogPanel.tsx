import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { LogLevel } from '@shared/types'
import { clearLogs, selectNode, useStore } from '../store/store'
import { clsx } from '../lib/util'

const LEVELS: { v: 'all' | LogLevel; label: string }[] = [
  { v: 'all', label: 'Tutto' },
  { v: 'error', label: 'Errori' },
  { v: 'warn', label: 'Avvisi' }
]

export function LogPanel(): React.JSX.Element {
  const logs = useStore((s) => s.logs)
  const [filter, setFilter] = useState<'all' | LogLevel>('all')
  const [debug, setDebug] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const shown = logs.filter((l) => (filter === 'all' ? debug || l.level !== 'debug' : filter === 'warn' ? l.level === 'warn' || l.level === 'error' : l.level === filter))
  useEffect(() => {
    const el = ref.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [shown.length])
  return (
    <>
      <div className="panel-head">
        <span className="title">Log</span>
        <span className="dim tiny">{logs.length}</span>
        <span className="spacer" />
        <div className="seg">
          {LEVELS.map((l) => (
            <button key={l.v} className={clsx(filter === l.v && 'on')} onClick={() => setFilter(l.v)}>
              {l.label}
            </button>
          ))}
        </div>
        <button className={clsx('btn xs', debug && 'active')} onClick={() => setDebug(!debug)} title="Mostra i messaggi di dettaglio (comandi eseguiti)">
          Dettagli
        </button>
        <button className="btn ghost icon xs" title="Pulisci" onClick={clearLogs}>
          <Trash2 size={12} />
        </button>
      </div>
      <div
        className="panel-body log"
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30
        }}
      >
        {shown.map((l, i) => (
          <div
            key={i}
            className={clsx('log-row', `l-${l.level}`, l.nodeId && 'clickable')}
            onClick={() => l.nodeId && selectNode(l.nodeId)}
          >
            <span className="time">{new Date(l.time).toLocaleTimeString()}</span>
            <span className="msg">{l.message}</span>
          </div>
        ))}
        {!shown.length && <div className="empty">Nessun messaggio</div>}
      </div>
    </>
  )
}
