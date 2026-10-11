// Coda dei lavori inviati dal telefono: ogni lavoro diventa un progetto
// FlowCut (in Documenti/FlowCut/Telefono) elaborato dal motore del PC.

import fs from 'fs'
import path from 'path'
import { NODE_DEFS } from '../../shared/nodeDefs'
import { defaultWorkflow, newId } from '../../shared/graph'
import type { EngineEvent, JobNodeState, JobOptions, ProjectDoc, RemoteJob, Workflow } from '../../shared/types'
import type { Engine } from '../engine/executor'
import type { EngineEnv } from '../engine/context'
import { probe } from '../ffmpeg/probe'
import type { Store } from '../store'

export interface JobDeps {
  engine: Engine
  store: Store
  getEnv: () => Promise<EngineEnv>
  /** Cartella in cui creare i progetti dei lavori. */
  root: string
  log?: (msg: string) => void
}

interface JobInternal extends RemoteJob {
  uploadPath: string
  projectDir?: string
  project?: ProjectDoc
  resultPath?: string
}

const SAFE = /[<>:"/\\|?*\u0000-\u001f]/g

export class JobManager {
  private jobs: JobInternal[] = []
  private running = false
  private cancelRequested = new Set<string>()

  constructor(private d: JobDeps) {
    fs.mkdirSync(this.uploadsDir, { recursive: true })
  }

  get uploadsDir(): string {
    return path.join(this.d.root, '_caricamenti')
  }

  /** Percorso per un nuovo file caricato dal telefono. */
  newUploadPath(name: string): string {
    const ext = path.extname(name).toLowerCase().replace(/[^.\w]/g, '') || '.mp4'
    return path.join(this.uploadsDir, `${newId('up')}${ext}`)
  }

  list(): RemoteJob[] {
    return this.jobs.map((j) => this.public(j)).sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): RemoteJob | undefined {
    const j = this.jobs.find((x) => x.id === id)
    return j ? this.public(j) : undefined
  }

  resultPath(id: string): string | undefined {
    const j = this.jobs.find((x) => x.id === id)
    return j?.status === 'done' ? j.resultPath : undefined
  }

  private public(j: JobInternal): RemoteJob {
    const { uploadPath: _u, projectDir: _p, project: _pr, resultPath: _r, ...pub } = j
    return JSON.parse(JSON.stringify(pub)) as RemoteJob
  }

  /** Crea un lavoro a partire da un file già caricato. */
  create(uploadPath: string, originalName: string, options: JobOptions): RemoteJob {
    if (!fs.existsSync(uploadPath)) throw new Error('File caricato non trovato.')
    const base = (options.title || path.basename(originalName, path.extname(originalName)) || 'Video').replace(SAFE, '_').slice(0, 60)
    const job: JobInternal = {
      id: newId('job'),
      name: base,
      status: 'queued',
      createdAt: Date.now(),
      options,
      nodes: [],
      warnings: [],
      uploadPath
    }
    this.jobs.push(job)
    void this.pump()
    return this.public(job)
  }

  cancel(id: string): boolean {
    const j = this.jobs.find((x) => x.id === id)
    if (!j) return false
    if (j.status === 'queued') {
      j.status = 'cancelled'
      j.finishedAt = Date.now()
      return true
    }
    if (j.status === 'running') {
      this.cancelRequested.add(id)
      this.d.engine.cancel()
      return true
    }
    return false
  }

  /** Aggiorna lo stato dei nodi del lavoro in corso con gli eventi del motore. */
  onEngineEvent(e: EngineEvent): void {
    const j = this.jobs.find((x) => x.status === 'running')
    if (!j) return
    if (e.kind === 'status') {
      const n = j.nodes.find((x) => x.id === e.runtime.nodeId)
      if (!n) return
      n.status = e.runtime.status
      n.error = e.runtime.error
      n.summary = e.runtime.result?.summary
      n.message = e.runtime.message
      n.progress = e.runtime.status === 'done' ? 1 : e.runtime.status === 'running' ? 0 : undefined
    } else if (e.kind === 'progress') {
      const n = j.nodes.find((x) => x.id === e.nodeId)
      if (!n) return
      n.progress = e.progress
      n.message = e.message
    }
  }

  private templateWorkflow(id: string): Workflow {
    if (!id) return defaultWorkflow()
    const t = this.d.store.listTemplates().find((x) => x.id === id)
    if (!t) throw new Error('Modello di workflow non trovato sul PC.')
    return t.workflow
  }

  private async pump(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      for (;;) {
        const j = this.jobs.find((x) => x.status === 'queued')
        if (!j) break
        await this.runJob(j)
      }
    } finally {
      this.running = false
    }
  }

  private async runJob(j: JobInternal): Promise<void> {
    j.status = 'running'
    try {
      const env = await this.d.getEnv()
      const { dir, project } = this.d.store.createProject(this.d.root, j.name, this.templateWorkflow(j.options.templateId))
      j.projectDir = dir
      // Il video caricato viene spostato nella cartella del progetto.
      const mediaDir = path.join(dir, 'media')
      fs.mkdirSync(mediaDir, { recursive: true })
      const src = path.join(mediaDir, `${j.name}${path.extname(j.uploadPath)}`)
      fs.renameSync(j.uploadPath, src)
      const imported = await this.d.store.importMedia(env.tools, [src])
      if (!imported.items.length) throw new Error(imported.errors.join(' ') || 'Video non valido.')
      const video = imported.items[0]
      project.media = [video]

      const s = env.settings
      const whisperOk = !!s.whisperCliPath && fs.existsSync(s.whisperCliPath) && !!s.whisperModelPath && fs.existsSync(s.whisperModelPath)
      for (const n of project.workflow.nodes) {
        if (n.type === 'import') n.settings.mediaId = video.id
        if (n.type === 'transcribe' && j.options.language) n.settings.language = j.options.language
        if (n.type === 'export') {
          n.settings.outputPath = path.join(dir, 'export', `${j.name}_montato.mp4`)
          if (j.options.resolution) n.settings.resolution = j.options.resolution
        }
        // Il brano musicale non arriva dal telefono: senza brano il nodo viene attraversato.
        if (n.type === 'music' && !project.media.some((m) => m.id === n.settings.mediaId)) {
          n.bypass = true
          j.warnings.push('Nessun brano musicale nel modello: musica saltata.')
        }
        // Senza Whisper configurato, trascrizione e sottotitoli vengono attraversati.
        const engineName = n.type === 'transcribe' ? String(n.settings.engine ?? 'whisper.cpp') : ''
        if ((n.type === 'transcribe' && engineName === 'whisper.cpp' && !whisperOk) || (n.type === 'subtitles' && !whisperOk && project.workflow.nodes.some((x) => x.type === 'transcribe' && String(x.settings.engine ?? 'whisper.cpp') === 'whisper.cpp'))) {
          n.bypass = true
          if (n.type === 'transcribe') j.warnings.push('Whisper non è configurato sul PC: trascrizione e sottotitoli saltati.')
        }
      }
      j.project = project
      this.d.store.saveProject(dir, project)
      j.nodes = project.workflow.nodes.map<JobNodeState>((n) => ({
        id: n.id,
        type: n.type,
        label: n.label || NODE_DEFS[n.type].name,
        status: n.bypass ? 'done' : 'queued',
        summary: n.bypass ? 'Saltato' : undefined
      }))
      this.d.log?.(`Lavoro dal telefono: ${j.name}`)

      // Attende che il motore sia libero (il PC potrebbe essere al lavoro).
      while (this.d.engine.isBusy) {
        if (this.cancelRequested.has(j.id)) throw new Error('__cancel__')
        await new Promise((r) => setTimeout(r, 1500))
      }
      const ok = await this.d.engine.run({ projectDir: dir, project })
      if (this.cancelRequested.has(j.id)) throw new Error('__cancel__')
      if (!ok) {
        const bad = j.nodes.find((n) => n.status === 'error')
        throw new Error(bad ? `${bad.label}: ${bad.error ?? 'errore'}` : 'Elaborazione non completata.')
      }
      const exp = project.workflow.nodes.find((n) => n.type === 'export')
      const out = exp ? String(exp.settings.outputPath) : ''
      if (!out || !fs.existsSync(out)) throw new Error('Il workflow non ha prodotto un video (manca il nodo Esportazione?).')
      j.resultPath = out
      j.resultName = path.basename(out)
      j.resultSize = fs.statSync(out).size
      try {
        j.resultDuration = (await probe(env.tools, out)).duration
      } catch {
        /* facoltativo */
      }
      j.status = 'done'
    } catch (e) {
      const msg = (e as Error).message
      if (msg === '__cancel__' || this.cancelRequested.has(j.id)) {
        j.status = 'cancelled'
      } else {
        j.status = 'error'
        j.error = msg
      }
      if (fs.existsSync(j.uploadPath)) fs.rmSync(j.uploadPath, { force: true })
    } finally {
      this.cancelRequested.delete(j.id)
      j.finishedAt = Date.now()
    }
  }
}
