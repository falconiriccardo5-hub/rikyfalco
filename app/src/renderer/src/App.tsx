import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { LogPanel } from './components/LogPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ProjectPanel } from './components/ProjectPanel'
import { PropertiesPanel } from './components/PropertiesPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { Toasts } from './components/Toasts'
import { TopBar } from './components/TopBar'
import { Welcome } from './components/Welcome'
import { WorkflowEditor } from './components/WorkflowEditor'
import { useResizable } from './lib/useResizable'
import { api, clsx } from './lib/util'
import {
  deleteNodes, duplicateNode, handleEngineEvent, loadSettings, redo, refreshTools, runNodes, saveNow, undo, useStore
} from './store/store'

function useTheme(): void {
  const theme = useStore((s) => s.settings?.theme ?? 'dark')
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = (e: MediaQueryListEvent): void => setSysDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  const dark = theme === 'system' ? sysDark : theme === 'dark'
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    void api.setWindowTheme(dark)
  }, [dark])
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

function useShortcuts(): void {
  useEffect(() => {
    const fn = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!useStore.getState().project) return
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveNow()
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        void runNodes()
        return
      }
      if (isTyping(e)) return
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const sel = useStore.getState().selected
        if (sel) duplicateNode(sel)
      } else if (e.key === 'Delete' && !document.querySelector('.react-flow__node.selected, .react-flow__edge.selected')) {
        const sel = useStore.getState().selected
        if (sel) deleteNodes([sel])
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])
}

export default function App(): React.JSX.Element {
  const project = useStore((s) => s.project)
  useTheme()
  useShortcuts()
  useEffect(() => {
    void loadSettings()
    void refreshTools()
    return api.onEvent(handleEngineEvent)
  }, [])
  useEffect(() => {
    const fn = (): void => void saveNow()
    window.addEventListener('beforeunload', fn)
    return () => window.removeEventListener('beforeunload', fn)
  }, [])

  return (
    <div className="app">
      <TopBar />
      {project ? <Workspace /> : <Welcome />}
      <SettingsDialog />
      <Toasts />
    </div>
  )
}

function Workspace(): React.JSX.Element {
  const [left, onLeft, aL] = useResizable('left', 268, 210, 420, 'x')
  const [right, onRight, aR] = useResizable('right', 380, 300, 640, 'x', true)
  const [bottom, onBottom, aB] = useResizable('bottom', 330, 160, 700, 'y', true)
  const [logW, onLog, aLog] = useResizable('logw', 360, 220, 900, 'x', true)
  return (
    <ReactFlowProvider>
      <div className="workspace">
        <div className="col" style={{ width: left }}>
          <ProjectPanel />
        </div>
        <div className={clsx('resizer v', aL && 'active')} onMouseDown={onLeft} />
        <div className="col grow" style={{ gap: 8 }}>
          <div className="panel grow">
            <WorkflowEditor />
          </div>
          <div className={clsx('resizer h', aB && 'active')} onMouseDown={onBottom} />
          <div className="row" style={{ height: bottom, gap: 8, alignItems: 'stretch', flexShrink: 0 }}>
            <div className="panel grow">
              <PreviewPanel />
            </div>
            <div className={clsx('resizer v', aLog && 'active')} onMouseDown={onLog} />
            <div className="panel" style={{ width: logW, flexShrink: 0 }}>
              <LogPanel />
            </div>
          </div>
        </div>
        <div className={clsx('resizer v', aR && 'active')} onMouseDown={onRight} />
        <div className="col" style={{ width: right }}>
          <PropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
