import type {
  AppSettings, AudioPreviewRequest, EngineEvent, MediaItem, OpenProjectResult, PreviewRequest, ProjectDoc,
  RunRequest, Timeline, ToolStatus, Workflow, WorkflowTemplate
} from '../shared/types'

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface WhisperModelInfo {
  name: string
  size: string
  note: string
  path: string
  downloaded: boolean
}

export interface Api {
  appInfo(): Promise<{ version: string; platform: string; userData: string; modelsDir: string; documents: string }>
  getSettings(): Promise<AppSettings>
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  checkTools(): Promise<ToolStatus>
  openFiles(o: { title?: string; filters?: FileFilter[]; multi?: boolean }): Promise<string[]>
  saveFile(o: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>
  openDir(title?: string): Promise<string | null>
  createProject(parentDir: string, name: string, templateId?: string): Promise<OpenProjectResult>
  openProject(dir: string): Promise<OpenProjectResult>
  saveProject(dir: string, project: ProjectDoc): Promise<string>
  importMedia(paths: string[]): Promise<{ items: MediaItem[]; errors: string[] }>
  run(req: RunRequest): Promise<boolean>
  cancel(): Promise<void>
  isBusy(): Promise<boolean>
  preview(req: PreviewRequest): Promise<{ path: string; duration: number; fromOutput: number }>
  audioPreview(req: AudioPreviewRequest): Promise<{ original: string; processed: string }>
  nodeOutput(projectDir: string, nodeId: string): Promise<Timeline | null>
  readJson<T = unknown>(file: string): Promise<T | null>
  exists(file: string): Promise<boolean>
  listTemplates(): Promise<WorkflowTemplate[]>
  saveTemplate(name: string, description: string, workflow: Workflow): Promise<WorkflowTemplate>
  deleteTemplate(id: string): Promise<void>
  exportTemplate(id: string): Promise<boolean>
  importTemplate(): Promise<WorkflowTemplate | null>
  listModels(): Promise<WhisperModelInfo[]>
  downloadModel(name: string): Promise<string>
  cancelDownload(): Promise<void>
  showItem(p: string): Promise<void>
  openPath(p: string): Promise<string>
  openExternal(url: string): Promise<void>
  setWindowTheme(dark: boolean): Promise<void>
  pathForFile(f: File): string
  onEvent(cb: (e: EngineEvent) => void): () => void
}

declare global {
  interface Window {
    api: Api
  }
}
