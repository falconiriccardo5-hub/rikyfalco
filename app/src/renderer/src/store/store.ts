// Stato dell'applicazione (zustand): progetto, workflow con annulla/ripeti,
// stato dei nodi, log, anteprima e notifiche.

import { create } from 'zustand'
import { NODE_DEFS } from '@shared/nodeDefs'
import { childrenOf, createNode, newId, parentOf, validateConnection } from '@shared/graph'
import type {
  AppSettings, EngineEvent, LogEntry, MediaItem, NodeRuntime, NodeSettings, NodeType, ProjectDoc,
  Timeline, ToolStatus, Workflow, WorkflowNode
} from '@shared/types'
import { api, basename } from '../lib/util'

export interface PreviewState {
  kind: 'source' | 'render' | 'export'
  path: string
  label: string
  nodeId?: string
  /** Per le anteprime parziali: istante del video finale da cui parte il file. */
  fromOutput?: number
  stamp: number
}

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
}

interface DownloadState {
  received: number
  total: number
  error?: string
  done?: boolean
}

interface State {
  dir: string | null
  project: ProjectDoc | null
  runtimes: Record<string, NodeRuntime>
  logs: LogEntry[]
  selected: string | null
  running: boolean
  settings: AppSettings | null
  tools: ToolStatus | null
  past: Workflow[]
  future: Workflow[]
  lastCoalesce: { key: string; time: number } | null
  preview: PreviewState | null
  lastResult: PreviewState | null
  previewBusy: { progress: number; message?: string } | null
  audioAB: { original: string; processed: string; nodeId: string } | null
  playerTime: number
  seekRequest: { time: number; stamp: number } | null
  outputs: Record<string, Timeline | null>
  toasts: Toast[]
  downloads: Record<string, DownloadState>
  settingsOpen: boolean
  saveState: 'saved' | 'saving' | 'dirty'
}

const initial: State = {
  dir: null,
  project: null,
  runtimes: {},
  logs: [],
  selected: null,
  running: false,
  settings: null,
  tools: null,
  past: [],
  future: [],
  lastCoalesce: null,
  preview: null,
  lastResult: null,
  previewBusy: null,
  audioAB: null,
  playerTime: 0,
  seekRequest: null,
  outputs: {},
  toasts: [],
  downloads: {},
  settingsOpen: false,
  saveState: 'saved'
}

export const useStore = create<State>(() => initial)
const set = useStore.setState
const get = useStore.getState

// ------------------------------------------------------------ notifiche

let toastId = 0
export function toast(text: string, kind: Toast['kind'] = 'info'): void {
  const id = ++toastId
  set((s) => ({ toasts: [...s.toasts, { id, kind, text }].slice(-5) }))
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 8000 : 4500)
}

function errMsg(e: unknown): string {
  const m = (e as Error)?.message ?? String(e)
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

// ------------------------------------------------------------ salvataggio automatico

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(): void {
  set({ saveState: 'dirty' })
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveNow(), 700)
}

export async function saveNow(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  const { dir, project } = get()
  if (!dir || !project) return
  set({ saveState: 'saving' })
  try {
    await api.saveProject(dir, project)
    set({ saveState: 'saved' })
  } catch (e) {
    set({ saveState: 'dirty' })
    toast(`Salvataggio non riuscito: ${errMsg(e)}`, 'error')
  }
}

// ------------------------------------------------------------ impostazioni

export async function loadSettings(): Promise<void> {
  const settings = await api.getSettings()
  set({ settings })
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const settings = await api.setSettings(patch)
  set({ settings })
}

export async function refreshTools(): Promise<ToolStatus> {
  const tools = await api.checkTools()
  set({ tools })
  return tools
}

// ------------------------------------------------------------ progetti

function applyOpened(r: { dir: string; project: ProjectDoc; runtimes: NodeRuntime[] }): void {
  const runtimes: Record<string, NodeRuntime> = {}
  r.runtimes.forEach((rt) => (runtimes[rt.nodeId] = rt))
  set({
    ...initial,
    settings: get().settings,
    tools: get().tools,
    dir: r.dir,
    project: r.project,
    runtimes,
    selected: r.project.workflow.nodes[0]?.id ?? null,
    logs: [{ time: Date.now(), level: 'info', message: `Progetto aperto: ${r.dir}` }]
  })
  void loadSourcePreview()
  void loadSettings()
  const missing = r.project.media.filter((m) => m.missing)
  if (missing.length) toast(`${missing.length} file del progetto non trovati: ricollegali dall'area Progetto.`, 'error')
}

