// Impostazioni dell'app, progetti e modelli di workflow (persistenza su disco).

import fs from 'fs'
import os from 'os'
import path from 'path'
import { defaultWorkflow, newId } from '../shared/graph'
import type { AppSettings, MediaItem, ProjectDoc, Workflow, WorkflowTemplate } from '../shared/types'
import { kindFromPath, probe } from './ffmpeg/probe'
import type { ToolPaths } from './ffmpeg/tools'

export const PROJECT_FILE = 'project.flowcut.json'

const DEFAULT_SETTINGS: AppSettings = {
  ffmpegPath: '',
  ffprobePath: '',
  whisperCliPath: '',
  whisperModelPath: '',
  pythonPath: '',
  defaultLanguage: 'it',
  theme: 'dark',
  threads: 4,
  recentProjects: [],
  remoteEnabled: false,
  remotePort: 7878,
  remoteTokens: []
}

/** Legge un file JSON ignorando l'eventuale BOM (file salvati da PowerShell o Blocco note). */
function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as T
}

function writeJsonAtomic(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

export class Store {
  constructor(private userData: string) {}

  // ------------------------------------------------------------ impostazioni

  private get settingsFile(): string {
    return path.join(this.userData, 'settings.json')
  }

  getSettings(): AppSettings {
    try {
      const raw = readJson<Partial<AppSettings>>(this.settingsFile)
      return { ...DEFAULT_SETTINGS, threads: defaultThreads(), ...raw }
    } catch {
      return { ...DEFAULT_SETTINGS, threads: defaultThreads() }
    }
  }

  setSettings(patch: Partial<AppSettings>): AppSettings {
    const s = { ...this.getSettings(), ...patch }
    writeJsonAtomic(this.settingsFile, s)
    return s
  }

  addRecent(dir: string): void {
    const s = this.getSettings()
    const list = [dir, ...s.recentProjects.filter((d) => d !== dir)].filter((d) => fs.existsSync(path.join(d, PROJECT_FILE))).slice(0, 12)
    this.setSettings({ recentProjects: list })
  }

  get modelsDir(): string {
    return path.join(this.userData, 'models')
  }

  // ------------------------------------------------------------ progetti

  createProject(parentDir: string, name: string, workflow?: Workflow): { dir: string; project: ProjectDoc } {
    const safe = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 80) || 'Progetto'
    let dir = path.join(parentDir, safe)
    let i = 2
    while (fs.existsSync(dir)) dir = path.join(parentDir, `${safe} (${i++})`)
    fs.mkdirSync(path.join(dir, 'work'), { recursive: true })
    const now = new Date().toISOString()
    const project: ProjectDoc = {
      version: 1,
      name: safe,
      createdAt: now,
      updatedAt: now,
      media: [],
      workflow: workflow ? cloneWorkflowWithNewIds(workflow) : defaultWorkflow()
    }
    writeJsonAtomic(path.join(dir, PROJECT_FILE), project)
    this.addRecent(dir)
    return { dir, project }
  }

  openProject(dirOrFile: string): { dir: string; project: ProjectDoc } {
    const dir = dirOrFile.endsWith('.json') ? path.dirname(dirOrFile) : dirOrFile
    const file = path.join(dir, PROJECT_FILE)
    if (!fs.existsSync(file)) throw new Error(`Nessun progetto FlowCut in: ${dir}`)
    let project: ProjectDoc
    try {
      project = readJson<ProjectDoc>(file)
    } catch (e) {
      throw new Error(`File di progetto danneggiato: ${(e as Error).message}`)
    }
    if (!project.workflow || !Array.isArray(project.media)) throw new Error('File di progetto non valido.')
    project.media = project.media.map((m) => ({ ...m, missing: !fs.existsSync(m.path) }))
    this.addRecent(dir)
    return { dir, project }
  }

  saveProject(dir: string, project: ProjectDoc): string {
    const doc = { ...project, updatedAt: new Date().toISOString(), media: project.media.map(({ missing: _m, ...m }) => m) }
    writeJsonAtomic(path.join(dir, PROJECT_FILE), doc)
    return doc.updatedAt
  }

  // ------------------------------------------------------------ media

  async importMedia(tools: ToolPaths, paths: string[]): Promise<{ items: MediaItem[]; errors: string[] }> {
    const items: MediaItem[] = []
    const errors: string[] = []
    for (const p of paths) {
      const kind = kindFromPath(p)
      if (!kind) {
        errors.push(`Formato non supportato: ${path.basename(p)}`)
        continue
      }
      try {
        const info = await probe(tools, p)
        if (kind === 'video' && !info.hasVideo) throw new Error('nessuna traccia video')
        if (kind === 'audio' && !info.hasAudio) throw new Error('nessuna traccia audio')
        items.push({ id: newId('m'), kind, path: p, name: path.basename(p), info })
      } catch (e) {
        errors.push(`${path.basename(p)}: ${(e as Error).message}`)
      }
    }
    return { items, errors }
  }

  // ------------------------------------------------------------ modelli di workflow

  private get templatesDir(): string {
    return path.join(this.userData, 'templates')
  }

  listTemplates(): WorkflowTemplate[] {
    if (!fs.existsSync(this.templatesDir)) return []
    return fs
      .readdirSync(this.templatesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          return readJson<WorkflowTemplate>(path.join(this.templatesDir, f))
        } catch {
          return null
        }
      })
      .filter((t): t is WorkflowTemplate => !!t && !!t.workflow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  saveTemplate(name: string, description: string, workflow: Workflow): WorkflowTemplate {
    const t: WorkflowTemplate = {
      id: newId('tpl'),
      name: name.trim() || 'Workflow',
      description,
      createdAt: new Date().toISOString(),
      workflow: stripProjectSpecific(workflow)
    }
    writeJsonAtomic(path.join(this.templatesDir, `${t.id}.json`), t)
    return t
  }

  deleteTemplate(id: string): void {
    const f = path.join(this.templatesDir, `${id.replace(/[^\w-]/g, '')}.json`)
    if (fs.existsSync(f)) fs.unlinkSync(f)
  }

  exportTemplate(id: string, dest: string): void {
    const t = this.listTemplates().find((x) => x.id === id)
    if (!t) throw new Error('Modello non trovato')
    writeJsonAtomic(dest, t)
  }

  importTemplate(file: string): WorkflowTemplate {
    const t = readJson<WorkflowTemplate>(file)
    if (!t.workflow?.nodes) throw new Error('File non valido: manca il workflow.')
    return this.saveTemplate(t.name || path.basename(file, '.json'), t.description ?? '', t.workflow)
  }
}

