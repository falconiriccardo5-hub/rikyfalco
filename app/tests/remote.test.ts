// Accesso dal telefono: server HTTP reale + coda lavori + motore con FFmpeg.

import fs from 'fs'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { EngineEvent, RemoteJob } from '../src/shared/types'
import { Engine } from '../src/main/engine/executor'
import { probe } from '../src/main/ffmpeg/probe'
import { JobManager } from '../src/main/remote/jobs'
import { RemoteServer } from '../src/main/remote/server'
import { Store } from '../src/main/store'
import { TEST_DIR, makeEnv, makeTestVideo, tools } from './helpers'

const root = path.join(TEST_DIR, 'remote')
const video = path.join(TEST_DIR, 'media', 'clip.mp4')
let server: RemoteServer
let base = ''

beforeAll(async () => {
  fs.rmSync(root, { recursive: true, force: true })
  await makeTestVideo(video)
  const staticDir = path.join(root, 'static')
  fs.mkdirSync(staticDir, { recursive: true })
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>FlowCut mobile</title>')
  const store = new Store(path.join(root, 'userdata'))
  const env = await makeEnv()
  let jobs: JobManager | null = null
  const engine = new Engine(async () => ({ ...env, settings: store.getSettings() }), (e: EngineEvent) => jobs?.onEngineEvent(e))
  jobs = new JobManager({ engine, store, getEnv: async () => ({ ...env, settings: store.getSettings() }), root: path.join(root, 'progetti') })
  server = new RemoteServer({
    staticDir,
    jobs,
    getSettings: () => store.getSettings(),
    setSettings: (p) => store.setSettings(p),
    listTemplates: () => store.listTemplates(),
    appVersion: 'test'
  })
  await server.start(0, '127.0.0.1')
  base = `http://127.0.0.1:${server.port}`
})

afterAll(async () => {
  await server?.stop()
})

describe('accesso dal telefono', () => {
  it('abbina, carica, elabora e restituisce il video', async () => {
    expect((await (await fetch(`${base}/`)).text())).toContain('FlowCut mobile')
    expect((await fetch(`${base}/qualsiasi/percorso`)).status).toBe(200) // SPA
    expect(await (await fetch(`${base}/api/ping`)).json()).toMatchObject({ app: 'FlowCut', authorized: false })
    expect((await fetch(`${base}/api/jobs`)).status).toBe(401)

    const bad = await fetch(`${base}/api/pair`, { method: 'POST', body: JSON.stringify({ code: '000000x' }) })
    expect(bad.status).toBe(403)
    const code = server.status().pairingCode
    const pair = await fetch(`${base}/api/pair`, { method: 'POST', body: JSON.stringify({ code, device: 'test' }) })
    const { token } = (await pair.json()) as { token: string }
    expect(token).toMatch(/^[0-9a-f]{48}$/)
    expect(server.status().pairingCode).not.toBe(code) // il codice è monouso
    const auth = { Authorization: `Bearer ${token}` }

    const info = (await (await fetch(`${base}/api/info`, { headers: auth })).json()) as { templates: unknown[]; whisper: boolean }
    expect(info.templates.length).toBeGreaterThan(0)
    expect(info.whisper).toBe(false)

    const up = await fetch(`${base}/api/upload?name=${encodeURIComponent('Il mio video.mp4')}`, {
      method: 'PUT',
      headers: auth,
      body: fs.readFileSync(video)
    })
    const upload = (await up.json()) as { uploadId: string; size: number }
    expect(upload.size).toBe(fs.statSync(video).size)

    const created = await fetch(`${base}/api/jobs`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ uploadId: upload.uploadId, name: 'Il mio video.mp4', templateId: '', language: 'it', resolution: '720p' })
    })
    let job = ((await created.json()) as { job: RemoteJob }).job
    expect(job.status).toMatch(/queued|running/)

    const t0 = Date.now()
    while (!['done', 'error', 'cancelled'].includes(job.status) && Date.now() - t0 < 240000) {
      await new Promise((r) => setTimeout(r, 500))
      job = ((await (await fetch(`${base}/api/jobs/${job.id}`, { headers: auth })).json()) as { job: RemoteJob }).job
    }
    expect(job.error).toBeUndefined()
    expect(job.status).toBe('done')
    expect(job.nodes.length).toBe(12)
    expect(job.nodes.every((n) => n.status === 'done')).toBe(true)
    expect(job.warnings.join(' ')).toMatch(/Whisper/)
    expect(job.resultSize).toBeGreaterThan(10000)

    // Download con Range (necessario per la riproduzione su iPhone).
    const head = await fetch(`${base}/api/jobs/${job.id}/result?token=${token}`, { headers: { Range: 'bytes=0-99' } })
    expect(head.status).toBe(206)
    expect((await head.arrayBuffer()).byteLength).toBe(100)
    const full = await fetch(`${base}/api/jobs/${job.id}/result?download`, { headers: auth })
    expect(full.headers.get('content-disposition')).toContain('attachment')
    const out = path.join(root, 'scaricato.mp4')
    fs.writeFileSync(out, Buffer.from(await full.arrayBuffer()))
    const meta = await probe(tools, out)
    expect(meta.height).toBe(720)
    expect(meta.hasAudio).toBe(true)
  })
})