export async function createProject(parentDir: string, name: string, templateId?: string): Promise<void> {
  try {
    applyOpened(await api.createProject(parentDir, name, templateId))
    toast('Progetto creato. Importa un video per iniziare.', 'success')
  } catch (e) {
    toast(`Impossibile creare il progetto: ${errMsg(e)}`, 'error')
  }
}

export async function openProject(dir: string): Promise<void> {
  try {
    applyOpened(await api.openProject(dir))
  } catch (e) {
    toast(errMsg(e), 'error')
  }
}

export async function closeProject(): Promise<void> {
  await saveNow()
  set({ ...initial, settings: get().settings, tools: get().tools })
}

// ------------------------------------------------------------ workflow con annulla/ripeti

function setWorkflow(mut: (wf: Workflow) => Workflow, opts: { history?: boolean; coalesce?: string } = {}): void {
  const s = get()
  if (!s.project) return
  const cur = s.project.workflow
  const next = mut(cur)
  if (next === cur) return
  let past = s.past
  let future = s.future
  let lastCoalesce = s.lastCoalesce
  if (opts.history !== false) {
    const now = Date.now()
    const same = opts.coalesce && lastCoalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.time < 900
    if (!same) past = [...past, cur].slice(-120)
    future = []
    lastCoalesce = opts.coalesce ? { key: opts.coalesce, time: now } : null
  }
  set({ project: { ...s.project, workflow: next }, past, future, lastCoalesce })
  scheduleSave()
}

export function undo(): void {
  const s = get()
  if (!s.project || !s.past.length) return
  const prev = s.past[s.past.length - 1]
  set({
    project: { ...s.project, workflow: prev },
    past: s.past.slice(0, -1),
    future: [s.project.workflow, ...s.future].slice(0, 120),
    lastCoalesce: null
  })
  scheduleSave()
}

export function redo(): void {
  const s = get()
  if (!s.project || !s.future.length) return
  const next = s.future[0]
  set({
    project: { ...s.project, workflow: next },
    past: [...s.past, s.project.workflow],
    future: s.future.slice(1),
    lastCoalesce: null
  })
  scheduleSave()
}

export function updateNodeSettings(id: string, patch: NodeSettings, coalesce?: string): void {
  setWorkflow(
    (wf) => ({ ...wf, nodes: wf.nodes.map((n) => (n.id === id ? { ...n, settings: { ...n.settings, ...patch } } : n)) }),
    { coalesce: coalesce ?? `${id}:${Object.keys(patch).join(',')}` }
  )
}

export function patchNode(id: string, patch: Partial<WorkflowNode>, coalesce?: string): void {
  setWorkflow((wf) => ({ ...wf, nodes: wf.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }), { coalesce })
}

export function selectNode(id: string | null): void {
  if (get().selected !== id) set({ selected: id })
}

/** Aggiunge un nodo; se è selezionato un nodo, lo inserisce subito dopo di esso nella catena. */
export function addNode(type: NodeType, position?: { x: number; y: number }, after?: string | null): string | null {
  const s = get()
  if (!s.project) return null
  const wf = s.project.workflow
  const anchorId = after === undefined ? s.selected : after
  const anchor = anchorId ? wf.nodes.find((n) => n.id === anchorId) : undefined
  const pos = position ?? (anchor ? { x: anchor.position.x + 40, y: anchor.position.y + 150 } : { x: 80 + wf.nodes.length * 20, y: 80 + wf.nodes.length * 20 })
  const node = createNode(type, pos)
  if (type === 'import') {
    const v = s.project.media.find((m) => m.kind === 'video' && !m.missing)
    if (v) node.settings.mediaId = v.id
  }
  setWorkflow((w) => {
    let edges = w.edges
    const nodes = [...w.nodes, node]
    const def = NODE_DEFS[type]
    if (anchor && def.hasInput && NODE_DEFS[anchor.type].hasOutput) {
      const outs = edges.filter((e) => e.source === anchor.id)
      edges = edges.filter((e) => e.source !== anchor.id)
      edges.push({ id: newId('e'), source: anchor.id, target: node.id })
      if (def.hasOutput) outs.forEach((e) => edges.push({ id: newId('e'), source: node.id, target: e.target }))
      else edges.push(...outs)
    }
    return { nodes, edges }
  })
  set({ selected: node.id })
  return node.id
}

