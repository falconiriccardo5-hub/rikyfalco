// Genera una maschera terra/mare compatta (equirettangolare) per il globo a punti della dashboard.
// Uso: npm run gen:landmask  →  src/lib/landmask.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);

const W = 180, H = 90; // 2° per cella
let bits = '';
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const lon = -180 + (x + 0.5) * (360 / W);
    const lat = 90 - (y + 0.5) * (180 / H);
    bits += geoContains(land, [lon, lat]) ? '1' : '0';
  }
}
// impacchetta in base64
const bytes = new Uint8Array(Math.ceil(bits.length / 8));
for (let i = 0; i < bits.length; i++) if (bits[i] === '1') bytes[i >> 3] |= 1 << (7 - (i & 7));
const b64 = Buffer.from(bytes).toString('base64');
writeFileSync('src/lib/landmask.ts',
`// File generato da scripts/gen-landmask.mjs — non modificare a mano.
export const LAND_W = ${W};
export const LAND_H = ${H};
export const LAND_B64 = '${b64}';
`);
console.log('landmask ok', bits.split('1').length - 1, 'celle di terra');
