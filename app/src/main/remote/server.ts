// Server sulla rete locale per usare FlowCut dal telefono (web app).
// - serve la web app mobile (cartella statica)
// - API protette da token ottenuto con un codice di abbinamento mostrato sul PC
// Nessuna dipendenza da Electron: testabile con Node.

import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import { RESOLUTIONS, LANGUAGES } from '../../shared/nodeDefs'
import type { AppSettings, JobOptions, RemoteStatus, WorkflowTemplate } from '../../shared/types'
import type { JobManager } from './jobs'

export interface ServerDeps {
  staticDir: string
  jobs: JobManager
  getSettings: () => AppSettings
  setSettings: (p: Partial<AppSettings>) => AppSettings
  listTemplates: () => WorkflowTemplate[]
  appVersion: string
  log?: (msg: string) => void
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.txt': 'text/plain'
}

const MAX_UPLOAD = 20 * 1024 ** 3

function newPairingCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function lanAddresses(): string[] {
  const out: string[] = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address)
    }
  }
  return out
}

export class RemoteServer {
  private server: http.Server | null = null
  private code = newPairingCode()
  private failedPairs = 0
  private lastError = ''
  port = 0

  constructor(private d: ServerDeps) {}

  status(): RemoteStatus {
    const s = this.d.getSettings()
    return {
      enabled: s.remoteEnabled,
      running: !!this.server,
      port: this.port || s.remotePort,
      urls: this.server ? lanAddresses().map((a) => `http://${a}:${this.port}`) : [],
      pairingCode: this.code,
      devices: s.remoteTokens.length,
      error: this.lastError || undefined
    }
  }

  newCode(): string {
    this.code = newPairingCode()
    this.failedPairs = 0
    return this.code
  }

  async start(port: number, host = '0.0.0.0'): Promise<void> {
    await this.stop()
    this.lastError = ''
    const srv = http.createServer((req, res) => {
      this.handle(req, res).catch((e) => {
        if (!res.headersSent) this.json(res, 500, { error: (e as Error).message })
        else res.destroy()
      })
    })
    srv.requestTimeout = 0
    await new Promise<void>((resolve, reject) => {
      srv.once('error', (e: NodeJS.ErrnoException) => {
        this.lastError = e.code === 'EADDRINUSE' ? `La porta ${port} è già in uso.` : e.message
        reject(new Error(this.lastError))
      })
      srv.listen(port, host, () => resolve())
    })
    this.server = srv
    const addr = srv.address()
    this.port = typeof addr === 'object' && addr ? addr.port : port
    this.d.log?.(`Accesso dal telefono attivo: ${lanAddresses().map((a) => `http://${a}:${this.port}`).join(', ')}`)
  }

  async stop(): Promise<void> {
    const s = this.server
    this.server = null
    if (s) await new Promise<void>((r) => s.close(() => r()))
  }

  // ------------------------------------------------------------ utilità HTTP

  private json(res: http.ServerResponse, status: number, body: unknown): void {
    const data = JSON.stringify(body)
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(data)
  }

  private async readBody(req: http.IncomingMessage, limit = 1_000_000): Promise<unknown> {
    const chunks: Buffer[] = []
    let n = 0
    for await (const c of req) {
      n += (c as Buffer).length
      if (n > limit) throw new Error('Richiesta troppo grande')
      chunks.push(c as Buffer)
    }
    const s = Buffer.concat(chunks).toString('utf8')
    return s ? JSON.parse(s) : {}
  }

  private authorized(req: http.IncomingMessage, url: URL): boolean {
    const h = req.headers.authorization
    const token = h?.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token') ?? ''
    if (!token) return false
    const list = this.d.getSettings().remoteTokens
    return list.some((t) => t.length === token.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(token)))
  }