/** Elimina i nodi ricollegando la catena (genitore → figli) quando possibile. */
export function deleteNodes(ids: string[]): void {
  if (!ids.length) return
  setWorkflow((wf) => {
    let cur = wf
    for (const id of ids) {
      const parent = parentOf(cur, id)
      const kids = childrenOf(cur, id)
      let edges = cur.edges.filter((e) => e.source !== id && e.target !== id)
      if (parent && !ids.includes(parent.id) && NODE_DEFS[parent.type].hasOutput) {
        for (const k of kids) if (!ids.includes(k.id)) edges.push({ id: newId('e'), source: parent.id, target: k.id })
      }
      cur = { nodes: cur.nodes.filter((n) => n.id !== id), edges }
    }
    return cur
  })
  if (ids.includes(get().selected ?? '')) set({ selected: null })
}

export function deleteEdges(ids: string[]): void {
  setWorkflow((wf) => ({ ...wf, edges: wf.edges.filter((e) => !ids.includes(e.id)) }))
}

export function duplicateNode(id: string): void {
  const s = get()
  const n = s.project?.workflow.nodes.find((x) => x.id === id)
  if (!n) return
  const copy: WorkflowNode = {
    ...JSON.parse(JSON.stringify(n)),
    id: newId(n.type.slice(0, 3)),
    label: (n.label || NODE_DEFS[n.type].name) + ' (copia)',
    position: { x: n.position.x + 40, y: n.position.y + 120 }
  }
  setWorkflow((wf) => ({ ...wf, nodes: [...wf.nodes, copy] }))
  set({ selected: copy.id })
}

export function connect(source: string, target: string): void {
  const s = get()
  if (!s.project) return
  const wf = s.project.workflow
  // Un nuovo collegamento sostituisce l'ingresso esistente del nodo di destinazione.
  const without = { ...wf, edges: wf.edges.filter((e) => e.target !== target) }
  const err = validateConnection(without, source, target)
  if (err) {
    toast(err, 'error')
    return
  }
  setWorkflow(() => ({ ...without, edges: [...without.edges, { id: newId('e'), source, target }] }))
}

export function setPositions(pos: { id: string; position: { x: number; y: number } }[]): void {
  setWorkflow((wf) => ({
    ...wf,
    nodes: wf.nodes.map((n) => {
      const p = pos.find((x) => x.id === n.id)
      return p ? { ...n, position: p.position } : n
    })
  }))
}

/** Sposta un nodo prima (-1) o dopo (+1) nella catena lineare. */
export function moveInChain(id: string, dir: -1 | 1): void {
  const s = get()
  if (!s.project) return
  const wf = s.project.workflow
  const a = dir === -1 ? parentOf(wf, id) : wf.nodes.find((n) => n.id === id)
  const b = dir === -1 ? wf.nodes.find((n) => n.id === id) : childrenOf(wf, id)[0]
  if (!a || !b) return toast('Non c\'è un nodo con cui scambiare la posizione.', 'info')
  // catena: pa → a → b → kids(b)  ⇒  pa → b → a → kids(b)
  if (!NODE_DEFS[a.type].hasInput || !NODE_DEFS[b.type].hasOutput) return toast('Questo spostamento non è possibile per il tipo di nodo.', 'info')
  if (childrenOf(wf, a.id).length !== 1) return toast('Il nodo ha più uscite: ricollega manualmente i collegamenti.', 'info')
  const pa = parentOf(wf, a.id)
  const kids = childrenOf(wf, b.id)
  setWorkflow((w) => {
    const touch = new Set([a.id, b.id])
    let edges = w.edges.filter((e) => !touch.has(e.source) && !touch.has(e.target))
    if (pa) edges.push({ id: newId('e'), source: pa.id, target: b.id })
    edges.push({ id: newId('e'), source: b.id, target: a.id })
    kids.forEach((k) => edges.push({ id: newId('e'), source: a.id, target: k.id }))
    edges = edges.filter((e, i, arr) => arr.findIndex((x) => x.source === e.source && x.target === e.target) === i)
    const pA = a.position
    const pB = b.position
    const nodes = w.nodes.map((n) => (n.id === a.id ? { ...n, position: pB } : n.id === b.id ? { ...n, position: pA } : n))
    return { nodes, edges }
  })
}

