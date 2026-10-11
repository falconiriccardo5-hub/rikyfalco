// Web app per iPhone in un browser con emulazione iPhone (Chromium).
// Richiede `npm run build:mobile`. Eseguito solo con MOBILE_E2E=1.
//   MOBILE_E2E=1 [SHOTS=cartella] [SPEECH_VIDEO=video-parlato.mp4] npx vitest run tests/mobile.e2e.test.ts

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, devices, type Browser, type Page } from 'playwright-core'
import type { EngineEvent } from '../src/shared/types'
import { Engine } from '../src/main/engine/executor'
import { JobManager } from '../src/main/remote/jobs'
import { RemoteServer } from '../src/main/remote/server'
import { Store } from '../src/main/store'
import { probe } from '../src/main/ffmpeg/probe'
import { ROOT, TEST_DIR, makeEnv, makeTestVideo, tools } from './helpers'

/** Scarica dal contesto della pagina il video indicato dal player e lo analizza con ffprobe. */
async function probeResult(page: Page, name: string): Promise<{ width: number; height: number; duration: number; hasAudio: boolean }> {
  const b64 = await page.$eval('video.result', async (v) => {
    const blob = await (await fetch((v as HTMLVideoElement).src)).blob()
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return btoa(s)
  })
  const f = path.join(root, name)
  fs.writeFileSync(f, Buffer.from(b64, 'base64'))
  return probe(tools, f)
}

const enabled = !!process.env.MOBILE_E2E
const root = path.join(TEST_DIR, 'mobile')
const clip = path.join(TEST_DIR, 'media', 'clip.mp4')
const shots = process.env.SHOTS
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

let server: RemoteServer
let browser: Browser
let base = ''
let n = 0

