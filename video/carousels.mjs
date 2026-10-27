// Uso: node carousels.mjs scheda percorso  → out/carousel/<deck>_NN.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const counts = {scheda: 10, percorso: 6, spalle: 8, settimana: 8};
const decks = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(counts);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
fs.mkdirSync('out/carousel', {recursive: true});
for (const deck of decks) {
  for (let i = 0; i < counts[deck]; i++) {
    const inputProps = {deck, index: i};
    const composition = await selectComposition({serveUrl, id: 'Slide', inputProps, browserExecutable});
    const output = `out/carousel/${deck}_${String(i + 1).padStart(2, '0')}.png`;
    await renderStill({composition, serveUrl, output, inputProps, browserExecutable, imageFormat: 'png'});
    console.log('ok', output);
  }
}
