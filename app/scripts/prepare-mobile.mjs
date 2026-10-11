// Copia nella web app mobile il motore FFmpeg (WebAssembly) e i font dei sottotitoli.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'src', 'mobile', 'public')
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  if (!fs.existsSync(to) || fs.statSync(to).size !== fs.statSync(from).size) fs.copyFileSync(from, to)
}
const core = path.join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) copy(path.join(core, f), path.join(pub, 'vendor', f))
for (const f of ['Montserrat-Bold.ttf', 'Montserrat-Regular.ttf']) copy(path.join(root, 'resources', 'fonts', f), path.join(pub, 'fonts', f))
console.log('Risorse della web app mobile pronte')
