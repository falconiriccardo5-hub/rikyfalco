// Processo principale Electron: finestra, IPC e collegamento con il motore.

import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions } from 'electron'
import type {
  AppSettings, AudioPreviewRequest, EngineEvent, RemoteStatus, PreviewRequest, ProjectDoc, RunRequest, ToolStatus, Workflow
} from '../shared/types'
import { Engine } from './engine/executor'
import type { EngineEnv } from './engine/context'
import { runProcess } from './ffmpeg/run'
import { encoderWorks, ffmpegVersion, listEncoders, resolveTools } from './ffmpeg/tools'
import { downloadModel, listDownloadedModels, WHISPER_MODELS } from './models'
import { handleMediaProtocol, registerMediaScheme } from './protocol'
import { JobManager } from './remote/jobs'
import { RemoteServer } from './remote/server'
import { Store } from './store'
import { downloadVoice, installPiper } from './voice/install'
import { voiceInstalled } from './voice/piper'
import { PIPER_VOICES } from '../shared/voices'
import { checkFasterWhisper, describeWhisperExit, resolveWhisperCli } from './transcribe/whisper'

registerMediaScheme()

// Cartella dati alternativa (installazioni portabili o test automatici).
if (process.env.FLOWCUT_USER_DATA) app.setPath('userData', process.env.FLOWCUT_USER_DATA)

const store = new Store(app.getPath('userData'))
let win: BrowserWindow | null = null

function resourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources')
}

function send(e: EngineEvent): void {
  jobs?.onEngineEvent(e)
  if (win && !win.isDestroyed()) win.webContents.send('engine:event', e)
}

let envCache: { key: string; env: EngineEnv } | null = null
async function getEnv(): Promise<EngineEnv> {
  const settings = store.getSettings()
  const tools = resolveTools(settings)
  const key = `${tools.ffmpeg}|${tools.ffprobe}`
  if (!envCache || envCache.key !== key) {
    const v = await ffmpegVersion(tools)
    envCache = { key, env: { tools, ffmpegMajor: v.major, encoders: await listEncoders(tools), settings, resourcesDir: resourcesDir(), dataDir: app.getPath('userData') } }
  }
  return { ...envCache.env, settings }
}

const engine = new Engine(getEnv, send)

// ------------------------------------------------------------ accesso dal telefono
let jobs: JobManager | null = null
let remote: RemoteServer | null = null

function mobileDir(): string {
  return app.isPackaged ? path.join(process.resourcesPath, 'mobile') : path.join(app.getAppPath(), 'out', 'mobile')
}

function remoteLog(msg: string): void {
  send({ kind: 'log', entry: { time: Date.now(), level: 'info', message: `Telefono: ${msg}` } })
}

function ensureRemote(): RemoteServer {
  if (!jobs) jobs = new JobManager({ engine, store, getEnv, root: path.join(app.getPath('documents'), 'FlowCut', 'Telefono'), log: remoteLog })
  if (!remote) {
    remote = new RemoteServer({
      staticDir: mobileDir(),
      jobs,
      getSettings: () => store.getSettings(),
      setSettings: (p) => store.setSettings(p),
      listTemplates: () => store.listTemplates(),
      appVersion: app.getVersion(),
      log: remoteLog
    })
  }
  return remote
}

async function applyRemote(): Promise<RemoteStatus> {
  const s = store.getSettings()
  const r = ensureRemote()
  if (s.remoteEnabled) {
    try {
      if (!r.status().running || r.port !== s.remotePort) await r.start(s.remotePort)
    } catch {
      /* errore riportato nello stato */
    }
  } else await r.stop()
  return r.status()
}