function defaultThreads(): number {
  const n = os.cpus().length
  return Math.max(2, Math.min(8, n - 1))
}

/** Rimuove riferimenti a file del progetto (video, brani, destinazione) dal modello. */
export function stripProjectSpecific(wf: Workflow): Workflow {
  const clone = JSON.parse(JSON.stringify(wf)) as Workflow
  for (const n of clone.nodes) {
    for (const k of Object.keys(n.settings)) {
      if (/mediaid$/i.test(k)) n.settings[k] = ''
    }
    if (n.type === 'export') n.settings.outputPath = ''
    if (n.type === 'silence') {
      n.settings.disabledCuts = []
      n.settings.protectedRanges = []
      n.settings.manualCuts = []
    }
    if (n.type === 'subtitles') n.settings.editedCues = null
    if (n.type === 'transitions') n.settings.selected = []
    if (n.type === 'texts' && Array.isArray(n.settings.items)) {
      n.settings.items = (n.settings.items as { kind: string }[]).filter((i) => i.kind !== 'image')
    }
  }
  return clone
}

export function cloneWorkflowWithNewIds(wf: Workflow): Workflow {
  const map = new Map<string, string>()
  const nodes = wf.nodes.map((n) => {
    const id = newId(n.type.slice(0, 3))
    map.set(n.id, id)
    return { ...JSON.parse(JSON.stringify(n)), id }
  })
  const edges = wf.edges
    .filter((e) => map.has(e.source) && map.has(e.target))
    .map((e) => ({ id: newId('e'), source: map.get(e.source)!, target: map.get(e.target)! }))
  return { nodes, edges }
}
