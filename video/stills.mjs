// Uso: node stills.mjs 10 45 80 ...   (secondi o frame con prefisso f)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';

const args = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comp = await selectComposition({serveUrl, id: 'Video11', browserExecutable});
for (const a of args) {
  const frame = a.startsWith('f') ? Number(a.slice(1)) : Math.round(Number(a) * 30);
  const out = `out/still_${String(frame).padStart(4, '0')}.jpg`;
  await renderStill({composition: comp, serveUrl, output: out, frame, browserExecutable, imageFormat: 'jpeg', jpegQuality: 85});
  console.log('ok', out);
}
