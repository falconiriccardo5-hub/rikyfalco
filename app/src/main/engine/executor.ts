// Motore di esecuzione del workflow. Indipendente da Electron: può essere
// usato anche dai test o da riga di comando.
//
// - Esegue i nodi in ordine topologico.
// - Riutilizza i risultati in cache se l'hash del nodo non è cambiato.
// - Un errore blocca solo i discendenti del nodo che ha fallito.
// - Le operazioni sono annullabili (i processi FFmpeg vengono terminati).

import fs from 'fs'
import path from 'path'
import { NODE_DEFS } from '../../shared/nodeDefs'
import { ancestorsOf, computeHashes, hashEnvFor, parentOf, topoOrder } from '../../shared/graph'
import { computeLayout, mapStartToOutput } from '../../shared/timeline'
import type {
  AudioPreviewRequest, EngineEvent, LogEntry, LogLevel, NodeResult, NodeRuntime, PreviewRequest,
  ProjectDoc, RunRequest, Timeline, WorkflowNode
} from '../../shared/types'
import { NODE_IMPLS } from '../nodes'
import { CancelledError } from '../ffmpeg/run'
import { ensureDir, prepareFonts, str, type EngineEnv, type NodeContext } from './context'
import { canvasFor, runRender, safeUnlink } from './render'

interface CacheEntry {
  hash: string
  status: 'done' | 'error'
  output?: Timeline
  result?: NodeResult
  error?: string
  startedAt?: number
  finishedAt?: number
}

export class Engine {
  private ac: AbortController | null = null
  private busy = false

  constructor(
    private getEnv: () => Promise<EngineEnv>,
    private emit: (e: EngineEvent) => void
  ) {}

  get isBusy(): boolean {
    return this.busy
  }

  cancel(): void {
    this.ac?.abort()
  }

  // ------------------------------------------------------------ percorsi

  static workDir(projectDir: string): string {
    return path.join(projectDir, 'work')
  }

  private cacheFile(projectDir: string, nodeId: string): string {
    return path.join(Engine.workDir(projectDir), 'cache', `${nodeId}.json`)
  }

