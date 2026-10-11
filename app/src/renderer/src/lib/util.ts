import type { NodeRuntime, NodeStatus } from '@shared/types'

export const api = window.api

/** URL riproducibile nell'interfaccia per un file locale (protocollo media://). */
export function mediaUrl(p: string, bust?: number | string): string {
  return `media://file/${encodeURIComponent(p)}${bust !== undefined ? `?v=${bust}` : ''}`
}

export const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: 'In attesa',
  queued: 'In coda',
  running: 'In esecuzione',
  done: 'Completato',
  error: 'Errore',
  stale: 'Da rieseguire',
  cancelled: 'Annullato'
}

/** Stato mostrato: se l'hash attuale differisce da quello dell'ultima esecuzione il nodo è "da rieseguire". */
export function displayStatus(rt: NodeRuntime | undefined, currentHash: string | undefined): NodeStatus {
  if (!rt) return 'idle'
  if (rt.status === 'running' || rt.status === 'queued') return rt.status
  if (rt.hash && currentHash && rt.hash !== currentHash) {
    return rt.status === 'done' || rt.status === 'error' ? 'stale' : rt.status
  }
  return rt.status
}

export function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

export function clsx(...a: (string | false | null | undefined)[]): string {
  return a.filter(Boolean).join(' ')
}

export function round(v: number, d = 2): number {
  const f = 10 ** d
  return Math.round(v * f) / f
}