export function loadWorkflow(wf: Workflow): void {
  setWorkflow(() => wf)
}

// ------------------------------------------------------------ media

export async function importMedia(paths: string[]): Promise<void> {
  const s = get()
  if (!s.project || !paths.length) return
  const known = new Set(s.project.media.map((m) => m.path))
  const fresh = paths.filter((p) => !known.has(p))
  if (!fresh.length) return toast('File già presenti nel progetto.')
  const r = await api.importMedia(fresh)
  r.errors.forEach((e) => toast(e, 'error'))
  if (!r.items.length) return
  const p = get().project!
  set({ project: { ...p, media: [...p.media, ...r.items] } })
  scheduleSave()
  toast(`${r.items.length} file importati`, 'success')
  // Il primo video importato diventa la sorgente del nodo "Importa video".
  const video = r.items.find((m) => m.kind === 'video')
  const imp = p.workflow.nodes.find((n) => n.type === 'import' && !n.settings.mediaId)
  if (video && imp) {
    updateNodeSettings(imp.id, { mediaId: video.id })
    void loadSourcePreview()
  }
  const music = r.items.find((m) => m.kind === 'audio')
  const mus = p.workflow.nodes.find((n) => n.type === 'music' && !n.settings.mediaId)
  if (music && mus) updateNodeSettings(mus.id, { mediaId: music.id })
}

export function removeMedia(id: string): void {
  const p = get().project
  if (!p) return
  set({ project: { ...p, media: p.media.filter((m) => m.id !== id) } })
  scheduleSave()
}

export async function relinkMedia(id: string): Promise<void> {
  const p = get().project
  const m = p?.media.find((x) => x.id === id)
  if (!p || !m) return
  const files = await api.openFiles({ title: `Ricollega ${m.name}`, multi: false })
  if (!files[0]) return
  const r = await api.importMedia([files[0]])
  if (!r.items[0]) return r.errors.forEach((e) => toast(e, 'error'))
  const item: MediaItem = { ...r.items[0], id: m.id }
  set({ project: { ...p, media: p.media.map((x) => (x.id === id ? item : x)) } })
  scheduleSave()
  toast(`${basename(files[0])} ricollegato`, 'success')
}

// ------------------------------------------------------------ esecuzione

export async function runNodes(targets?: string[], force = false): Promise<void> {
  const s = get()
  if (!s.dir || !s.project) return
  if (s.running) return toast('Un\'elaborazione è già in corso.', 'info')
  await saveNow()
  set({ running: true })
  try {
    const ok = await api.run({ projectDir: s.dir, project: get().project!, targets, force })
    if (ok && targets?.length === 1) {
      const n = get().project?.workflow.nodes.find((x) => x.id === targets[0])
      if (n?.type === 'export') toast('Esportazione completata', 'success')
    }
  } catch (e) {
    toast(errMsg(e), 'error')
  } finally {
    set({ running: false })
  }
}

export function cancelRun(): void {
  void api.cancel()
}

export async function renderPreview(nodeId: string, seconds: number, fromSource?: number): Promise<void> {
  const s = get()
  if (!s.dir || !s.project) return
  if (s.running) return toast('Un\'elaborazione è già in corso.', 'info')
  await saveNow()
  set({ running: true, previewBusy: { progress: 0, message: 'Preparazione anteprima' } })
  try {
    const r = await api.preview({ projectDir: s.dir, project: get().project!, nodeId, seconds, fromSource })
    const n = get().project?.workflow.nodes.find((x) => x.id === nodeId)
    const pv: PreviewState = {
      kind: 'render',
      path: r.path,
      nodeId,
      fromOutput: r.fromOutput,
      label: `Anteprima · ${n ? n.label || NODE_DEFS[n.type].name : ''}`,
      stamp: Date.now()
    }
    set({ preview: pv, lastResult: pv })
  } catch (e) {
    toast(errMsg(e), 'error')
  } finally {
    set({ running: false, previewBusy: null })
  }
}

