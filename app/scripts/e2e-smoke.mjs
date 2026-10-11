// Test end-to-end dell'app Electron reale (richiede `npm run build`).
// Uso: xvfb-run -a node scripts/e2e-smoke.mjs <cartella-output-screenshot>
// Variabili opzionali: WHISPER_CLI, WHISPER_MODEL, E2E_VIDEO, E2E_MUSIC, E2E_IMAGE

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'

const shots = path.resolve(process.argv[2] ?? 'e2e-shots')
fs.mkdirSync(shots, { recursive: true })
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowcut-e2e-'))
const userData = path.join(tmp, 'userdata')
const projectsDir = path.join(tmp, 'progetti')
fs.mkdirSync(projectsDir, { recursive: true })

const video = process.env.E2E_VIDEO ?? path.join(root, '.test-work', 'media', 'speech.mp4')
const music = process.env.E2E_MUSIC ?? path.join(root, '.test-work', 'media', 'music.mp3')
const image = process.env.E2E_IMAGE ?? path.join(root, '.test-work', 'media', 'logo.png')

let step = 0
const log = (m) => console.log(`[e2e] ${m}`)

const app = await electron.launch({
  executablePath: electronPath,
  args: ['--no-sandbox', root],
  env: { ...process.env, FLOWCUT_USER_DATA: userData },
  timeout: 60000
})
const page = await app.firstWindow()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[renderer error]', m.text())
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.setViewportSize({ width: 1600, height: 960 }).catch(() => undefined)
const shot = async (name) => {
  const f = path.join(shots, `${String(++step).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: f })
  log(`screenshot ${f}`)
}

// Le finestre di dialogo native vengono sostituite da risposte predefinite.
async function stubOpenDialog(paths) {
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: p })
  }, paths)
}

try {
  await page.waitForSelector('.welcome', { timeout: 30000 })
  if (process.env.WHISPER_CLI) {
    await page.evaluate(
      async ([cli, model]) => window.api.setSettings({ whisperCliPath: cli, whisperModelPath: model, defaultLanguage: 'en' }),
      [process.env.WHISPER_CLI, process.env.WHISPER_MODEL]
    )
    await page.reload()
    await page.waitForSelector('.welcome')
  }
  await page.waitForTimeout(1500)
  await shot('benvenuto')

  // Nuovo progetto
  await page.click('text=Nuovo progetto')
  await page.fill('.modal input.input >> nth=0', 'Video di prova')
  await page.fill('.modal input.input >> nth=1', projectsDir)
  await page.click('.modal >> text=Crea progetto')
  await page.waitForSelector('.react-flow__node', { timeout: 20000 })
  await page.waitForTimeout(800)
  await shot('progetto-vuoto')

  // Importazione file
  await stubOpenDialog([video, music, image])
  await page.click('.dropzone')
  await page.waitForSelector('.media-item', { timeout: 20000 })
  await page.waitForTimeout(1000)

  // Lingua inglese per il campione vocale.
  await page.click('.react-flow__node >> text=Trascrizione')
  await page.waitForTimeout(300)
  await page.selectOption('.props-head ~ .panel-body select >> nth=1', 'en')
  await shot('importati-trascrizione-selezionata')

  // Esecuzione dell'intero workflow
  await page.click('text=Esegui workflow')
  await page.waitForTimeout(1500)
  await shot('in-esecuzione')
  await page.waitForFunction(() => !document.querySelector('.fnode.running') && document.querySelector('.topbar .btn.danger') === null, null, { timeout: 600000 })
  await page.waitForTimeout(1000)
  await shot('workflow-completato')
  const statuses = await page.$$eval('.fnode', (els) => els.map((e) => `${e.querySelector('.fnode-title')?.textContent}: ${e.querySelector('.badge')?.textContent}`))
  log('stati: ' + statuses.join(' | '))

  // Proprietà del taglio pause con l'elenco dei tagli
  await page.click('.react-flow__node >> text=Taglio pause')
  await page.waitForTimeout(800)
  await shot('taglio-pause')

  // Sottotitoli
  await page.click('.react-flow__node >> text=Sottotitoli')
  await page.waitForTimeout(800)
  await shot('sottotitoli')

  // Anteprima veloce del nodo testi
  await page.click('.react-flow__node >> text=Schermata finale')
  await page.waitForTimeout(500)
  await page.click('.props-actions >> text=Completa')
  await page.waitForFunction(() => !document.querySelector('.player-overlay'), null, { timeout: 300000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    const v = document.querySelector('video')
    if (v) v.currentTime = 3.2
  })
  await page.waitForTimeout(1500)
  await shot('anteprima-renderizzata')

  // Esportazione
  await page.click('.react-flow__node >> text=Esportazione')
  await page.waitForTimeout(800)
  await shot('esportazione')

  // Tema chiaro
  await page.click('.topbar >> [title="Tema chiaro"]')
  await page.waitForTimeout(800)
  await shot('tema-chiaro')

  // Annulla / ripeti: elimina un nodo e annulla
  const before = await page.$$eval('.react-flow__node', (n) => n.length)
  await page.click('.react-flow__node >> text=Musica', { button: 'right' })
  await page.click('.ctx-menu >> text=Elimina')
  const after = await page.$$eval('.react-flow__node', (n) => n.length)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  const restored = await page.$$eval('.react-flow__node', (n) => n.length)
  log(`nodi: ${before} → elimina ${after} → annulla ${restored}`)
  if (!(after === before - 1 && restored === before)) throw new Error('Annulla/ripeti non funziona')

  // Impostazioni
  await page.click('.topbar >> [title="Impostazioni e strumenti"]')
  await page.waitForTimeout(1200)
  await shot('impostazioni')
  log(`progetto in ${projectsDir}`)
  const exported = fs.readdirSync(path.join(projectsDir, 'Video di prova', 'export'))
  log('file esportati: ' + exported.join(', '))
} catch (e) {
  await shot('errore').catch(() => undefined)
  console.error(e)
  process.exitCode = 1
} finally {
  await app.close()
}