async function shot(page: Page, name: string): Promise<void> {
  if (!shots) return
  fs.mkdirSync(shots, { recursive: true })
  await page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}-${name}.png`) })
}

async function newPage(): Promise<Page> {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], colorScheme: 'dark', serviceWorkers: 'block' })
  // Nell'ambiente di test il browser non usa il proxy: i modelli Whisper (Hugging Face) passano da curl.
  await ctx.route(/^https:\/\/([\w.-]*huggingface\.co|[\w.-]*hf\.co)\//, async (route) => {
    const url = route.request().url()
    try {
      const body = execFileSync('curl', ['-sSL', '--fail', url], { maxBuffer: 1e9 })
      const type = /\.json$/.test(url) ? 'application/json' : 'application/octet-stream'
      await route.fulfill({ status: 200, body, headers: { 'content-type': type, 'access-control-allow-origin': '*' } })
    } catch {
      await route.fulfill({ status: 404, body: '' })
    }
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()))
  return page
}

describe.skipIf(!enabled)('web app iPhone', () => {
  beforeAll(async () => {
    fs.rmSync(root, { recursive: true, force: true })
    await makeTestVideo(clip)
    const staticDir = path.join(ROOT, 'out', 'mobile')
    if (!fs.existsSync(path.join(staticDir, 'index.html'))) throw new Error('Esegui prima npm run build:mobile')
    const store = new Store(path.join(root, 'userdata'))
    const env = await makeEnv()
    let jobs: JobManager | null = null
    const engine = new Engine(async () => ({ ...env, settings: store.getSettings() }), (e: EngineEvent) => jobs?.onEngineEvent(e))
    jobs = new JobManager({ engine, store, getEnv: async () => ({ ...env, settings: store.getSettings() }), root: path.join(root, 'progetti') })
    server = new RemoteServer({
      staticDir, jobs, appVersion: 'test',
      getSettings: () => store.getSettings(), setSettings: (p) => store.setSettings(p), listTemplates: () => store.listTemplates()
    })
    await server.start(0, '127.0.0.1')
    base = `http://127.0.0.1:${server.port}/`
    browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
  })

  afterAll(async () => {
    await browser?.close()
    await server?.stop()
  })

  it('modalità PC: abbina, invia il video, segue il lavoro e mostra il risultato', async () => {
    const page = await newPage()
    await page.goto(base)
    await page.getByText('Abbina questo iPhone').waitFor()
    await shot(page, 'abbinamento')
    await page.fill('input.code', server.status().pairingCode)
    await page.getByRole('button', { name: 'Abbina' }).click()
    await page.getByText('Scegli un video').waitFor()
    await page.setInputFiles('input[type=file]', clip)
    await page.selectOption('.row:has-text("Formato") select', 'v1080')
    await shot(page, 'invio-pc')
    await page.getByRole('button', { name: 'Invia al PC e monta' }).click()
    await page.getByText('Lavori', { exact: true }).first().waitFor()
    await page.waitForTimeout(2500)
    await shot(page, 'lavoro-in-corso')
    await page.getByRole('button', { name: 'Salva nel rullino' }).waitFor({ timeout: 240000 })
    // (Il Chromium dei test non decodifica H.264: il file viene verificato con ffprobe.)
    const r = await probeResult(page, 'da-pc.mp4')
    expect([r.width, r.height]).toEqual([1080, 1920])
    expect(r.hasAudio).toBe(true)
    await shot(page, 'lavoro-pronto')
    await page.context().close()
  }, 300000)

  it('modalità telefono: monta il video con FFmpeg WebAssembly', async () => {
    const page = await newPage()
    // Simula la versione pubblicata (senza PC): le API non rispondono.
    await page.route('**/api/**', (r) => r.fulfill({ status: 404, body: '' }))
    await page.goto(base)
    await page.getByRole('button', { name: 'Sul telefono', exact: true }).click()
    await page.setInputFiles('input[type=file]', clip)
    // Sottotitoli disattivati per questo video (solo toni); formato verticale.
    const sub = page.locator('.row:has-text("Sottotitoli automatici") input')
    if (await sub.isChecked()) await sub.click({ force: true })
    await page.selectOption('.row:has-text("Formato") select', 'vertical')
    await shot(page, 'telefono-opzioni')
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Monta sul telefono' }).click()
    await page.waitForTimeout(4000)
    await shot(page, 'telefono-in-corso')
    await page.getByRole('button', { name: 'Salva nel rullino' }).waitFor({ timeout: 600000 })
    console.log(`[mobile] montaggio sul telefono: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
    const r = await probeResult(page, 'da-telefono.mp4')
    expect([r.width, r.height]).toEqual([720, 1280])
    expect(r.hasAudio).toBe(true)
    // 12 s con 3 pause → circa 8 s.
    expect(r.duration).toBeGreaterThan(7)
    expect(r.duration).toBeLessThan(9.5)
    await shot(page, 'telefono-pronto')
    await page.context().close()
  }, 700000)

  it.skipIf(!process.env.SPEECH_VIDEO)('modalità telefono: sottotitoli con Whisper nel browser', async () => {
    const page = await newPage()
    await page.route('**/api/**', (r) => r.fulfill({ status: 404, body: '' }))
    await page.goto(base)
    await page.getByRole('button', { name: 'Sul telefono', exact: true }).click()
    await page.setInputFiles('input[type=file]', process.env.SPEECH_VIDEO!)
    const sub = page.locator('.row:has-text("Sottotitoli automatici") input')
    if (!(await sub.isChecked())) await sub.click({ force: true })
    await page.selectOption('.row:has-text("Lingua") select', 'en')
    await page.selectOption('.row:has-text("Modello Whisper") select', 'tiny')
    await page.selectOption('.row:has-text("Formato") select', 'source')
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Monta sul telefono' }).click()
    await page.getByRole('button', { name: 'Salva nel rullino' }).waitFor({ timeout: 900000 })
    console.log(`[mobile] con Whisper: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
    const summary = await page.textContent('.summary')
    console.log('[mobile]', summary)
    expect(summary).toMatch(/Trascrizione: \d+ parole/)
    expect(summary).toMatch(/Sottotitoli: \d+/)
    const r = await probeResult(page, 'sottotitoli-telefono.mp4')
    expect(r.duration).toBeGreaterThan(5)
    expect(r.duration).toBeLessThan(14)
    await shot(page, 'telefono-sottotitoli')
    await page.context().close()
  }, 1000000)
})