function createWindow(): void {
  const dark = store.getSettings().theme !== 'light'
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    backgroundColor: dark ? '#0d0d0f' : '#f5f5f7',
    title: 'FlowCut',
    icon: app.isPackaged ? undefined : path.join(app.getAppPath(), 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay:
      process.platform === 'darwin' ? undefined : { color: '#00000000', symbolColor: dark ? '#e8e8ea' : '#1d1d1f', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.once('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

async function checkTools(): Promise<ToolStatus> {
  const s = store.getSettings()
  const tools = resolveTools(s)
  const status: ToolStatus = {
    ffmpeg: { ok: false, path: tools.ffmpeg },
    ffprobe: { ok: false, path: tools.ffprobe },
    piper: { ok: !!s.piperPath && fs.existsSync(s.piperPath), path: s.piperPath, error: s.piperPath ? (fs.existsSync(s.piperPath) ? undefined : 'File non trovato') : 'Non installato' },
    whisperCpp: { ok: false, path: s.whisperCliPath },
    whisperModel: { ok: false, path: s.whisperModelPath },
    fasterWhisper: { ok: false, python: s.pythonPath || (process.platform === 'win32' ? 'python' : 'python3') },
    encoders: []
  }
  try {
    const v = await ffmpegVersion(tools)
    status.ffmpeg = { ok: true, path: tools.ffmpeg, version: v.version }
    const enc = await listEncoders(tools)
    const wanted = ['libx264', 'libx265', 'h264_nvenc', 'hevc_nvenc', 'h264_qsv', 'h264_amf']
    for (const e of wanted) {
      if (!enc.includes(e)) continue
      if (e.startsWith('lib') || (await encoderWorks(tools, e))) status.encoders.push(e)
    }
  } catch (e) {
    status.ffmpeg.error = (e as Error).message
  }
  try {
    const r = await runProcess(tools.ffprobe, ['-version'])
    status.ffprobe = { ok: r.code === 0, path: tools.ffprobe, version: /ffprobe version (\S+)/.exec(r.stdout)?.[1] }
  } catch (e) {
    status.ffprobe.error = (e as Error).message
  }
  if (s.whisperCliPath) {
    const cli = resolveWhisperCli(s.whisperCliPath)
    status.whisperCpp.path = cli
    if (!fs.existsSync(cli)) status.whisperCpp.error = 'File non trovato'
    else {
      try {
        const r = await runProcess(cli, ['--help'])
        status.whisperCpp.ok = /usage|options/i.test(r.stdout + r.stderr)
        if (!status.whisperCpp.ok) status.whisperCpp.error = describeWhisperExit(r.code) ?? `Il file non sembra whisper-cli (codice ${r.code})`
      } catch (e) {
        status.whisperCpp.error = (e as Error).message
      }
    }
  } else status.whisperCpp.error = 'Non configurato'
  if (s.whisperModelPath) {
    status.whisperModel.ok = fs.existsSync(s.whisperModelPath)
    if (!status.whisperModel.ok) status.whisperModel.error = 'File non trovato'
  } else status.whisperModel.error = 'Nessun modello selezionato'
  const fw = await checkFasterWhisper(s.pythonPath)
  status.fasterWhisper = { ok: fw.ok, python: status.fasterWhisper.python, error: fw.error }
  return status
}

let downloadAc: AbortController | null = null

function registerIpc(): void {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    userData: app.getPath('userData'),
    modelsDir: store.modelsDir,
    documents: app.getPath('documents')
  }))
  ipcMain.handle('settings:get', () => store.getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
    envCache = null
    return store.setSettings(patch)
  })
  ipcMain.handle('tools:check', () => checkTools())

  ipcMain.handle('dialog:openFiles', async (_e, o: { title?: string; filters?: { name: string; extensions: string[] }[]; multi?: boolean }) => {
    const opts: OpenDialogOptions = { title: o.title, filters: o.filters, properties: o.multi ? ['openFile', 'multiSelections'] : ['openFile'] }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return r.canceled ? [] : r.filePaths
  })
  ipcMain.handle('dialog:saveFile', async (_e, o: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const r = win ? await dialog.showSaveDialog(win, o) : await dialog.showSaveDialog(o)
    return r.canceled ? null : r.filePath ?? null
  })
  ipcMain.handle('dialog:openDir', async (_e, title?: string) => {
    const opts: OpenDialogOptions = { title, properties: ['openDirectory', 'createDirectory'] }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('project:create', (_e, parentDir: string, name: string, templateId?: string) => {
    const tpl = templateId ? store.listTemplates().find((t) => t.id === templateId) : undefined
    const { dir, project } = store.createProject(parentDir, name, tpl?.workflow)
    return { dir, project, runtimes: [] }
  })
  ipcMain.handle('project:open', (_e, dir: string) => {
    const r = store.openProject(dir)
    return { ...r, runtimes: engine.readRuntimes(r.dir, r.project) }
  })
  ipcMain.handle('project:save', (_e, dir: string, project: ProjectDoc) => store.saveProject(dir, project))
  ipcMain.handle('media:import', async (_e, paths: string[]) => store.importMedia((await getEnv()).tools, paths))

  ipcMain.handle('engine:run', (_e, req: RunRequest) => engine.run(req))
  ipcMain.handle('engine:cancel', () => engine.cancel())
  ipcMain.handle('engine:busy', () => engine.isBusy)
  ipcMain.handle('engine:preview', (_e, req: PreviewRequest) => engine.preview(req))
  ipcMain.handle('engine:audioPreview', (_e, req: AudioPreviewRequest) => engine.audioPreview(req))
  ipcMain.handle('engine:nodeOutput', (_e, projectDir: string, nodeId: string) => engine.getNodeOutput(projectDir, nodeId))
  ipcMain.handle('fs:readJson', (_e, file: string) => {
    if (!file.endsWith('.json') || !fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  })
  ipcMain.handle('fs:exists', (_e, file: string) => fs.existsSync(file))

  ipcMain.handle('templates:list', () => store.listTemplates())
  ipcMain.handle('templates:save', (_e, name: string, description: string, workflow: Workflow) => store.saveTemplate(name, description, workflow))
  ipcMain.handle('templates:delete', (_e, id: string) => store.deleteTemplate(id))
  ipcMain.handle('templates:export', async (_e, id: string) => {
    const r = await dialog.showSaveDialog(win!, { title: 'Esporta modello di workflow', defaultPath: 'workflow.flowcut-template.json', filters: [{ name: 'Modello FlowCut', extensions: ['json'] }] })
    if (r.canceled || !r.filePath) return false
    store.exportTemplate(id, r.filePath)
    return true
  })
  ipcMain.handle('templates:import', async () => {
    const r = await dialog.showOpenDialog(win!, { title: 'Importa modello di workflow', filters: [{ name: 'Modello FlowCut', extensions: ['json'] }], properties: ['openFile'] })
    if (r.canceled || !r.filePaths[0]) return null
    return store.importTemplate(r.filePaths[0])
  })

  ipcMain.handle('models:list', () => {
    const have = listDownloadedModels(store.modelsDir)
    return WHISPER_MODELS.map((m) => {
      const p = path.join(store.modelsDir, `ggml-${m.name}.bin`)
      return { ...m, path: p, downloaded: have.includes(p) }
    })
  })
  ipcMain.handle('models:download', async (_e, name: string) => {
    if (downloadAc) throw new Error('Un download è già in corso.')
    downloadAc = new AbortController()
    try {
      const p = await downloadModel(name, store.modelsDir, downloadAc.signal, (received, total) =>
        send({ kind: 'download-progress', id: name, received, total })
      )
      send({ kind: 'download-progress', id: name, received: 1, total: 1, done: true })
      return p
    } catch (e) {
      send({ kind: 'download-progress', id: name, received: 0, total: 0, error: (e as Error).message })
      throw e
    } finally {
      downloadAc = null
    }
  })
  ipcMain.handle('models:cancel', () => downloadAc?.abort())

  // Voce narrante (Piper)
  ipcMain.handle('voices:list', () =>
    PIPER_VOICES.map((v) => ({ ...v, downloaded: voiceInstalled(app.getPath('userData'), v.id) }))
  )
  const voiceTask = async (id: string, fn: (signal: AbortSignal) => Promise<void>): Promise<void> => {
    if (downloadAc) throw new Error('Un download è già in corso.')
    downloadAc = new AbortController()
    try {
      await fn(downloadAc.signal)
      send({ kind: 'download-progress', id, received: 1, total: 1, done: true })
    } catch (e) {
      send({ kind: 'download-progress', id, received: 0, total: 0, error: (e as Error).message })
      throw e
    } finally {
      downloadAc = null
    }
  }
  ipcMain.handle('voices:download', (_e, id: string) =>
    voiceTask(id, (signal) => downloadVoice(app.getPath('userData'), id, signal, (received, total) => send({ kind: 'download-progress', id, received, total })))
  )
  ipcMain.handle('piper:install', async () => {
    let exe = ''
    await voiceTask('piper', async (signal) => {
      exe = await installPiper(app.getPath('userData'), signal, (received, total) => send({ kind: 'download-progress', id: 'piper', received, total }))
    })
    envCache = null
    store.setSettings({ piperPath: exe })
    return exe
  })

  ipcMain.handle('shell:showItem', (_e, p: string) => shell.showItemInFolder(p))
  ipcMain.handle('shell:openPath', (_e, p: string) => shell.openPath(p))
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (/^https:\/\//.test(url)) return shell.openExternal(url)
    return undefined
  })
  ipcMain.handle('remote:status', () => ensureRemote().status())
  ipcMain.handle('remote:set', async (_e, patch: { enabled?: boolean; port?: number }) => {
    const p: Partial<AppSettings> = {}
    if (typeof patch.enabled === 'boolean') p.remoteEnabled = patch.enabled
    if (typeof patch.port === 'number' && patch.port >= 1024 && patch.port <= 65535) p.remotePort = patch.port
    store.setSettings(p)
    return applyRemote()
  })
  ipcMain.handle('remote:newCode', () => {
    ensureRemote().newCode()
    return ensureRemote().status()
  })
  ipcMain.handle('remote:revoke', () => {
    store.setSettings({ remoteTokens: [] })
    return ensureRemote().status()
  })
  ipcMain.handle('window:theme', (_e, dark: boolean) => {
    if (win && process.platform !== 'darwin') {
      try {
        win.setTitleBarOverlay({ color: '#00000000', symbolColor: dark ? '#e8e8ea' : '#1d1d1f', height: 44 })
      } catch {
        /* non supportato */
      }
    }
    win?.setBackgroundColor(dark ? '#0d0d0f' : '#f5f5f7')
  })
}

app.whenReady().then(() => {
  handleMediaProtocol()
  registerIpc()
  void applyRemote()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  engine.cancel()
  void remote?.stop()
  if (process.platform !== 'darwin') app.quit()
})
