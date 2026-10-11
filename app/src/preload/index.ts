// Ponte sicuro tra interfaccia e processo principale (contextIsolation attivo).

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { EngineEvent } from '../shared/types'

const invoke = (ch: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke(ch, ...args)

const api = {
  appInfo: () => invoke('app:info'),
  getSettings: () => invoke('settings:get'),
  setSettings: (patch: unknown) => invoke('settings:set', patch),
  checkTools: () => invoke('tools:check'),
  openFiles: (o: unknown) => invoke('dialog:openFiles', o),
  saveFile: (o: unknown) => invoke('dialog:saveFile', o),
  openDir: (title?: string) => invoke('dialog:openDir', title),
  createProject: (parentDir: string, name: string, templateId?: string) => invoke('project:create', parentDir, name, templateId),
  openProject: (dir: string) => invoke('project:open', dir),
  saveProject: (dir: string, project: unknown) => invoke('project:save', dir, project),
  importMedia: (paths: string[]) => invoke('media:import', paths),
  run: (req: unknown) => invoke('engine:run', req),
  cancel: () => invoke('engine:cancel'),
  isBusy: () => invoke('engine:busy'),
  preview: (req: unknown) => invoke('engine:preview', req),
  audioPreview: (req: unknown) => invoke('engine:audioPreview', req),
  nodeOutput: (projectDir: string, nodeId: string) => invoke('engine:nodeOutput', projectDir, nodeId),
  readJson: (file: string) => invoke('fs:readJson', file),
  exists: (file: string) => invoke('fs:exists', file),
  listTemplates: () => invoke('templates:list'),
  saveTemplate: (name: string, description: string, workflow: unknown) => invoke('templates:save', name, description, workflow),
  deleteTemplate: (id: string) => invoke('templates:delete', id),
  exportTemplate: (id: string) => invoke('templates:export', id),
  importTemplate: () => invoke('templates:import'),
  listModels: () => invoke('models:list'),
  downloadModel: (name: string) => invoke('models:download', name),
  cancelDownload: () => invoke('models:cancel'),
  showItem: (p: string) => invoke('shell:showItem', p),
  openPath: (p: string) => invoke('shell:openPath', p),
  openExternal: (url: string) => invoke('shell:openExternal', url),
  listVoices: () => invoke('voices:list'),
  downloadVoice: (id: string) => invoke('voices:download', id),
  installPiper: () => invoke('piper:install'),
  remoteStatus: () => invoke('remote:status'),
  remoteSet: (patch: unknown) => invoke('remote:set', patch),
  remoteNewCode: () => invoke('remote:newCode'),
  remoteRevoke: () => invoke('remote:revoke'),
  setWindowTheme: (dark: boolean) => invoke('window:theme', dark),
  pathForFile: (f: File) => webUtils.getPathForFile(f),
  onEvent: (cb: (e: EngineEvent) => void) => {
    const fn = (_: unknown, e: EngineEvent): void => cb(e)
    ipcRenderer.on('engine:event', fn)
    return () => ipcRenderer.removeListener('engine:event', fn)
  }
}

contextBridge.exposeInMainWorld('api', api)