  private sendFile(req: http.IncomingMessage, res: http.ServerResponse, file: string, opts: { download?: string; cache?: string } = {}): void {
    const stat = fs.statSync(file)
    const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    const headers: Record<string, string> = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': opts.cache ?? 'no-cache'
    }
    if (opts.download) headers['Content-Disposition'] = `attachment; filename="${opts.download.replace(/[^\w.\- ]/g, '_')}"`
    const range = req.headers.range
    const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null
    if (m) {
      let start = m[1] ? Number(m[1]) : 0
      let end = m[2] ? Number(m[2]) : stat.size - 1
      if (!m[1] && m[2]) {
        start = Math.max(0, stat.size - Number(m[2]))
        end = stat.size - 1
      }
      end = Math.min(end, stat.size - 1)
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` })
        res.end()
        return
      }
      res.writeHead(206, { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${stat.size}` })
      if (req.method === 'HEAD') return void res.end()
      fs.createReadStream(file, { start, end }).pipe(res)
      return
    }
    res.writeHead(200, { ...headers, 'Content-Length': String(stat.size) })
    if (req.method === 'HEAD') return void res.end()
    fs.createReadStream(file).pipe(res)
  }

  // ------------------------------------------------------------ instradamento

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://x')
    const p = url.pathname
    const method = req.method ?? 'GET'

    if (!p.startsWith('/api/')) return this.serveStatic(req, res, p)

    if (p === '/api/ping') {
      return this.json(res, 200, { app: 'FlowCut', version: this.d.appVersion, authorized: this.authorized(req, url) })
    }
    if (p === '/api/pair' && method === 'POST') {
      if (this.failedPairs >= 10) return this.json(res, 429, { error: 'Troppi tentativi: genera un nuovo codice sul PC.' })
      const body = (await this.readBody(req)) as { code?: string; device?: string }
      if (String(body.code ?? '').trim() !== this.code) {
        this.failedPairs++
        return this.json(res, 403, { error: 'Codice errato.' })
      }
      const token = crypto.randomBytes(24).toString('hex')
      const s = this.d.getSettings()
      this.d.setSettings({ remoteTokens: [...s.remoteTokens, token].slice(-20) })
      this.newCode()
      this.d.log?.(`Nuovo dispositivo abbinato${body.device ? `: ${body.device}` : ''}`)
      return this.json(res, 200, { token })
    }

    if (!this.authorized(req, url)) return this.json(res, 401, { error: 'Dispositivo non abbinato.' })

    if (p === '/api/info' && method === 'GET') {
      const s = this.d.getSettings()
      const whisper = !!s.whisperCliPath && fs.existsSync(s.whisperCliPath) && !!s.whisperModelPath && fs.existsSync(s.whisperModelPath)
      return this.json(res, 200, {
        templates: [{ id: '', name: 'Workflow completo predefinito' }, ...this.d.listTemplates().map((t) => ({ id: t.id, name: t.name }))],
        resolutions: RESOLUTIONS.map((r) => ({ value: r.value === 'source' ? '' : r.value, label: r.value === 'source' ? 'Come nel workflow' : r.label })),
        languages: LANGUAGES,
        defaultLanguage: s.defaultLanguage,
        whisper,
        host: os.hostname()
      })
    }
    if (p === '/api/upload' && (method === 'PUT' || method === 'POST')) {
      const name = url.searchParams.get('name') ?? 'video.mp4'
      const declared = Number(req.headers['content-length'] ?? 0)
      if (declared > MAX_UPLOAD) return this.json(res, 413, { error: 'File troppo grande.' })
      const dest = this.d.jobs.newUploadPath(name)
      const out = fs.createWriteStream(dest)
      let n = 0
      try {
        for await (const c of req) {
          n += (c as Buffer).length
          if (n > MAX_UPLOAD) throw new Error('File troppo grande.')
          if (!out.write(c)) await new Promise<void>((r) => out.once('drain', () => r()))
        }
        await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())))
      } catch (e) {
        out.destroy()
        fs.rmSync(dest, { force: true })
        throw e
      }
      if (!n) {
        fs.rmSync(dest, { force: true })
        return this.json(res, 400, { error: 'File vuoto.' })
      }
      return this.json(res, 200, { uploadId: path.basename(dest), size: n, name })
    }
    if (p === '/api/jobs' && method === 'GET') return this.json(res, 200, { jobs: this.d.jobs.list() })
    if (p === '/api/jobs' && method === 'POST') {
      const body = (await this.readBody(req)) as Partial<JobOptions> & { uploadId?: string; name?: string }
      const id = String(body.uploadId ?? '')
      if (!/^[\w.-]+$/.test(id)) return this.json(res, 400, { error: 'Caricamento non valido.' })
      const job = this.d.jobs.create(path.join(this.d.jobs.uploadsDir, id), String(body.name ?? 'video.mp4'), {
        templateId: String(body.templateId ?? ''),
        language: String(body.language ?? ''),
        resolution: String(body.resolution ?? ''),
        title: String(body.title ?? '')
      })
      return this.json(res, 200, { job })
    }
    const m = /^\/api\/jobs\/([\w-]+)(\/(result|cancel))?$/.exec(p)
    if (m) {
      const id = m[1]
      if (!m[3] && method === 'GET') {
        const j = this.d.jobs.get(id)
        return j ? this.json(res, 200, { job: j }) : this.json(res, 404, { error: 'Lavoro non trovato.' })
      }
      if (m[3] === 'cancel' && method === 'POST') return this.json(res, 200, { ok: this.d.jobs.cancel(id) })
      if (m[3] === 'result' && (method === 'GET' || method === 'HEAD')) {
        const f = this.d.jobs.resultPath(id)
        if (!f || !fs.existsSync(f)) return this.json(res, 404, { error: 'Risultato non disponibile.' })
        return this.sendFile(req, res, f, { download: url.searchParams.has('download') ? path.basename(f) : undefined })
      }
    }
    return this.json(res, 404, { error: 'Percorso sconosciuto.' })
  }

  private serveStatic(req: http.IncomingMessage, res: http.ServerResponse, p: string): void {
    const root = path.resolve(this.d.staticDir)
    let rel = decodeURIComponent(p).replace(/^\/+/, '')
    if (!rel) rel = 'index.html'
    let file = path.resolve(root, rel)
    if (!file.startsWith(root)) {
      res.writeHead(403)
      res.end()
      return
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Web app mobile non trovata: esegui "npm run build".')
      return
    }
    const immutable = /[.-][\w-]{8,}\.(js|css|wasm)$/.test(file)
    this.sendFile(req, res, file, { cache: immutable ? 'public, max-age=31536000, immutable' : 'no-cache' })
  }
}
