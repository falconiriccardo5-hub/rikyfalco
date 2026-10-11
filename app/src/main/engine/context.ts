// Contesto passato a ogni nodo durante l'esecuzione.

import fs from 'fs'
import path from 'path'
import type { AppSettings, LogLevel, MediaItem, NodeResult, NodeSettings, Timeline, WorkflowNode } from '../../shared/types'
import type { ToolPaths } from '../ffmpeg/tools'

export interface EngineEnv {
  tools: ToolPaths
  ffmpegMajor: number
  encoders: string[]
  settings: AppSettings
  /** Cartella con risorse dell'app (font, script Python). */
  resourcesDir: string
  /** Cartella dati dell'app (modelli, voci). */
  dataDir: string
}

export interface NodeContext extends EngineEnv {
  projectDir: string
  workDir: string
  nodeDir: string
  media: MediaItem[]
  signal: AbortSignal
  node: WorkflowNode
  log: (level: LogLevel, message: string) => void
  progress: (fraction: number, message?: string) => void
  /** Prepara (una sola volta) i font nella cartella di lavoro e restituisce il percorso relativo da `fromDir`. */
  fontsRelative: (fromDir: string) => string | undefined
  /** Cartella temporanea pulita per un job di rendering. */
  jobDir: (name: string) => string
}

export interface NodeOutput {
  output?: Timeline
  result: NodeResult
}

export interface NodeImpl {
  run(ctx: NodeContext, input: Timeline | null, settings: NodeSettings): Promise<NodeOutput>
}

export function ensureDir(p: string): string {
  fs.mkdirSync(p, { recursive: true })
  return p
}

export function prepareFonts(resourcesDir: string, workDir: string): string | null {
  const src = path.join(resourcesDir, 'fonts')
  if (!fs.existsSync(src)) return null
  const dst = ensureDir(path.join(workDir, 'fonts'))
  for (const f of fs.readdirSync(src)) {
    if (!/\.(ttf|otf)$/i.test(f)) continue
    const d = path.join(dst, f)
    if (!fs.existsSync(d)) fs.copyFileSync(path.join(src, f), d)
  }
  return dst
}

export function mediaPath(media: MediaItem[], id: unknown): string | undefined {
  if (typeof id !== 'string' || !id) return undefined
  return media.find((m) => m.id === id)?.path
}

export function num(v: unknown, d: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return isFinite(n) ? n : d
}

export function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : d
}

export function bool(v: unknown, d = false): boolean {
  return typeof v === 'boolean' ? v : d
}

export function requireInput(input: Timeline | null): Timeline {
  if (!input) throw new Error('Il nodo non ha un ingresso: collegalo dopo "Importa video".')
  return input
}

export function fmtBytes(n: number): string {
  if (n > 1e9) return (n / 1e9).toFixed(2) + ' GB'
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB'
  if (n > 1e3) return (n / 1e3).toFixed(0) + ' KB'
  return n + ' B'
}