export async function audioPreview(nodeId: string, seconds = 15): Promise<void> {
  const s = get()
  if (!s.dir || !s.project) return
  if (s.running) return toast('Un\'elaborazione è già in corso.', 'info')
  await saveNow()
  set({ running: true, previewBusy: { progress: 0, message: 'Anteprima audio' } })
  try {
    const r = await api.audioPreview({ projectDir: s.dir, project: get().project!, nodeId, fromSource: get().playerTime, seconds })
    set({ audioAB: { ...r, nodeId } })
  } catch (e) {
    toast(errMsg(e), 'error')
  } finally {
    set({ running: false, previewBusy: null })
  }
}

/** Timeline in uscita da un nodo (con cache locale). */
export async function fetchOutput(nodeId: string, force = false): Promise<Timeline | null> {
  const s = get()
  if (!s.dir) return null
  if (!force && nodeId in s.outputs) return s.outputs[nodeId]
  const tl = await api.nodeOutput(s.dir, nodeId)
  set((st) => ({ outputs: { ...st.outputs, [nodeId]: tl } }))
  return tl
}

export async function loadSourcePreview(): Promise<void> {
  const s = get()
  if (!s.project) return
  const imp = s.project.workflow.nodes.find((n) => n.type === 'import')
  let path: string | undefined
  if (imp) {
    const tl = await fetchOutput(imp.id, true)
    if (tl && tl.source.path === s.project.media.find((m) => m.id === imp.settings.mediaId)?.path) path = tl.previewPath
  }
  if (!path) {
    const mid = imp?.settings.mediaId as string | undefined
    const m = s.project.media.find((x) => x.id === mid) ?? s.project.media.find((x) => x.kind === 'video')
    path = m && !m.missing ? m.path : undefined
  }
  if (path) set({ preview: { kind: 'source', path, label: 'Originale', stamp: Date.now() } })
}

export function showFileInPreview(path: string, label: string, nodeId?: string): void {
  const pv: PreviewState = { kind: 'export', path, label, nodeId, fromOutput: 0, stamp: Date.now() }
  set({ preview: pv, lastResult: pv })
}

export function showLastResult(): void {
  const r = get().lastResult
  if (r) set({ preview: { ...r, stamp: Date.now() } })
}

export function seekSource(time: number): void {
  set({ seekRequest: { time: Math.max(0, time), stamp: Date.now() } })
}

export function setPlayerTime(t: number): void {
  set({ playerTime: t })
}

// ------------------------------------------------------------ eventi dal motore

export function handleEngineEvent(e: EngineEvent): void {
  switch (e.kind) {
    case 'status': {
      const rt = e.runtime
      set((s) => {
        const prev = s.runtimes[rt.nodeId]
        const merged: NodeRuntime =
          rt.status === 'running' || rt.status === 'queued'
            ? { ...prev, ...rt, error: undefined, progress: rt.status === 'running' ? 0 : undefined }
            : { ...prev, ...rt, progress: undefined }
        const outputs = { ...s.outputs }
        if (rt.status === 'done' || rt.status === 'error') delete outputs[rt.nodeId]
        return { runtimes: { ...s.runtimes, [rt.nodeId]: merged }, outputs }
      })
      if (rt.status === 'done') {
        const n = get().project?.workflow.nodes.find((x) => x.id === rt.nodeId)
        if (n?.type === 'import') void loadSourcePreview()
      }
      break
    }
    case 'progress':
      if (e.nodeId === 'preview') set({ previewBusy: { progress: e.progress, message: e.message } })
      else
        set((s) => ({
          runtimes: { ...s.runtimes, [e.nodeId]: { ...(s.runtimes[e.nodeId] ?? { nodeId: e.nodeId, status: 'running' }), progress: e.progress, message: e.message } }
        }))
      break
    case 'log':
      set((s) => ({ logs: [...s.logs, e.entry].slice(-3000) }))
      break
    case 'run-finished':
      if (e.cancelled) toast('Elaborazione annullata', 'info')
      break
    case 'download-progress':
      set((s) => ({ downloads: { ...s.downloads, [e.id]: { received: e.received, total: e.total, error: e.error, done: e.done } } }))
      break
  }
}

export function clearLogs(): void {
  set({ logs: [] })
}

export function openSettings(open = true): void {
  set({ settingsOpen: open })
}

export { errMsg }
