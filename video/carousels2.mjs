// Uso: node carousels2.mjs [deck...] → export/<file>/NN.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const counts = {postura: 9, ritenzione: 8, schiena: 8, cellulite: 8, percorsi: 7, glutei: 8, feste: 8, analisi2: 8};
const files = {postura: 'carosello-m2-01-postura', ritenzione: 'carosello-m2-02-ritenzione', schiena: 'carosello-m2-03-schiena', cellulite: 'carosello-m2-04-cellulite', percorsi: 'carosello-m2-05-online-o-studio', glutei: 'carosello-m2-06-glutei-cosce', feste: 'carosello-m2-07-feste', analisi2: 'carosello-m2-08-analisi'};
const decks = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(counts);
const browserExecutable = process.env.BROWSER || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
for (const deck of decks) {
  const dir = `export/${files[deck]}`;
  fs.mkdirSync(dir, {recursive: true});
  for (let i = 0; i < counts[deck]; i++) {
    const inputProps = {deck, index: i};
    const composition = await selectComposition({serveUrl, id: 'Slide2', inputProps, browserExecutable});
    const output = `${dir}/${String(i + 1).padStart(2, '0')}.png`;
    await renderStill({composition, serveUrl, output, inputProps, browserExecutable, imageFormat: 'png'});
  }
  console.log('ok', deck);
}