  readCache(projectDir: string, nodeId: string): CacheEntry | null {
    const f = this.cacheFile(projectDir, nodeId)
    if (!fs.existsSync(f)) return null
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8')) as CacheEntry
    } catch {
      return null
    }
  }

  private writeCache(projectDir: string, nodeId: string, c: CacheEntry): void {
    const f = this.cacheFile(projectDir, nodeId)
    ensureDir(path.dirname(f))
    fs.writeFileSync(f, JSON.stringify(c))
  }

  /** Stato salvato dei nodi (per l'apertura di un progetto). */
  readRuntimes(projectDir: string, project: ProjectDoc): NodeRuntime[] {
    return project.workflow.nodes.map((n) => {
      const c = this.readCache(projectDir, n.id)
      if (!c) return { nodeId: n.id, status: 'idle' as const }
      return {
        nodeId: n.id,
        status: c.status,
        hash: c.hash,
        result: c.result,
        error: c.error,
        startedAt: c.startedAt,
        finishedAt: c.finishedAt
      }
    })
  }

  getNodeOutput(projectDir: string, nodeId: string): Timeline | null {
    return this.readCache(projectDir, nodeId)?.output ?? null
  }

  // ------------------------------------------------------------ log

  private logFile: string | null = null

  log(level: LogLevel, message: string, nodeId?: string): void {
    const entry: LogEntry = { time: Date.now(), level, message, nodeId }
    this.emit({ kind: 'log', entry })
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, `${new Date(entry.time).toISOString()} [${level}]${nodeId ? ` (${nodeId})` : ''} ${message}\n`)
      } catch {
        /* ignora */
      }
    }
  }

  private status(rt: NodeRuntime): void {
    this.emit({ kind: 'status', runtime: rt })
  }

  // ------------------------------------------------------------ esecuzione

  private async withLock<T>(fn: (signal: AbortSignal, env: EngineEnv) => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('Un\'elaborazione è già in corso: attendi o annullala.')
    this.busy = true
    this.ac = new AbortController()
    try {
      const env = await this.getEnv()
      return await fn(this.ac.signal, env)
    } finally {
      this.busy = false
      this.ac = null
    }
  }

  async run(req: RunRequest): Promise<boolean> {
    let ok = false
    let cancelled = false
    try {
      ok = await this.withLock((signal, env) => this.runInternal(req, signal, env))
    } catch (e) {
      cancelled = e instanceof CancelledError
      if (!cancelled) this.log('error', (e as Error).message)
    }
    cancelled = cancelled || (!ok && this.lastCancelled)
    this.emit({ kind: 'run-finished', ok, cancelled })
    return ok
  }

  private lastCancelled = false

  private filesExist(c: CacheEntry): boolean {
    const files = [
      ...(c.result?.files ?? []).map((f) => f.path),
      c.output?.analysis.audioPath,
      c.output?.previewPath
    ].filter((x): x is string => !!x)
    return files.every((f) => fs.existsSync(f))
  }

  /** Esegue i nodi richiesti; restituisce true se tutti sono completati. */
  private async runInternal(req: RunRequest, signal: AbortSignal, env: EngineEnv): Promise<boolean> {
    this.lastCancelled = false
    const { projectDir, project } = req
    const wf = project.workflow
    const workDir = ensureDir(Engine.workDir(projectDir))
    this.logFile = path.join(workDir, 'log.txt')
    const hashes = computeHashes(wf, project.media, hashEnvFor(env.settings))
    const order = topoOrder(wf)
    const plan = new Set<string>()
    if (req.targets?.length) {
      for (const t of req.targets) {
        plan.add(t)
        ancestorsOf(wf, t).forEach((a) => plan.add(a.id))
      }
    } else wf.nodes.forEach((n) => plan.add(n.id))
    const forced = new Set(req.force ? req.targets ?? [] : [])

    const planned = order.filter((n) => plan.has(n.id))
    // Segna come "in coda" i nodi che verranno davvero eseguiti.
    for (const n of planned) {
      const c = this.readCache(projectDir, n.id)
      if (!c || c.hash !== hashes.get(n.id) || c.status !== 'done' || forced.has(n.id)) {
        this.status({ nodeId: n.id, status: 'queued', hash: hashes.get(n.id) })
      }
    }

    const outputs = new Map<string, Timeline | undefined>()
    const failed = new Set<string>()
    let allOk = true
    let fontsDir: string | null | undefined

    for (const node of planned) {
      if (signal.aborted) throw new CancelledError()
      const def = NODE_DEFS[node.type]
      const hash = hashes.get(node.id)!
      const parent = parentOf(wf, node.id)
      const name = node.label || def.name

      if (def.hasInput && !parent) {
        const error = 'Nodo non collegato: collega un ingresso.'
        this.status({ nodeId: node.id, status: 'error', hash, error })
        this.log('error', `${name}: ${error}`, node.id)
        failed.add(node.id)
        allOk = false
        continue
      }
      if (parent && failed.has(parent.id)) {
        this.status({ nodeId: node.id, status: 'idle', hash, message: 'Bloccato: il nodo precedente non è completato.' })
        failed.add(node.id)
        allOk = false
        continue
      }
      let input: Timeline | null = null
      if (parent) {
        input = outputs.get(parent.id) ?? this.readCache(projectDir, parent.id)?.output ?? null
        if (!input) {
          failed.add(node.id)
          allOk = false
          this.status({ nodeId: node.id, status: 'idle', hash, message: 'Manca il risultato del nodo precedente.' })
          continue
        }
      }

      const cache = this.readCache(projectDir, node.id)
      if (cache && cache.hash === hash && cache.status === 'done' && !forced.has(node.id) && this.filesExist(cache)) {
        outputs.set(node.id, cache.output)
        this.status({ nodeId: node.id, status: 'done', hash, result: cache.result, startedAt: cache.startedAt, finishedAt: cache.finishedAt })
        continue
      }

      const startedAt = Date.now()
      if (node.bypass) {
        const result: NodeResult = { summary: 'Disattivato (attraversato senza modifiche)', items: [], files: [] }
        outputs.set(node.id, input ?? undefined)
        this.writeCache(projectDir, node.id, { hash, status: 'done', output: input ?? undefined, result, startedAt, finishedAt: startedAt })
        this.status({ nodeId: node.id, status: 'done', hash, result, startedAt, finishedAt: startedAt })
        continue
      }

      const nodeDir = ensureDir(path.join(workDir, 'nodes', node.id))
      this.status({ nodeId: node.id, status: 'running', hash, progress: 0, startedAt })
      this.log('info', `▶ ${name}`, node.id)
      let lastEmit = 0
      const ctx: NodeContext = {
        ...env,
        projectDir,
        workDir,
        nodeDir,
        media: project.media,
        signal,
        node,
        log: (level, message) => this.log(level, `${name}: ${message}`, node.id),
        progress: (fraction, message) => {
          const now = Date.now()
          if (now - lastEmit < 120 && fraction < 1) return
          lastEmit = now
          this.emit({ kind: 'progress', nodeId: node.id, progress: Math.max(0, Math.min(1, fraction)), message })
        },
        fontsRelative: (fromDir) => {
          if (fontsDir === undefined) fontsDir = prepareFonts(env.resourcesDir, workDir)
          return fontsDir ? path.relative(fromDir, fontsDir).split(path.sep).join('/') : undefined
        },
        jobDir: (jobName) => {
          const d = path.join(nodeDir, 'job_' + jobName)
          fs.rmSync(d, { recursive: true, force: true })
          return ensureDir(d)
        }
      }
      try {
        const res = await NODE_IMPLS[node.type].run(ctx, input, node.settings)
        const finishedAt = Date.now()
        outputs.set(node.id, res.output)
        this.writeCache(projectDir, node.id, { hash, status: 'done', output: res.output, result: res.result, startedAt, finishedAt })
        this.status({ nodeId: node.id, status: 'done', hash, result: res.result, startedAt, finishedAt })
        res.result.warnings?.forEach((w) => this.log('warn', `${name}: ${w}`, node.id))
        this.log('success', `✓ ${name} (${((finishedAt - startedAt) / 1000).toFixed(1)} s) — ${res.result.summary}`, node.id)
      } catch (e) {
        if (e instanceof CancelledError || signal.aborted) {
          this.status({ nodeId: node.id, status: 'cancelled', hash, message: 'Annullato' })
          this.log('warn', `${name}: annullato dall'utente`, node.id)
          this.lastCancelled = true
          throw new CancelledError()
        }
        const error = (e as Error).message || String(e)
        this.writeCache(projectDir, node.id, { hash, status: 'error', error, startedAt, finishedAt: Date.now() })
        this.status({ nodeId: node.id, status: 'error', hash, error, startedAt, finishedAt: Date.now() })
        this.log('error', `✗ ${name}: ${error}`, node.id)
        failed.add(node.id)
        allOk = false
      }
    }
    return allOk
  }

  // ------------------------------------------------------------ anteprime

  private nodeOrThrow(project: ProjectDoc, nodeId: string): WorkflowNode {
    const n = project.workflow.nodes.find((x) => x.id === nodeId)
    if (!n) throw new Error('Nodo non trovato')
    return n
  }

  /** Timeline da mostrare per un nodo: per l'Esportazione è quella in ingresso. */
  private timelineFor(projectDir: string, project: ProjectDoc, node: WorkflowNode): Timeline {
    const id = node.type === 'export' ? parentOf(project.workflow, node.id)?.id : node.id
    const tl = id ? this.getNodeOutput(projectDir, id) : null
    if (!tl) throw new Error('Esegui prima il nodo per generare l\'anteprima.')
    return tl
  }

  private previewCtx(projectDir: string, env: EngineEnv, signal: AbortSignal, node: WorkflowNode, project: ProjectDoc): NodeContext {
    const workDir = ensureDir(Engine.workDir(projectDir))
    const nodeDir = ensureDir(path.join(workDir, 'previews'))
    let fontsDir: string | null | undefined
    return {
      ...env,
      projectDir,
      workDir,
      nodeDir,
      media: project.media,
      signal,
      node,
      log: (level, message) => this.log(level, `Anteprima: ${message}`, node.id),
      progress: (fraction, message) => this.emit({ kind: 'progress', nodeId: 'preview', progress: fraction, message }),
      fontsRelative: (fromDir) => {
        if (fontsDir === undefined) fontsDir = prepareFonts(env.resourcesDir, workDir)
        return fontsDir ? path.relative(fromDir, fontsDir).split(path.sep).join('/') : undefined
      },
      jobDir: (jobName) => {
        const d = path.join(nodeDir, 'job_' + jobName)
        fs.rmSync(d, { recursive: true, force: true })
        return ensureDir(d)
      }
    }
  }

  private cleanOld(dir: string, prefix: string): void {
    if (!fs.existsSync(dir)) return
    for (const f of fs.readdirSync(dir)) if (f.startsWith(prefix)) safeUnlink(path.join(dir, f))
  }

  /** Rendering veloce a bassa risoluzione del risultato di un nodo. */
  async preview(req: PreviewRequest): Promise<{ path: string; duration: number; fromOutput: number }> {
    const ok = await this.run({ projectDir: req.projectDir, project: req.project, targets: [req.nodeId] })
    if (!ok) throw new Error('Impossibile creare l\'anteprima: alcuni nodi non sono stati completati (vedi log).')
    return this.withLock(async (signal, env) => {
      const node = this.nodeOrThrow(req.project, req.nodeId)
      const tl = this.timelineFor(req.projectDir, req.project, node)
      const ctx = this.previewCtx(req.projectDir, env, signal, node, req.project)
      const exp = node.type === 'export' ? node.settings : null
      const rs = canvasFor(tl, exp ? str(exp.resolution, 'source') : 'source', exp ? str(exp.fit, 'blur') : 'blur', exp ? exp.fps : 'source', 540)
      const layout = computeLayout(tl.segments, rs.fps, tl.transitions, tl.endscreen)
      const from = req.fromSource != null ? mapStartToOutput(layout, req.fromSource) ?? 0 : 0
      this.cleanOld(ctx.nodeDir, `${node.id}_`)
      const out = path.join(ctx.nodeDir, `${node.id}_${Date.now()}.mp4`)
      this.log('info', `Anteprima di "${node.label || NODE_DEFS[node.type].name}"${req.seconds ? ` (${req.seconds}s)` : ''}`, node.id)
      const c = await runRender({
        ctx,
        timeline: tl,
        render: rs,
        mode: 'video',
        range: req.seconds > 0 || from > 0 ? { fromOutput: from, seconds: req.seconds } : undefined,
        jobName: 'preview',
        outFile: out,
        encodeArgs: ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-pix_fmt', 'yuv420p', '-r', String(rs.fps), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'],
        label: 'Anteprima'
      })
      this.emit({ kind: 'progress', nodeId: 'preview', progress: 1, message: 'Anteprima pronta' })
      this.log('success', `Anteprima pronta (${c.duration.toFixed(1)} s)`, node.id)
      return { path: out, duration: c.duration, fromOutput: req.seconds > 0 || from > 0 ? from : 0 }
    })
  }

  /** Anteprima audio A/B: originale e con le elaborazioni fino al nodo. */
  async audioPreview(req: AudioPreviewRequest): Promise<{ original: string; processed: string }> {
    const ok = await this.run({ projectDir: req.projectDir, project: req.project, targets: [req.nodeId] })
    if (!ok) throw new Error('Impossibile creare l\'anteprima audio: alcuni nodi non sono stati completati.')
    return this.withLock(async (signal, env) => {
      const node = this.nodeOrThrow(req.project, req.nodeId)
      const tl = this.timelineFor(req.projectDir, req.project, node)
      const ctx = this.previewCtx(req.projectDir, env, signal, node, req.project)
      const rs = canvasFor(tl, 'source', 'fit', 'source')
      const layout = computeLayout(tl.segments, rs.fps, tl.transitions, tl.endscreen)
      const from = mapStartToOutput(layout, req.fromSource) ?? 0
      this.cleanOld(ctx.nodeDir, `${node.id}_audio_`)
      const stamp = Date.now()
      const enc = ['-c:a', 'aac', '-b:a', '192k']
      const original = path.join(ctx.nodeDir, `${node.id}_audio_${stamp}_A.m4a`)
      const processed = path.join(ctx.nodeDir, `${node.id}_audio_${stamp}_B.m4a`)
      const range = { fromOutput: from, seconds: req.seconds }
      await runRender({ ctx, timeline: tl, render: rs, mode: 'audio-original', range, jobName: 'audioA', outFile: original, encodeArgs: enc, progressScale: [0, 0.4], label: 'Audio originale' })
      await runRender({ ctx, timeline: tl, render: rs, mode: 'audio', range, jobName: 'audioB', outFile: processed, encodeArgs: enc, progressScale: [0.4, 1], label: 'Audio elaborato' })
      this.emit({ kind: 'progress', nodeId: 'preview', progress: 1, message: 'Anteprima audio pronta' })
      return { original, processed }
    })
  }
}
