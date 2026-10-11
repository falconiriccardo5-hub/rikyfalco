// Operazioni sul grafo del workflow: ordinamento, dipendenze, hash per
// capire quali nodi devono essere rieseguiti dopo una modifica.

import { NODE_DEFS, NODE_ORDER, defaultSettings } from './nodeDefs'
import { hashString, stableStringify } from './timeline'
import type { MediaItem, NodeType, Workflow, WorkflowEdge, WorkflowNode } from './types'

/** Incrementare quando cambia la logica di un nodo per invalidare le cache. */
export const ENGINE_VERSION = 3

export function parentOf(wf: Workflow, nodeId: string): WorkflowNode | undefined {
  const e = wf.edges.find((x) => x.target === nodeId)
  return e ? wf.nodes.find((n) => n.id === e.source) : undefined
}

export function childrenOf(wf: Workflow, nodeId: string): WorkflowNode[] {
  return wf.edges
    .filter((e) => e.source === nodeId)
    .map((e) => wf.nodes.find((n) => n.id === e.target))
    .filter((n): n is WorkflowNode => !!n)
}

export function ancestorsOf(wf: Workflow, nodeId: string): WorkflowNode[] {
  const out: WorkflowNode[] = []
  const seen = new Set<string>([nodeId])
  let p = parentOf(wf, nodeId)
  while (p && !seen.has(p.id)) {
    out.unshift(p)
    seen.add(p.id)
    p = parentOf(wf, p.id)
  }
  return out
}

export function descendantsOf(wf: Workflow, nodeId: string): WorkflowNode[] {
  const out: WorkflowNode[] = []
  const seen = new Set<string>()
  const stack = [nodeId]
  while (stack.length) {
    const id = stack.pop()!
    for (const c of childrenOf(wf, id)) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
      stack.push(c.id)
    }
  }
  return out
}

/** Ordine topologico (gli antenati prima dei discendenti). */
export function topoOrder(wf: Workflow): WorkflowNode[] {
  const indeg = new Map<string, number>()
  wf.nodes.forEach((n) => indeg.set(n.id, 0))
  wf.edges.forEach((e) => indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1))
  const queue = wf.nodes.filter((n) => indeg.get(n.id) === 0)
  const out: WorkflowNode[] = []
  while (queue.length) {
    const n = queue.shift()!
    out.push(n)
    for (const c of childrenOf(wf, n.id)) {
      indeg.set(c.id, (indeg.get(c.id) ?? 0) - 1)
      if (indeg.get(c.id) === 0) queue.push(c)
    }
  }
  return out
}

/** Verifica se un nuovo collegamento è valido. Restituisce un messaggio d'errore o null. */
export function validateConnection(wf: Workflow, source: string, target: string): string | null {
  if (source === target) return 'Un nodo non può essere collegato a sé stesso.'
  const s = wf.nodes.find((n) => n.id === source)
  const t = wf.nodes.find((n) => n.id === target)
  if (!s || !t) return 'Nodo inesistente.'
  if (!NODE_DEFS[s.type].hasOutput) return `"${NODE_DEFS[s.type].name}" non ha uscite.`
  if (!NODE_DEFS[t.type].hasInput) return `"${NODE_DEFS[t.type].name}" non accetta ingressi.`
  if (wf.edges.some((e) => e.target === target && e.source !== source))
    return 'Ogni nodo accetta un solo ingresso: rimuovi prima il collegamento esistente.'
  if (target === source || descendantsOf(wf, target).some((d) => d.id === source))
    return 'Il collegamento creerebbe un ciclo.'
  return null
}

function collectMediaRefs(v: unknown, out: Set<string>): void {
  if (!v || typeof v !== 'object') return
  if (Array.isArray(v)) {
    v.forEach((x) => collectMediaRefs(x, out))
    return
  }
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (/mediaid$/i.test(k) && typeof val === 'string' && val) out.add(val)
    else collectMediaRefs(val, out)
  }
}

export type HashEnv = (node: WorkflowNode) => string

/**
 * Hash di ogni nodo: dipende da tipo, impostazioni, file referenziati e
 * hash del nodo genitore. Se cambia un'impostazione cambiano gli hash del nodo
 * e di tutti i discendenti, che risultano quindi "da rieseguire".
 */
export function computeHashes(wf: Workflow, media: MediaItem[], env?: HashEnv): Map<string, string> {
  const out = new Map<string, string>()
  for (const n of topoOrder(wf)) {
    const refs = new Set<string>()
    collectMediaRefs(n.settings, refs)
    const files = [...refs].sort().map((id) => {
      const m = media.find((x) => x.id === id)
      return m ? [m.path, m.info?.sizeBytes ?? 0, m.info?.mtimeMs ?? 0] : [id, 'missing']
    })
    const parent = parentOf(wf, n.id)
    const payload = {
      v: ENGINE_VERSION,
      type: n.type,
      settings: n.settings,
      bypass: !!n.bypass,
      files,
      env: env ? env(n) : '',
      parent: parent ? out.get(parent.id) ?? 'none' : 'root'
    }
    out.set(n.id, hashString(stableStringify(payload)))
  }
  return out
}

let counter = 0
export function newId(prefix = 'n'): string {
  counter = (counter + 1) % 100000
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${counter}`
}

export function createNode(type: NodeType, position: { x: number; y: number }): WorkflowNode {
  return { id: newId(type.slice(0, 3)), type, position, settings: defaultSettings(type) }
}

/** Workflow predefinito: Importazione → … → Esportazione (disposto su due righe). */
export function defaultWorkflow(): Workflow {
  const perRow = 4
  const nodes: WorkflowNode[] = NODE_ORDER.map((type, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    return createNode(type, { x: col * 290, y: row * 200 })
  })
  const edges: WorkflowEdge[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: newId('e'), source: nodes[i].id, target: nodes[i + 1].id })
  }
  return { nodes, edges }
}

/** Parti delle impostazioni dell'app che influenzano il risultato di un nodo. */
export function hashEnvFor(settings: { whisperCliPath: string; whisperModelPath: string; pythonPath: string }): HashEnv {
  return (n) => (n.type === 'transcribe' ? [settings.whisperCliPath, settings.whisperModelPath, settings.pythonPath].join('|') : '')
}
