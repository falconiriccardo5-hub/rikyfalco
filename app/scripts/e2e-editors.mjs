// Secondo test end-to-end: errori, modifica del grafo ed editor dei nodi.
// Uso: xvfb-run -a node scripts/e2e-editors.mjs <cartella-screenshot>

import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import ffprobe from '@ffprobe-installer/ffprobe'

const shots = path.resolve(process.argv[2] ?? 'e2e-shots-editors')
fs.mkdirSync(shots, { recursive: true })
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowcut-e2e2-'))
const projectsDir = path.join(tmp, 'progetti')
fs.mkdirSync(projectsDir, { recursive: true })
const media = path.join(root, '.test-work', 'media')
let step = 0
const log = (m) => console.log(`[e2e] ${m}`)
const assert = (c, m) => {
  if (!c) throw new Error('Verifica fallita: ' + m)
  log('✓ ' + m)
}

const app = await electron.launch({
  executablePath: electronPath,
  args: ['--no-sandbox', root],
  env: { ...process.env, FLOWCUT_USER_DATA: path.join(tmp, 'ud') }
})
const page = await app.firstWindow()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
const shot = async (n) => page.screenshot({ path: path.join(shots, `${String(++step).padStart(2, '0')}-${n}.png`) })
const node = (name) => page.locator('.react-flow__node', { hasText: name })
const badge = async (name) => (await node(name).locator('.badge').textContent())?.trim()
const waitIdle = () => page.waitForFunction(() => !document.querySelector('.fnode.running, .fnode.queued') && !document.querySelector('.topbar .btn.danger'), null, { timeout: 300000 })

try {
  await page.waitForSelector('.welcome')
  await page.click('text=Nuovo progetto')
  await page.fill('.modal input.input >> nth=0', 'Editor')
  await page.fill('.modal input.input >> nth=1', projectsDir)
  await page.click('.modal >> text=Crea progetto')
  await page.waitForSelector('.react-flow__node')
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: p })
  }, [path.join(media, 'clip.mp4'), path.join(media, 'music.mp3'), path.join(media, 'logo.png')])
  await page.click('.dropzone')
  await page.waitForSelector('.media-item')
  await page.waitForTimeout(500)

  // 1. Trascrizione non configurata → errore, i nodi successivi restano bloccati.
  await page.click('text=Esegui workflow')
  await page.waitForTimeout(800)
  await waitIdle()
  await shot('errore-trascrizione')
  assert((await badge('Trascrizione')) === 'Errore', 'la trascrizione senza whisper va in errore')
  assert((await badge('Taglio pause')) === 'In attesa', 'i nodi successivi restano in attesa')
  assert((await badge('Analisi contenuto')) === 'Completato', 'i nodi precedenti sono completati')

  // 2. Elimina Trascrizione e Sottotitoli: la catena si ricollega.
  for (const n of ['Trascrizione', 'Sottotitoli']) {
    await node(n).click({ button: 'right' })
    await page.click('.ctx-menu >> text=Elimina')
    await page.waitForTimeout(200)
  }
  const edges = await page.$$eval('.react-flow__edge', (e) => e.length)
  assert(edges === 9, `catena ricollegata (${edges} collegamenti per 10 nodi)`)

  // 3. Testi: aggiunta di un titolo con testo personalizzato.
  await node('Testi e grafiche').click()
  await page.click('.panel-body >> button:has-text("Titolo")')
  await page.fill('.card textarea', 'Il mio titolo')
  await page.click('.panel-body >> button:has-text("Immagine")')
  await page.selectOption('.card >> nth=1 >> select >> nth=0', { label: 'logo.png' })
  await shot('testi')

  // 4. Zoom manuale con preset.
  await node('Zoom e animazioni').click()
  await page.click('.panel-body >> button:has-text("Punch-in")')
  await shot('zoom')

  // 5. Transizioni su tutti i tagli.
  await node('Transizioni').click()
  await page.selectOption('.panel-body select >> nth=1', 'all')

  // 6. Esecuzione completa.
  await page.click('text=Esegui workflow')
  await page.waitForTimeout(800)
  await waitIdle()
  const all = await page.$$eval('.fnode .badge', (b) => b.map((x) => x.textContent))
  assert(all.every((s) => s === 'Completato'), 'tutti i nodi completati: ' + all.join(', '))
  await shot('completato')

  // 7. Escludi un taglio: il nodo e i successivi diventano "da rieseguire".
  await node('Taglio pause').click()
  await page.waitForSelector('.list-row input[type=checkbox]')
  const cuts = await page.$$eval('.list-row input[type=checkbox]', (c) => c.length)
  assert(cuts >= 2, `${cuts} tagli proposti mostrati`)
  await page.click('.list-row input[type=checkbox] >> nth=1')
  await page.waitForTimeout(300)
  assert((await badge('Taglio pause')) === 'Da rieseguire', 'il nodo modificato è da rieseguire')
  assert((await badge('Esportazione')) === 'Da rieseguire', 'anche i nodi successivi sono da rieseguire')
  assert((await badge('Analisi contenuto')) === 'Completato', 'i nodi precedenti restano validi')
  await shot('taglio-escluso')

  // 8. Annulla ripristina lo stato "completato".
  await page.click('.react-flow__pane')
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  assert((await badge('Esportazione')) === 'Completato', 'annulla ripristina le impostazioni precedenti')
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(300)

  // 9. Esporta e verifica il file.
  await page.click('.topbar >> text=Esporta')
  await page.waitForTimeout(800)
  await waitIdle()
  await node('Esportazione').click()
  await page.waitForTimeout(500)
  await shot('esportato')
  const out = path.join(projectsDir, 'Editor', 'export', 'clip_montato.mp4')
  assert(fs.existsSync(out), 'file esportato presente')
  const dur = Number(execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString())
  log(`durata esportata: ${dur.toFixed(2)} s`)
  assert(dur > 9 && dur < 16, 'durata plausibile (con il taglio escluso e schermata finale)')

  // 10. Salvataggio modello di workflow.
  await page.click('.tabs >> text=Modelli')
  await page.fill('input[placeholder="Nome del modello"]', 'YouTube standard')
  await page.click('.panel-body >> button:has-text("Salva")')
  await page.waitForSelector('text=YouTube standard')
  assert(true, 'modello di workflow salvato')
  await shot('modelli')
} catch (e) {
  await shot('errore').catch(() => undefined)
  console.error(e)
  process.exitCode = 1
} finally {
  await app.close()
}
