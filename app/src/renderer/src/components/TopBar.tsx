import { Check, Cloud, Download, FolderOpen, Moon, Play, Redo2, Settings, Square, Sun, Undo2, Workflow as WfIcon } from 'lucide-react'
import { useHashes } from '../store/hooks'
import { cancelRun, closeProject, openSettings, redo, runNodes, undo, updateSettings, useStore } from '../store/store'
import { clsx, displayStatus } from '../lib/util'

export function TopBar(): React.JSX.Element {
  const project = useStore((s) => s.project)
  const running = useStore((s) => s.running)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const theme = useStore((s) => s.settings?.theme ?? 'dark')
  const saveState = useStore((s) => s.saveState)
  const runtimes = useStore((s) => s.runtimes)
  const hashes = useHashes()
  const mac = navigator.platform.toLowerCase().includes('mac')

  const nodes = project?.workflow.nodes ?? []
  const statuses = nodes.map((n) => displayStatus(runtimes[n.id], hashes.get(n.id)))
  const done = statuses.filter((s) => s === 'done').length
  const errors = statuses.filter((s) => s === 'error').length
  const exportNodes = nodes.filter((n) => n.type === 'export')

  return (
    <div className={clsx('topbar', mac && 'mac')}>
      <div className="brand">
        <div className="brand-mark">
          <WfIcon size={13} strokeWidth={2.5} />
        </div>
        FlowCut
      </div>
      {project && (
        <>
          <div className="sep" />
          <span className="project-name ellipsis" title={useStore.getState().dir ?? ''}>
            {project.name}
          </span>
          <span className="dim tiny row" style={{ gap: 4 }} title="Il progetto viene salvato automaticamente">
            {saveState === 'saved' ? <Check size={12} /> : <Cloud size={12} />}
            {saveState === 'saved' ? 'Salvato' : saveState === 'saving' ? 'Salvataggio…' : 'Modificato'}
          </span>
          <div className="sep" />
          <button className="btn ghost icon sm" disabled={!canUndo} onClick={undo} title="Annulla (Ctrl+Z)">
            <Undo2 size={15} />
          </button>
          <button className="btn ghost icon sm" disabled={!canRedo} onClick={redo} title="Ripeti (Ctrl+Y)">
            <Redo2 size={15} />
          </button>
        </>
      )}
      <div className="drag" />
      {project && (
        <>
          <span className="small muted">
            {done}/{nodes.length} completati{errors ? <span style={{ color: 'var(--err)' }}> · {errors} errori</span> : null}
          </span>
          {running ? (
            <button className="btn sm danger" onClick={cancelRun} title="Annulla l'elaborazione in corso">
              <Square size={13} fill="currentColor" /> Annulla
            </button>
          ) : (
            <button className="btn sm" onClick={() => runNodes()} title="Esegue tutti i nodi non aggiornati (Ctrl+Invio)">
              <Play size={14} fill="currentColor" /> Esegui workflow
            </button>
          )}
          <button
            className="btn sm primary"
            disabled={running || !exportNodes.length}
            onClick={() => runNodes(exportNodes.map((n) => n.id))}
            title={exportNodes.length ? 'Esegue i nodi di esportazione (e quelli precedenti se necessario)' : 'Aggiungi un nodo Esportazione'}
          >
            <Download size={14} /> Esporta
          </button>
          <div className="sep" />
          <button className="btn ghost icon sm" onClick={() => void closeProject()} title="Chiudi progetto">
            <FolderOpen size={15} />
          </button>
        </>
      )}
      <button
        className="btn ghost icon sm"
        title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
        onClick={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button className="btn ghost icon sm" onClick={() => openSettings(true)} title="Impostazioni e strumenti">
        <Settings size={15} />
      </button>
    </div>
  )
}
