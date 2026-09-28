'use strict';
/*
 * Pioggia Nera — pixel art.
 * Tutto è disegnato in codice: sprite come righe di caratteri, stanza e
 * oggetti con rettangoli pixel per pixel. Risoluzione logica 320x180.
 */
const Art = (() => {
  const W = 320, H = 180;

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctx = (c) => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; };
  const R = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  function sprite(rows, pal, scale = 1) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = mk(w * scale, h * scale), g = ctx(c);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (col) R(g, col, x * scale, y * scale, scale, scale);
      }
    });
    return c;
  }

  function flip(src) {
    const c = mk(src.width, src.height), g = ctx(c);
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }

  function line(g, col, x0, y0, x1, y1) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = col;
    for (;;) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Font 3x5 per scritte minuscole dentro il mondo (insegne, quadrante).
  const GLYPHS = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['###', '#..', '#..', '#..', '###'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
    H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
    L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
    O: ['###', '#.#', '#.#', '#.#', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['###', '#..', '###', '..#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    '.': ['...', '...', '...', '...', '.#.'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 6: ['.##', '#..', '###', '#.#', '###'],
    7: ['###', '..#', '.#.', '.#.', '.#.'], 9: ['###', '#.#', '###', '..#', '##.'],
  };
  function text(g, str, x, y, col) {
    let cx = x;
    for (const ch of String(str)) {
      const gl = GLYPHS[ch];
      if (gl) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r][c] === '#') R(g, col, cx + c, y + r);
      cx += 4;
    }
  }

  // ───────────────────────────── Personaggi ─────────────────────────────
  // Gli sprite guardano di 3/4 verso sinistra; verso destra vengono specchiati.

  const DANTE_PAL = {
    k: '#120d0b', H: '#6e5519', h: '#56420f', j: '#8b6d2b', b: '#46350b',
    r: '#3a241e', R: '#4a2e24', s: '#f5d8bd', S: '#dfb291',
    w: '#f4f2ee', e: '#4f6d8f', E: '#5b3a25',
    c: '#3b3735', C: '#534c48', d: '#282423', W: '#e6e2dc', t: '#5e3426',
    p: '#6e5519', P: '#54410f', o: '#6b3b1c', x: '#0b0b0d',
  };
  const DANTE_FRONT = [
    '......kkkkkkk.....',
    '.....kjjjHHHHkk...',
    '....kjHHHHHHHHHk..',
    '...kHHHHHHHHHHHhk.',
    '..kHHHHHHHHHHHHhk.',
    '.kbbbbbbbbbbbbbhk.',
    'kbbbbbbbbbbbbbbbk.',
    'kkkkSSSSSSSSSrrrk.',
    '...kssssssssssrrk.',
    '...kwessssEwssrrk.',
    '...kwessssEwssrrk.',
    '...kssssssssssrrk.',
    '...kRsssssssssRrk.',
    '...kRRsssSssRRRk..',
    '....kRRRRRRRRRk...',
    '...kcccWtWcccck...',
    '..kccccWtWccCcck..',
    '..kdcccWtWccCcdk..',
    '..kdccccWcccCcdk..',
    '..kskcccccccckskk.',
  ];
  const DANTE_BACK = [
    '......kkkkkkk.....',
    '.....kHHHjjHHkk...',
    '....kHHHHHHHHHHk..',
    '...kHHHHHHHHHHHhk.',
    '...khHHHHHHHHHHhk.',
    '..kbbbbbbbbbbbbbbk',
    '.kbbbbbbbbbbbbbbbk',
    '..kkrrrrrrrrrrrkk.',
    '...krrrrrrrrrrrk..',
    '...krrrrrrrrrrrk..',
    '...krrrrrrrrrrrk..',
    '...krrrrrrrrrrrk..',
    '...kSrrrrrrrrrSk..',
    '....kSSSSSSSSSk...',
    '....kcccccccccck..',
    '...kccccccccccck..',
    '..kcccccccccccck..',
    '..kdccccccccccdk..',
    '..kdcccccdccccdk..',
    '..kskccccdccckskk.',
  ];
  const DANTE_FACES = {
    normal: {},
    blink: { 9: '...kssssssssssrrk.', 10: '...kkksssskkssrrk.' },
    narrow: { 9: '...kkksssskkssrrk.' },
  };
  const DANTE_LEGS = {
    stand: ['...kkppppppppkk...', '....kppPkkppPk....', '....kooPkkooPk....', '.....kkk..kkk.....'],
    walkA: ['...kkppppppppkk...', '....kppPkkooPk....', '....kooPk.kkkk....', '.....kkk..........'],
    walkB: ['...kkppppppppkk...', '....kooPkkppPk....', '....kkkk.kooPk....', '..........kkk.....'],
  };

  const LUCIA_PAL = {
    k: '#140c0c', a: '#7c2f1d', A: '#a8492b', q: '#521b10',
    s: '#f6dac2', S: '#e2b596', w: '#f6f3ef', g: '#3f7d55', l: '#c4665c',
    m: '#b5302b', M: '#d44a3d', n: '#7a1d1a', W: '#e9dfc9', y: '#e1b45c',
    z: '#2b2431', o: '#18121a',
  };
  const LUCIA_FRONT = [
    '......kkkkkk......',
    '....kkaAAAaakk....',
    '...kaAAaaaaaaak...',
    '..kaAaaaaaaaaaak..',
    '..kaaaaaaaaaaaaak.',
    '..kaaaqaaaaqaaaak.',
    '..kaaqssqsssqsaak.',
    '..kaqssssssssssak.',
    '..kasssssssssssak.',
    '..kaswgssssgwssak.',
    '..kaswgssssgwssak.',
    '..kasssssssssssak.',
    '..kaassssllsssaak.',
    '..kaaasssssssaaak.',
    '..kaaakmWWWmkaaak.',
    '..kaakmmWyWmmkaak.',
    '..kakmmmmymmMmmkk.',
    '...kmmmmmymmMmmk..',
    '...knmmmmymmMmnk..',
    '...ksnmmmmmmmnsk..',
  ];
  const LUCIA_FACES = {
    normal: {},
    blink: { 9: '..kasssssssssssak.', 10: '..kaskksssskkssak.' },
    sad: { 9: '..kasSSssssSSssak.' },
    scared: { 9: '..kaswwsssswwssak.', 12: '..kaasssskssssaak.' },
    smile: { 12: '..kaassslllsssaak.' },
  };
  const LUCIA_LEGS = {
    stand: ['....knmmmmmmmnk...', '.....kzzk.kzzk....', '.....kook.kook....', '......kk...kk.....'],
    walkA: ['....knmmmmmmmnk...', '.....kzzk.kook....', '.....kook..kk.....', '......kk..........'],
    walkB: ['....knmmmmmmmnk...', '.....kook.kzzk....', '......kk..kook....', '...........kk.....'],
    sit: ['..knnmmmmmmnnk....', '.kzzzzzzzzzk......', '.kzk..kzk.........', '.kok..kok.........'],
  };

  function makeChar(def) {
    const cache = new Map();
    function frame(pose, face, legs) {
      const key = pose + '|' + face + '|' + legs;
      if (cache.has(key)) return cache.get(key);
      const base = pose === 'back' ? def.back : def.front;
      const rows = base.slice();
      const ov = (pose === 'back' ? null : def.faces[face]) || {};
      for (const k in ov) rows[k] = ov[k];
      const all = rows.concat(def.legs[legs] || def.legs.stand);
      const c = sprite(all, def.pal);
      const pair = { left: c, right: flip(c) };
      cache.set(key, pair);
      return pair;
    }
    return { frame, pal: def.pal, name: def.name };
  }

  const chars = {
    dante: makeChar({ name: 'dante', front: DANTE_FRONT, back: DANTE_BACK, faces: DANTE_FACES, legs: DANTE_LEGS, pal: DANTE_PAL }),
    lucia: makeChar({ name: 'lucia', front: LUCIA_FRONT, back: LUCIA_FRONT, faces: LUCIA_FACES, legs: LUCIA_LEGS, pal: LUCIA_PAL }),
  };

  // Ritratto per il box dei dialoghi: la testa dello sprite (righe 0-15).
  function portrait(g, who, face) {
    const ch = chars[who];
    if (!ch) return;
    const f = ch.frame('front', face || 'normal', 'stand').left;
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.drawImage(f, 0, 0, 18, 16, 0, 0, 18, 16);
  }

  // ───────────────────────────── Stanza ─────────────────────────────

  const WIN = { x: 136, y: 18, w: 62, h: 58 };
  const GLASS = { x: 25, y: 33, w: 22, h: 28 };

  function disc(g, cx, cy, r, fn) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d <= r + 0.3) { const col = fn(x, y, d); if (col) R(g, col, cx + x, cy + y); }
    }
  }

  function buildRoom() {
    const c = mk(W, H), g = ctx(c), r = rng(7);

    // parete
    R(g, '#20272a', 0, 0, W, 100);
    for (let x = 0; x < W; x += 10) R(g, '#252d30', x, 4, 2, 68);
    for (let y = 10; y < 70; y += 10) for (let x = 5; x < W; x += 10) R(g, '#2c3538', x, y);
    R(g, '#14191b', 0, 0, W, 3); R(g, '#2e383b', 0, 3, W, 1);
    // boiserie
    R(g, '#34251b', 0, 72, W, 24); R(g, '#4b3526', 0, 72, W, 2); R(g, '#5b4231', 0, 72, W, 1);
    for (let x = 4; x < W; x += 34) {
      R(g, '#2b1f16', x, 77, 28, 1); R(g, '#2b1f16', x, 77, 1, 15);
      R(g, '#3f2d21', x + 27, 77, 1, 15); R(g, '#3f2d21', x, 91, 28, 1);
    }
    R(g, '#1a120d', 0, 96, W, 4); R(g, '#2a1d14', 0, 96, W, 1);

    // pavimento a doghe
    for (let y = 100, i = 0; y < H; y += 6, i++) {
      R(g, i % 2 ? '#37271b' : '#3c2b1e', 0, y, W, 6);
      R(g, '#23170f', 0, y, W, 1);
      let x = Math.floor(r() * 40) - 40;
      while (x < W) { x += 30 + Math.floor(r() * 40); R(g, '#2a1c12', x, y + 1, 1, 5); }
      for (let k = 0; k < 6; k++) R(g, '#45321f', Math.floor(r() * W), y + 2 + Math.floor(r() * 3), 2 + Math.floor(r() * 4), 1);
    }
    // ombra sotto il battiscopa
    R(g, '#241910', 0, 100, W, 2);

    // tappeto
    const rx = 150, ry = 136, rw = 150, rh = 32;
    R(g, '#6b5530', rx, ry, rw, rh);
    R(g, '#4c1b1d', rx + 2, ry + 2, rw - 4, rh - 4);
    R(g, '#5d2426', rx + 5, ry + 5, rw - 10, 1); R(g, '#5d2426', rx + 5, ry + rh - 6, rw - 10, 1);
    R(g, '#5d2426', rx + 5, ry + 5, 1, rh - 10); R(g, '#5d2426', rx + rw - 6, ry + 5, 1, rh - 10);
    for (let x = rx + 4; x < rx + rw - 4; x += 4) { R(g, '#8a7040', x, ry + 1); R(g, '#8a7040', x + 2, ry + rh - 2); }
    for (let k = 0; k < 5; k++) {
      const cx = rx + 20 + k * 27, cy = ry + rh / 2;
      for (let d = 0; d < 5; d++) { R(g, '#6e2c2a', cx - d, cy - 4 + d); R(g, '#6e2c2a', cx + d, cy - 4 + d); R(g, '#6e2c2a', cx - d, cy + 4 - d); R(g, '#6e2c2a', cx + d, cy + 4 - d); }
      R(g, '#9a7a44', cx, cy);
    }
    for (let y = ry + 1; y < ry + rh - 1; y += 2) { R(g, '#7a6a48', rx - 2, y, 2, 1); R(g, '#7a6a48', rx + rw, y, 2, 1); }

    // porta (il vetro è dinamico)
    R(g, '#1c130c', 16, 24, 40, 76);
    R(g, '#3a2718', 18, 26, 36, 74);
    R(g, '#4a3120', 19, 26, 34, 1);
    R(g, '#4b3322', 21, 29, 30, 71);
    for (const [py, ph] of [[66, 14], [83, 13]]) {
      R(g, '#3f2a1c', 24, py, 24, ph);
      R(g, '#5a3e2a', 24, py, 24, 1); R(g, '#5a3e2a', 24, py, 1, ph);
      R(g, '#2e1f14', 24, py + ph - 1, 24, 1); R(g, '#2e1f14', 47, py, 1, ph);
    }
    R(g, '#2e1f14', 24, 32, 24, 1); R(g, '#2e1f14', 24, 32, 1, 30);
    R(g, '#5a3e2a', 24, 61, 24, 1); R(g, '#5a3e2a', 47, 32, 1, 30);
    R(g, '#6b5a3a', 21, 36, 1, 3); R(g, '#6b5a3a', 21, 84, 1, 3);
    R(g, '#e0b862', 46, 68, 2, 1); R(g, '#b08840', 46, 69, 2, 1); R(g, '#6e5020', 46, 70, 2, 1); R(g, '#120c08', 47, 72);
    // numero civico dell'ufficio sopra la porta
    R(g, '#141010', 30, 19, 12, 7); text(g, '3C', 32, 20, '#b08840');

    // attaccapanni con impermeabile
    R(g, '#2b1d12', 63, 38, 2, 61);
    R(g, '#3d2a1a', 63, 38, 1, 61);
    R(g, '#3d2a1a', 61, 36, 6, 2); R(g, '#2b1d12', 62, 35, 4, 1);
    R(g, '#2b1d12', 58, 40, 5, 1); R(g, '#2b1d12', 65, 40, 5, 1); R(g, '#2b1d12', 58, 39, 1, 1); R(g, '#2b1d12', 69, 39, 1, 1);
    R(g, '#2b1d12', 58, 98, 12, 2); R(g, '#3d2a1a', 58, 98, 12, 1);
    // impermeabile appeso
    for (let y = 0; y < 40; y++) {
      const half = Math.min(6, 3 + Math.floor(y / 5));
      const cx = 68;
      R(g, '#1f170e', cx - half - 1, 42 + y, half * 2 + 3, 1);
      R(g, '#5f523a', cx - half, 42 + y, half * 2 + 1, 1);
      R(g, '#74664a', cx - half + 1, 42 + y, Math.max(1, half - 1), 1);
      R(g, '#4a402c', cx + 1, 42 + y, 1, 1);
    }
    R(g, '#1f170e', 62, 82, 13, 1);
    R(g, '#3e3524', 62, 60, 13, 2); R(g, '#8a7a50', 67, 60, 2, 2);
    R(g, '#74664a', 65, 42, 2, 4); R(g, '#74664a', 70, 42, 2, 4); R(g, '#1f170e', 67, 42, 3, 6);
    // schedario
    R(g, '#48503f', 76, 54, 24, 46); R(g, '#394030', 97, 54, 3, 46); R(g, '#5a634e', 76, 54, 24, 2);
    R(g, '#2a2f23', 76, 99, 24, 1);
    for (let i = 0; i < 3; i++) {
      const y = 58 + i * 14;
      R(g, '#343b2d', 78, y, 18, 12); R(g, '#515a45', 79, y + 1, 16, 10);
      R(g, '#5f6951', 79, y + 1, 16, 1);
      R(g, '#a3a894', 84, y + 7, 6, 1); R(g, '#6e735f', 84, y + 8, 6, 1);
      R(g, '#d8d0b0', 85, y + 3, 4, 2);
    }
    R(g, '#8a8060', 86, 88, 2, 2); // serratura dell'ultimo cassetto
    // foto incorniciata
    R(g, '#1a1410', 80, 42, 13, 12); R(g, '#6b5530', 80, 42, 13, 1);
    R(g, '#8a7e62', 82, 44, 9, 8); R(g, '#a39676', 82, 44, 9, 2);
    R(g, '#2a2218', 84, 46, 2, 5); R(g, '#2a2218', 88, 46, 2, 5); R(g, '#3a3020', 84, 45, 2, 1); R(g, '#3a3020', 88, 45, 2, 1);
    R(g, '#1a1410', 91, 50, 1, 4);

    // tavolino e radio
    R(g, '#4a3020', 104, 84, 22, 3); R(g, '#5d3e2a', 104, 84, 22, 1);
    R(g, '#33200f', 106, 87, 2, 13); R(g, '#33200f', 122, 87, 2, 13);
    R(g, '#6b4120', 107, 72, 17, 12); R(g, '#6b4120', 109, 70, 13, 2); R(g, '#6b4120', 111, 69, 9, 1);
    R(g, '#8a5a30', 109, 70, 13, 1); R(g, '#8a5a30', 107, 72, 1, 12);
    R(g, '#3a2414', 110, 72, 11, 7);
    for (let x = 111; x < 121; x += 2) R(g, '#5a3818', x, 72, 1, 7);
    R(g, '#2a180c', 110, 80, 11, 3);
    R(g, '#c9a25a', 108, 81, 1, 1); R(g, '#c9a25a', 122, 81, 1, 1);

    // tende e finestra (il vetro è dinamico)
    R(g, '#2c2220', 132, 14, 70, 66);
    R(g, '#3d302b', 133, 15, 68, 1);
    R(g, '#6b5530', 122, 9, 90, 2); R(g, '#8a7040', 122, 9, 90, 1);
    R(g, '#8a7040', 120, 8, 3, 4); R(g, '#8a7040', 211, 8, 3, 4);
    for (const [cx, dir] of [[124, 1], [200, -1]]) {
      for (let x = 0; x < 11; x++) {
        const col = x % 3 === 0 ? '#2a0e10' : (x % 3 === 1 ? '#3b1517' : '#4b1d1f');
        const gx = cx + x;
        const pinch = (y) => Math.abs(y - 52) < 3 ? 2 : 0;
        for (let y = 11; y < 90; y++) {
          const inset = dir === 1 ? (x > 8 - pinch(y) ? 1 : 0) : (x < 2 + pinch(y) ? 1 : 0);
          if (!inset) R(g, col, gx, y);
        }
      }
      R(g, '#6b5530', cx + (dir === 1 ? 2 : 1), 51, 8, 2);
    }
    R(g, '#4a3528', 128, 80, 78, 3); R(g, '#5e4533', 128, 80, 78, 1); R(g, '#1d1512', 130, 83, 74, 1);

    // orologio a muro
    disc(g, 244, 34, 7, (x, y, d) => d > 6 ? '#3a2a1c' : (d > 5.2 ? '#8a6a34' : '#d8cdb0'));
    for (const [x, y] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) R(g, '#3a2a1c', 244 + x, 34 + y);
    line(g, '#1e1610', 244, 34, 244, 30); line(g, '#1e1610', 244, 34, 239, 33);
    R(g, '#9a2a22', 244, 34);

    // lavagna di sughero con mappa
    R(g, '#3d2817', 293, 25, 26, 38); R(g, '#8a6a40', 295, 27, 22, 34);
    const rr = rng(3);
    for (let k = 0; k < 60; k++) R(g, rr() > 0.5 ? '#76592f' : '#9a7a4c', 295 + Math.floor(rr() * 22), 27 + Math.floor(rr() * 34));
    R(g, '#c9bf9c', 297, 29, 18, 20);
    for (let y = 29; y < 49; y++) { const edge = 297 + 18 - Math.floor(4 + (y - 29) * 0.45 + Math.sin(y * 0.9) * 1.5); R(g, '#7f9294', edge, y, 315 - edge, 1); }
    R(g, '#7f9294', 297, 45, 10, 4);
    for (let x = 299; x < 311; x += 4) R(g, '#aa9f7e', x, 29, 1, 16);
    for (let y = 32; y < 45; y += 4) R(g, '#aa9f7e', 297, y, 12, 1);
    R(g, '#e6dcc4', 297, 52, 8, 7); R(g, '#9a958a', 298, 54, 6, 1); R(g, '#9a958a', 298, 56, 5, 1);
    R(g, '#a9a189', 308, 51, 7, 9); R(g, '#3a342c', 310, 53, 3, 3); R(g, '#3a342c', 309, 56, 5, 4);
    line(g, '#b8322a', 306, 44, 301, 52); line(g, '#b8322a', 310, 40, 311, 51); line(g, '#b8322a', 312, 46, 311, 51);
    for (const [x, y] of [[306, 44], [310, 40], [312, 46]]) { R(g, '#ff5a48', x, y); R(g, '#8a1e18', x, y + 1); }
    R(g, '#e8d070', 300, 51); R(g, '#e8d070', 311, 50);

    // schienale della poltrona dietro la scrivania
    R(g, '#1c0d0b', 249, 74, 19, 19);
    R(g, '#3a1d18', 250, 75, 17, 18);
    R(g, '#20272a', 249, 74); R(g, '#20272a', 267, 74);
    R(g, '#53302a', 250, 75, 17, 1); R(g, '#53302a', 250, 75, 1, 17);
    for (let y = 78; y < 92; y += 4) for (let x = 253; x < 266; x += 4) R(g, '#2a1310', x + ((y / 4) % 2 ? 2 : 0), y);

    return c;
  }

  function buildDesk() {
    const c = mk(W, H), g = ctx(c), r = rng(11);
    // piano
    R(g, '#2e1c10', 203, 91, 89, 1);
    R(g, '#5b3b24', 203, 92, 89, 12);
    for (let k = 0; k < 14; k++) R(g, '#523420', 205 + Math.floor(r() * 80), 93 + Math.floor(r() * 10), 4 + Math.floor(r() * 10), 1);
    R(g, '#77502f', 203, 103, 89, 1); R(g, '#8a6038', 203, 104, 89, 1); R(g, '#3a2416', 203, 105, 89, 1);
    // fronte
    R(g, '#472d1b', 205, 106, 85, 22);
    R(g, '#2e1c10', 205, 126, 85, 2);
    R(g, '#35200f', 205, 106, 1, 20); R(g, '#35200f', 289, 106, 1, 20);
    for (const dx of [208, 265]) {
      for (let i = 0; i < 2; i++) {
        const y = 108 + i * 9;
        R(g, '#35200f', dx, y, 22, 8); R(g, '#523420', dx + 1, y + 1, 20, 6); R(g, '#5d3e26', dx + 1, y + 1, 20, 1);
        R(g, '#c9a25a', dx + 9, y + 4, 4, 1); R(g, '#7a5a2a', dx + 9, y + 5, 4, 1);
      }
    }
    R(g, '#3c2616', 232, 108, 31, 16); R(g, '#523420', 233, 109, 29, 14); R(g, '#5d3e26', 233, 109, 29, 1);
    R(g, '#3c2616', 236, 112, 23, 8);

    // macchina da scrivere con foglio (a sinistra, lontano dalla poltrona)
    R(g, '#e2ddd0', 210, 83, 12, 9); R(g, '#c8c2b2', 210, 91, 12, 1);
    for (let y = 85; y < 90; y += 2) R(g, '#9a958a', 212, y, 7 + (y % 3), 1);
    R(g, '#1c1c1f', 206, 91, 20, 3); R(g, '#3a3a40', 206, 91, 20, 1); R(g, '#c9c9c9', 204, 92, 2, 1);
    R(g, '#2a2b2e', 207, 94, 18, 6); R(g, '#1a1a1c', 207, 99, 18, 1);
    for (let y = 95; y < 99; y += 2) for (let x = 208 + (y % 4 ? 1 : 0); x < 224; x += 2) R(g, '#8a8d90', x, y);
    // bollette sparse
    R(g, '#d9d2bf', 251, 97, 9, 5); R(g, '#c7bfa8', 253, 96, 9, 5); R(g, '#e8e1cc', 255, 95, 8, 5);
    R(g, '#b8322a', 260, 96, 2, 1); R(g, '#9a958a', 256, 97, 5, 1); R(g, '#9a958a', 256, 99, 4, 1);
    // posacenere
    R(g, '#3a3f44', 263, 99, 6, 2); R(g, '#5a6068', 263, 99, 6, 1); R(g, '#e8e0cc', 266, 98, 3, 1); R(g, '#ff7a3a', 268, 98);
    // base della lampada (paralume dinamico)
    R(g, '#7a5a26', 274, 99, 11, 2); R(g, '#c9a25a', 275, 98, 9, 1);
    R(g, '#b08840', 279, 88, 2, 10); R(g, '#e0c070', 279, 88, 1, 10);
    return c;
  }

  // ───────────────────────────── Città ─────────────────────────────

  // Palazzo di fronte visto dalla finestra (coordinate locali 62x58).
  function buildWindowCity() {
    const c = mk(WIN.w, WIN.h), g = ctx(c), r = rng(21);
    const sil = mk(WIN.w, WIN.h), sg = ctx(sil);
    // skyline lontana
    for (let x = 0; x < WIN.w;) {
      const bw = 4 + Math.floor(r() * 7), bh = 3 + Math.floor(r() * 8);
      R(g, '#141c2c', x, 10 - bh, bw, bh + 2); R(sg, '#05060a', x, 10 - bh, bw, bh + 2);
      if (r() > 0.6) R(g, '#e9c46a', x + 1 + Math.floor(r() * (bw - 2)), 10 - bh + 2);
      x += bw;
    }
    R(g, '#141c2c', 44, 0, 2, 4); R(sg, '#05060a', 44, 0, 2, 4);
    // facciata del palazzo di fronte
    R(g, '#121926', 0, 10, WIN.w, 40); R(sg, '#030407', 0, 10, WIN.w, 40);
    R(g, '#1c2533', 0, 10, WIN.w, 2); R(g, '#0b1018', 0, 12, WIN.w, 1);
    const lit = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      const x = 18 + i * 7, y = 16 + j * 9;
      R(g, '#0a0e16', x, y, 4, 5);
      const on = r() < 0.3;
      if (on) lit.push({ x, y, warm: r() > 0.3, blink: r() < 0.3, phase: r() * 10 });
      R(g, '#1a2130', x, y + 5, 4, 1);
    }
    // insegna verticale
    R(g, '#1a0f14', 4, 10, 9, 36); R(g, '#2a1820', 4, 10, 9, 1); R(g, '#0a0608', 12, 10, 1, 36);
    R(sg, '#030407', 4, 10, 9, 36);
    // strada
    R(g, '#0a0d12', 0, 50, WIN.w, 8); R(sg, '#020203', 0, 50, WIN.w, 8);
    R(g, '#161c24', 0, 50, WIN.w, 1);
    // auto nera
    R(g, '#07090c', 34, 53, 20, 5); R(g, '#07090c', 38, 51, 12, 2);
    R(g, '#2a3444', 38, 51, 12, 1); R(g, '#1b2230', 34, 53, 20, 1);
    R(g, '#141a24', 41, 52, 3, 1); R(g, '#141a24', 45, 52, 3, 1);
    R(sg, '#000000', 34, 51, 20, 7);
    return { canvas: c, sil, lit };
  }

  // Skyline a tutto schermo per il titolo.
  function buildSkyline() {
    const c = mk(W, H), g = ctx(c), r = rng(99);
    const lit = [];
    const layers = [
      { col: '#111827', top: 40, var: 50, win: '#6a5a3a', p: 0.10, wmin: 14, wmax: 30 },
      { col: '#0c111c', top: 70, var: 45, win: '#c9a45a', p: 0.12, wmin: 18, wmax: 36 },
      { col: '#080b12', top: 100, var: 30, win: '#e9c46a', p: 0.16, wmin: 24, wmax: 48 },
    ];
    for (const L of layers) {
      for (let x = -10; x < W;) {
        const bw = L.wmin + Math.floor(r() * (L.wmax - L.wmin));
        const top = L.top + Math.floor(r() * L.var);
        R(g, L.col, x, top, bw, H - top);
        if (r() > 0.6) R(g, L.col, x + Math.floor(bw / 2) - 1, top - 6 - Math.floor(r() * 8), 2, 8 + 6);
        if (r() > 0.7) { R(g, L.col, x + 3, top - 4, 6, 4); R(g, L.col, x + 4, top - 5, 4, 1); }
        for (let y = top + 4; y < 150; y += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
          if (r() < L.p) { R(g, L.win, wx, y, 2, 3); if (r() < 0.2) lit.push({ x: wx, y, col: L.win, phase: r() * 20 }); }
        }
        x += bw + Math.floor(r() * 4);
      }
    }
    // strada bagnata
    R(g, '#07090e', 0, 150, W, 30);
    R(g, '#10151e', 0, 150, W, 1);
    for (let x = 0; x < W; x += 3) if (r() > 0.5) R(g, '#0d121a', x, 152 + Math.floor(r() * 26), 2, 1);
    // lampione
    R(g, '#0a0c10', 258, 96, 2, 58); R(g, '#0a0c10', 252, 94, 12, 2); R(g, '#0a0c10', 250, 96, 4, 3);
    R(g, '#0a0c10', 255, 152, 8, 2);
    return { canvas: c, lit };
  }

  // ───────────────────────────── Orologio ─────────────────────────────

  const RAVEN = [
    '..........kkk.........',
    'k........kkkkk.......k',
    'kk.....kkkkokk......kk',
    'kkk.......kkkk.....kkk',
    '.kkkk.....kk.....kkkk.',
    '.kkkkkk..kkkk..kkkkkk.',
    '..kkkkkkkkkkkkkkkkkk..',
    '...kkkkkkkkkkkkkkkk...',
    '....kkkkkkkkkkkkkk....',
    '......kkkkkkkkkk......',
    '........kkkkkk........',
    '.......kkkkkkkk.......',
    '......kkk.kk.kkk......',
    '.....kk...kk...kk.....',
    '..........k...........',
  ];
  const KEY = [
    '..kkkk..........',
    '.kyYYyk.........',
    'kyk..ykkkkkkkkk.',
    'kYk..kYYYYYYYYYk',
    'kyk..ykkkkkykyk.',
    '.kyyyyk....kyk..',
    '..kkkk......k...',
  ];

  const WATCH = { lid: [112, 96], face: [206, 96], r: 36 };
  function goldAt(x, y, d, r) {
    const lum = (-x * 0.7 - y * 0.7) / (d || 1);
    const pal = ['#5e4418', '#8a6a2a', '#b08a3c', '#d4ac58', '#f0d690'];
    const band = d > r - 1.2 ? -1 : 0;
    return pal[clamp(Math.round((lum + 1) * 2) + band, 0, 4)];
  }
  function buildWatchScene() {
    const c = mk(W, H), g = ctx(c), r = rng(5);
    // legno della scrivania
    for (let y = 0; y < H; y++) {
      const base = (Math.sin(y * 0.35) + Math.sin(y * 0.11 + 2)) > 0.6 ? '#3a2416' : '#33200f';
      R(g, base, 0, y, W, 1);
    }
    for (let k = 0; k < 200; k++) R(g, r() > 0.5 ? '#2a180c' : '#452c1a', Math.floor(r() * W), Math.floor(r() * H), 6 + Math.floor(r() * 30), 1);
    // un foglio sotto l'orologio
    R(g, '#1f150c', 60, 142, 70, 30); R(g, '#b8b09a', 58, 140, 70, 30);
    for (let y = 146; y < 166; y += 4) R(g, '#8a8474', 64, y, 40 + (y % 3) * 6, 1);
    // ombra
    for (const [cx] of [WATCH.lid, WATCH.face]) disc(g, cx + 4, 100, WATCH.r, () => 'rgba(10,6,2,0.55)');
    // catena
    let px = 206, py = 44;
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = Math.round(206 + t * 120 + Math.sin(t * 3) * 6), y = Math.round(40 - t * 22 + Math.sin(t * 5) * 8 + t * t * 20);
      if (i % 2) { R(g, '#6e5020', x, y, 4, 2); R(g, '#e0c070', x, y, 3, 1); }
      else { R(g, '#6e5020', x, y - 1, 2, 4); R(g, '#d4ac58', x, y - 1, 1, 3); }
      px = x; py = y;
    }
    // cerniera
    R(g, '#5e4418', 146, 91, 28, 10); R(g, '#b08a3c', 146, 92, 28, 3); R(g, '#f0d690', 146, 92, 28, 1); R(g, '#8a6a2a', 146, 96, 28, 3);
    // coperchio
    const [lx, ly] = WATCH.lid, rad = WATCH.r;
    disc(g, lx, ly, rad, (x, y, d) => {
      if (d > rad - 4) return goldAt(x, y, d, rad);
      if (d > rad - 5) return '#4a3412';
      const ring = Math.floor(d) % 3 === 0 ? '#b08842' : '#bf9a50';
      return (x - y > 20 && x - y < 26) ? '#d8b868' : ring;
    });
    // corvo inciso (x2) con iniziali
    const ox = lx - 22, oy = ly - 20;
    RAVEN.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
      if (row[x] === 'k') { R(g, '#e3c77e', ox + x * 2 + 1, oy + y * 2 + 1, 2, 2); }
    } });
    RAVEN.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
      if (row[x] === 'k') R(g, '#5a4016', ox + x * 2, oy + y * 2, 2, 2);
      if (row[x] === 'o') R(g, '#f0d690', ox + x * 2, oy + y * 2, 2, 2);
    } });
    text(g, 'A.S.', lx - 7, ly + 16, '#6e5020');
    // cassa e quadrante
    const [fx, fy] = WATCH.face;
    disc(g, fx, fy, rad, (x, y, d) => {
      if (d > rad - 4) return goldAt(x, y, d, rad);
      if (d > rad - 5) return '#4a3412';
      if (d > rad - 7) return '#d6caa8';
      return '#ece2c6';
    });
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2;
      const big = i % 5 === 0;
      const rr1 = rad - 8, rr2 = rad - (big ? 11 : 9);
      line(g, big ? '#2e261c' : '#9a8e76', fx + Math.round(Math.sin(a) * rr1), fy - Math.round(Math.cos(a) * rr1), fx + Math.round(Math.sin(a) * rr2), fy - Math.round(Math.cos(a) * rr2));
    }
    text(g, '12', fx - 3, fy - 23, '#2e261c');
    text(g, '3', fx + 19, fy - 2, '#2e261c');
    text(g, '6', fx - 1, fy + 19, '#2e261c');
    text(g, '9', fx - 21, fy - 2, '#2e261c');
    // riflesso sul vetro
    for (let k = -18; k < 6; k++) { R(g, 'rgba(255,255,255,0.35)', fx - 14 + k, fy - 18 - k); R(g, 'rgba(255,255,255,0.18)', fx - 12 + k, fy - 18 - k); }
    // stelo
    R(g, '#8a6a2a', fx - 3, fy - rad - 4, 6, 5); R(g, '#d4ac58', fx - 3, fy - rad - 4, 2, 5);
    // anello
    disc(g, fx, fy - rad - 16, 6, (x, y, d) => d > 4 ? goldAt(x, y, d, 6) : null);
    // vignetta
    const vg = ctx(c);
    const img = vg.getImageData(0, 0, W, H), dd = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x - 180) / 190, ny = (y - 90) / 120;
      let v = clamp(Math.hypot(nx, ny) - 0.35, 0, 1) * 1.1;
      v = Math.round(v * 24) / 24;
      const i = (y * W + x) * 4;
      dd[i] *= 1 - v * 0.85; dd[i + 1] *= 1 - v * 0.85; dd[i + 2] *= 1 - v * 0.8;
    }
    vg.putImageData(img, 0, 0);
    return c;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  const WATCH_TIME = { h: 2, m: 47, s: 38 };
  const WATCH_SPOTS = [
    { id: 'lid', name: 'Coperchio', box: [74, 58, 150, 134] },
    { id: 'face', name: 'Quadrante', box: [168, 58, 244, 134] },
    { id: 'crown', name: 'Corona', box: [194, 38, 218, 62] },
  ];

  function drawWatch(g, t, st) {
    g.drawImage(assets.watchScene, 0, 0);
    const [fx, fy] = WATCH.face;
    const aH = ((WATCH_TIME.h + WATCH_TIME.m / 60) / 12) * Math.PI * 2;
    const aM = (WATCH_TIME.m / 60) * Math.PI * 2;
    const aS = (WATCH_TIME.s / 60) * Math.PI * 2;
    const hand = (a, len, col, thick) => {
      const x1 = fx + Math.round(Math.sin(a) * len), y1 = fy - Math.round(Math.cos(a) * len);
      line(g, col, fx, fy, x1, y1);
      if (thick) { line(g, col, fx + 1, fy, x1 + 1, y1); line(g, col, fx, fy + 1, x1, y1 + 1); }
    };
    hand(aH, 13, '#1e1a14', true);
    hand(aM, 22, '#1e1a14', true);
    hand(aS, 24, '#9a2a22', false);
    R(g, '#b08a3c', fx - 1, fy - 1, 3, 3); R(g, '#f0d690', fx - 1, fy - 1);
    // l'ago che blocca il meccanismo
    line(g, '#c8ccd0', fx + 4, fy + 5, fx + 11, fy + 13); R(g, '#ffffff', fx + 4, fy + 5);
    // corona (si alza quando viene tirata)
    const up = st.crownOut ? 4 : 0;
    const cy = fy - WATCH.r - 10 - up;
    R(g, '#5e4418', fx - 6, cy, 12, 7);
    for (let x = 0; x < 12; x += 2) { R(g, '#e0bc6c', fx - 6 + x, cy, 1, 7); R(g, '#8a6a2a', fx - 5 + x, cy, 1, 7); }
    R(g, '#f0d690', fx - 6, cy, 12, 1);
    if (st.crownOut) { R(g, '#d4ac58', fx - 2, cy + 7, 4, up); }
    // chiave
    if (st.keyOut) {
      const k = assets.key;
      g.globalAlpha = 0.5; g.drawImage(assets.keyShadow, 250, 142); g.globalAlpha = 1;
      g.drawImage(k, 246, 138);
      text(g, '47', 268, 146, '#6e5020');
    }
    // selezione
    const sel = WATCH_SPOTS[st.sel];
    if (sel && st.showSel) {
      const [x0, y0, x1, y1] = sel.box;
      const blink = (Math.floor(t * 3) % 2) ? '#f2e2b0' : '#c9a25a';
      const L = 6;
      for (const [cx, cy2, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, -1 * -1, -1], [x1, y1, -1, -1]]) {
        R(g, blink, sx > 0 ? cx : cx - L + 1, cy2, L, 1);
        R(g, blink, cx, sy > 0 ? cy2 : cy2 - L + 1, 1, L);
      }
    }
    // spuntature per i dettagli già esaminati
    WATCH_SPOTS.forEach((s, i) => {
      if (st.seen[s.id]) { const [, , x1, y1] = s.box; R(g, '#0c0a08', x1 - 5, y1 - 5, 5, 5); R(g, '#8fc27a', x1 - 4, y1 - 2); R(g, '#8fc27a', x1 - 3, y1 - 1); R(g, '#8fc27a', x1 - 2, y1 - 2); R(g, '#8fc27a', x1 - 1, y1 - 3); R(g, '#8fc27a', x1 - 1, y1 - 4); }
    });
  }

  // ───────────────────────────── Luci ─────────────────────────────

  const LAMP = { x: 279, y: 89 };
  function inPatch(x, y) {
    if (y < 103 || y > 150) return 0;
    const v = (y - 103) / 47;
    const xl = 128 - v * 24, xr = xl + 62;
    if (x < xl || x > xr) return 0;
    const u = (x - xl) / 62;
    if (Math.abs(u - 0.5) < 0.025) return 0.15;          // montante verticale
    if (Math.abs(v - 0.52) < 0.03) return 0.15;           // traversa
    if (v > 0.78 && Math.floor((v - 0.78) * 60) % 2 === 0) return 0.3; // lamelle della veneziana
    return 1;
  }

  function buildMasks() {
    const out = {};
    for (const lampOn of [true, false]) {
      const c = mk(W, H), g = ctx(c), img = g.createImageData(W, H), d = img.data;
      const glow = mk(W, H), gg = ctx(glow), gimg = gg.createImageData(W, H), gd = gimg.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let L = lampOn ? 0.24 : 0.07;
        if (lampOn) L += Math.pow(Math.max(0, 1 - Math.hypot(x - 36, (y - 70) * 0.8) / 70), 1.5) * 0.3;
        let lamp = 0;
        if (lampOn) {
          const dx = x - LAMP.x, dy = y - LAMP.y;
          if (dy >= -1) { const dist = Math.hypot(dx * 0.8, dy * 1.05); lamp = Math.pow(Math.max(0, 1 - dist / 135), 1.5) * 1.05; }
          else { const dist = Math.hypot(dx, dy * 1.5); lamp = Math.pow(Math.max(0, 1 - dist / 70), 2) * 0.55; }
          L += lamp;
        }
        const wx = clamp(x, WIN.x, WIN.x + WIN.w), wy = clamp(y, WIN.y, WIN.y + WIN.h);
        const wd = Math.hypot(x - wx, y - wy);
        if (wd === 0) L += 0.8; else L += Math.pow(Math.max(0, 1 - wd / 75), 2) * 0.3;
        L += inPatch(x, y) * 0.2;
        L = Math.min(1, L);
        const a = Math.round((1 - L) * 0.86 * 32) / 32;
        const i = (y * W + x) * 4;
        d[i] = 6; d[i + 1] = 8; d[i + 2] = 16; d[i + 3] = a * 255;
        const ga = Math.round(clamp(lamp, 0, 1) * 0.24 * 32) / 32;
        gd[i] = 255; gd[i + 1] = 172; gd[i + 2] = 88; gd[i + 3] = ga * 255;
      }
      g.putImageData(img, 0, 0);
      gg.putImageData(gimg, 0, 0);
      out[lampOn ? 'on' : 'off'] = { dark: c, glow };
    }
    const p = mk(W, H), pg = ctx(p), pimg = pg.createImageData(W, H), pd = pimg.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = inPatch(x, y);
      if (!v) continue;
      const i = (y * W + x) * 4;
      pd[i] = 120; pd[i + 1] = 150; pd[i + 2] = 205; pd[i + 3] = v * 255;
    }
    pg.putImageData(pimg, 0, 0);
    out.patch = p;
    // vignetta per lo schermo
    const v = mk(W, H), vg = ctx(v), vimg = vg.createImageData(W, H), vd = vimg.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / (W / 2), ny = (y - H / 2) / (H / 2);
      const a0 = clamp(Math.hypot(nx * 0.9, ny) - 0.72, 0, 1) * 1.4;
      const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const a = Math.floor(a0 * 5 + th) / 5;
      const i = (y * W + x) * 4;
      vd[i + 3] = clamp(a, 0, 0.75) * 255;
    }
    vg.putImageData(vimg, 0, 0);
    out.vignette = v;
    return out;
  }

  // ───────────────────────────── Parti dinamiche ─────────────────────────────

  function makeRain(n, w, h, speed) {
    const r = rng(n * 13 + w);
    return Array.from({ length: n }, () => ({ x: r() * (w + 20), y: r() * h, v: speed * (0.8 + r() * 0.5), l: 2 + Math.floor(r() * 3) }));
  }
  function stepRain(drops, dt, w, h) {
    for (const d of drops) {
      d.y += d.v * dt; d.x -= d.v * dt * 0.22;
      if (d.y > h) { d.y -= h + 6; d.x = Math.random() * (w + 20); }
      if (d.x < -4) d.x += w + 20;
    }
  }
  function drawRain(g, drops, ox, oy, col) {
    g.fillStyle = col;
    for (const d of drops) {
      const x = Math.round(ox + d.x), y = Math.round(oy + d.y);
      for (let k = 0; k < d.l; k++) g.fillRect(x + Math.floor(k * 0.22), y - k, 1, 1);
    }
  }

  const winRain = makeRain(46, WIN.w, WIN.h, 150);
  const droplets = Array.from({ length: 16 }, (_, i) => ({ x: (i * 37) % WIN.w, y: (i * 23) % WIN.h, slide: 0, trail: [] }));

  function updateWindow(dt) {
    stepRain(winRain, dt, WIN.w, WIN.h);
    for (const d of droplets) {
      if (!d.slide && Math.random() < dt * 0.08) d.slide = 8 + Math.random() * 18;
      if (d.slide) {
        const oy = d.y; d.y += d.slide * dt;
        if (Math.floor(oy) !== Math.floor(d.y)) { d.trail.push({ x: d.x, y: Math.floor(oy), t: 1.2 }); }
        if (Math.random() < dt * 0.5) d.slide = 0;
        if (d.y > WIN.h) { d.y = Math.random() * 20; d.x = Math.floor(Math.random() * WIN.w); d.slide = 0; }
      }
      d.trail = d.trail.filter(p => (p.t -= dt) > 0);
    }
  }

  function neonOn(t, i) {
    if (i === 2) return false; // la T è morta da anni
    const f = Math.sin(t * 13.7) + Math.sin(t * 5.3);
    if (f > 1.85) return false;
    return !(i === 4 && Math.sin(t * 29) > 0.7);
  }

  function drawWindow(g, t, S) {
    const { x: X, y: Y, w, h } = WIN;
    const flash = S.flash;
    // cielo a bande
    const bands = ['#0b1020', '#0e1426', '#11182b', '#151d31', '#1a2336'];
    for (let i = 0; i < 12; i++) R(g, bands[Math.min(4, Math.floor(i / 2.5))], X, Y + i, w, 1);
    if (flash > 0.05) { g.globalAlpha = Math.min(1, flash * 1.4); R(g, '#b9c6ea', X, Y, w, 12); g.globalAlpha = 1; }
    const city = assets.winCity;
    if (flash > 0.45) g.drawImage(city.sil, X, Y);
    else {
      g.drawImage(city.canvas, X, Y);
      for (const L of city.lit) {
        const on = !L.blink || Math.sin(t * 0.3 + L.phase) > -0.6;
        R(g, on ? (L.warm ? '#d9a84e' : '#8fa6b8') : '#161d2a', X + L.x, Y + L.y, 4, 5);
        if (on) R(g, L.warm ? '#f0c66a' : '#b8cad6', X + L.x, Y + L.y, 4, 1);
      }
      // lampione (solo la testa è visibile) — l'alone viene disegnato dopo le luci
      R(g, '#3a3020', X + 18, Y + 49, 5, 1);
      // insegna HOTEL
      'HOTEL'.split('').forEach((ch, i) => {
        text(g, ch, X + 7, Y + 12 + i * 7, neonOn(t, i) ? '#ff6a8a' : '#3a1a24');
      });
      // luce rossa dell'antenna
      if (Math.sin(t * 2.2) > 0.4) R(g, '#ff3a2a', X + 44, Y);
    }
    // pioggia
    g.save(); g.beginPath(); g.rect(X, Y, w, h); g.clip();
    drawRain(g, winRain, X - 10, Y, flash > 0.3 ? 'rgba(20,24,40,0.8)' : 'rgba(150,172,205,0.55)');
    // gocce sul vetro
    for (const d of droplets) {
      for (const p of d.trail) { g.globalAlpha = p.t / 1.2 * 0.5; R(g, '#7a8ca4', X + p.x, Y + p.y); }
      g.globalAlpha = 1;
      R(g, '#9aaec6', X + d.x, Y + Math.floor(d.y)); R(g, '#3a4a60', X + d.x, Y + Math.floor(d.y) + 1);
    }
    g.restore();
    // veneziana alzata
    for (let y = Y; y < Y + 12; y += 2) { R(g, '#b8ae94', X, y, w, 1); R(g, '#6e6755', X, y + 1, w, 1); }
    R(g, '#8a8270', X, Y + 12, w, 1);
    R(g, '#d8d0b8', X + 50, Y + 12, 1, 14); R(g, '#8a8270', X + 50, Y + 26, 2, 2);
    // montanti
    R(g, '#2c2220', X + 30, Y, 3, h); R(g, '#3d302b', X + 30, Y, 1, h);
    R(g, '#2c2220', X, Y + 29, w, 3); R(g, '#3d302b', X, Y + 29, w, 1);
    R(g, '#1c1614', X, Y, 1, h); R(g, '#1c1614', X, Y, w, 1);
  }

  // Luci che non vengono scurite dalla notte.
  function drawEmissive(g, t, S) {
    const { x: X, y: Y } = WIN;
    if (S.flash < 0.45) {
      'HOTEL'.split('').forEach((ch, i) => {
        if (!neonOn(t, i)) return;
        g.globalAlpha = 0.28; R(g, '#ff4a70', X + 6, Y + 11 + i * 7, 5, 7); g.globalAlpha = 1;
        text(g, ch, X + 7, Y + 12 + i * 7, '#ffb0c0');
      });
      g.globalAlpha = 0.35; R(g, '#f0c060', X + 16, Y + 48, 9, 3); g.globalAlpha = 1;
      R(g, '#ffe6a0', X + 18, Y + 49, 5, 1);
      if (S.carLights) {
        for (let k = 1; k < 16; k++) {
          g.globalAlpha = 0.28 * (1 - k / 16);
          R(g, '#ffe8a0', X + 34 - k, Y + 55 - Math.floor(k / 6), 1, 3 + Math.floor(k / 5));
        }
        g.globalAlpha = 1;
        R(g, '#fff4c0', X + 34, Y + 55, 1, 1); R(g, '#fff4c0', X + 34, Y + 57, 1, 1);
      }
    }
    if (S.radio) { R(g, '#e8a040', 111, 80, 9, 2); R(g, '#fff0b0', 113 + Math.floor(t * 2) % 5, 80, 1, 2); }
    if (S.lamp) {
      R(g, '#fff0c0', 272, 89, 16, 1);
    }
    if (S.torch > 0) {
      const { x, y, w, h } = GLASS;
      g.globalAlpha = S.torch * (0.75 + Math.sin(t * 9) * 0.08);
      R(g, '#6a5a3a', x, y, w, h);
      R(g, '#a08a58', x + 4, y + 6, w - 8, h - 10);
      g.globalAlpha = 1;
      if (S.silhouette) drawSilhouette(g, 1);
    }
  }

  function drawSilhouette(g, a) {
    const { x, y } = GLASS;
    g.globalAlpha = a;
    const col = '#07080a';
    R(g, col, x + 5, y + 2, 12, 1); R(g, col, x + 6, y + 1, 10, 1); R(g, col, x + 7, y, 8, 1);
    R(g, col, x + 2, y + 3, 18, 2);
    R(g, col, x + 7, y + 5, 8, 8);
    R(g, col, x + 9, y + 13, 4, 2);
    R(g, col, x + 3, y + 15, 16, 13); R(g, col, x + 1, y + 18, 20, 10);
    g.globalAlpha = 1;
  }

  function drawDoor(g, t, S) {
    const { x, y, w, h } = GLASS;
    // vetro smerigliato con scritta al contrario
    R(g, '#2f3a40', x, y, w, h);
    for (let k = 0; k < 18; k++) R(g, '#36424a', x + ((k * 7) % w), y + ((k * 5) % h));
    for (const [lx, ly, lw] of [[x + 3, y + 8, 16], [x + 5, y + 14, 12]]) {
      for (let i = 0; i < lw; i += 3) R(g, '#1d2428', lx + i, ly, 2, 3);
    }
    if (S.silhouette && S.torch <= 0) drawSilhouette(g, 0.9);
    // porta aperta
    if (S.door > 0) {
      const open = S.door;
      R(g, '#0b0d10', 21, 29, 30, 71);
      R(g, '#141920', 36, 29, 8, 71);
      R(g, '#1c232c', 21, 29, 30, 1);
      const pw = Math.max(4, Math.round(30 * (1 - open * 0.82)));
      R(g, '#3d2a1b', 21, 29, pw, 71);
      R(g, '#2c1e13', 21 + pw - 1, 29, 1, 71);
      R(g, '#56402a', 21, 29, pw, 1);
      if (pw > 8) R(g, '#2f3a40', 23, 33, pw - 5, 28);
    }
  }

  function drawDeskItems(g, t, S) {
    g.drawImage(assets.desk, 0, 0);
    // bottiglia e bicchiere
    const bx = 228;
    R(g, '#2a1a10', bx + 1, 82, 3, 2);
    R(g, '#5a3a14', bx, 84, 5, 14); R(g, '#5a3a14', bx + 1, 83, 3, 1);
    const lvl = S.flags.drank ? 11 : 7;
    R(g, '#a06a22', bx, 84 + lvl, 5, 14 - lvl);
    R(g, '#e8c888', bx + 1, 85, 1, 8);
    R(g, '#d8dde0', bx + 6, 94, 5, 5); R(g, '#8a969c', bx + 7, 95, 3, 3);
    if (S.flags.drank) R(g, '#b07a30', bx + 7, 97, 3, 1);
    // telefono
    const jig = S.ringing ? (Math.floor(t * 30) % 2) : 0;
    const px = 238 + jig;
    R(g, '#0c0c0c', px, 94, 13, 6); R(g, '#1c1c1c', px + 1, 93, 11, 1); R(g, '#2c2c2c', px + 1, 94, 11, 1);
    R(g, '#8a8a8a', px + 4, 95, 5, 3); R(g, '#c8c8c8', px + 5, 96, 3, 1); R(g, '#141414', px + 6, 96);
    if (S.handset) {
      R(g, '#0c0c0c', px, 90, 13, 2); R(g, '#0c0c0c', px - 1, 91, 3, 3); R(g, '#0c0c0c', px + 11, 91, 3, 3);
      R(g, '#3a3a3a', px + 1, 90, 10, 1);
    } else {
      R(g, '#0c0c0c', px + 3, 92, 1, 2); R(g, '#0c0c0c', px + 9, 92, 1, 2);
    }
    if (S.ringing && Math.floor(t * 6) % 2) {
      R(g, '#e8d8a0', px - 3, 88, 1, 2); R(g, '#e8d8a0', px + 15, 88, 1, 2);
      R(g, '#e8d8a0', px - 5, 86, 1, 2); R(g, '#e8d8a0', px + 17, 86, 1, 2);
    }
    // paralume verde
    R(g, '#1c3c2a', 271, 83, 18, 6); R(g, '#2f6a48', 272, 83, 16, 5); R(g, '#56a070', 273, 83, 14, 1);
    R(g, '#3f8a5c', 272, 85, 16, 1); R(g, '#1c3c2a', 271, 88, 18, 1);
    R(g, '#c9a25a', 279, 82, 2, 1);
  }

  function drawClientChair(g) {
    const k = '#1c0d0b', a = '#4a2a1c', b = '#5e3a26', c = '#35200f';
    R(g, k, 184, 98, 5, 22); R(g, a, 185, 99, 3, 20); R(g, b, 185, 99, 1, 20);
    R(g, k, 184, 110, 18, 5); R(g, a, 185, 111, 16, 3); R(g, b, 185, 111, 16, 1);
    R(g, c, 185, 115, 2, 9); R(g, c, 199, 115, 2, 9);
    R(g, k, 185, 124, 2, 1); R(g, k, 199, 124, 2, 1);
  }

  function drawUmbrella(g, t) {
    // ombrello rosso appoggiato alla parete, con pozzanghera
    const cx = 54;
    for (let i = 0; i < 18; i++) {
      const x = cx + Math.floor(i / 6), y = 82 + i;
      const wdt = i < 3 ? 1 : (i < 13 ? 3 : 2);
      R(g, i < 3 ? '#2a1a10' : '#b5302b', x, y, wdt, 1);
      if (i >= 3 && i < 13) R(g, '#7a1d1a', x + wdt - 1, y, 1, 1);
    }
    R(g, '#2a1a10', cx + 3, 100, 1, 1);
    R(g, '#2a3440', 48, 101, 16, 2); R(g, '#3c4a58', 50, 101, 10, 1);
    const ph = (t * 1.3) % 1;
    const rw = Math.round(2 + ph * 6);
    g.globalAlpha = 1 - ph; R(g, '#6a7e94', 56 - rw, 101, rw * 2, 1); g.globalAlpha = 1;
  }

  // ───────────────────────────── Titolo ─────────────────────────────

  const titleRain = makeRain(160, W, H, 190);
  const titleRainFront = makeRain(40, W, H, 260);
  function drawTitle(g, t, S, dt) {
    stepRain(titleRain, dt, W, H); stepRain(titleRainFront, dt, W, H);
    const flash = S.flash;
    const bands = ['#070a14', '#0a0e1a', '#0d1220', '#111727', '#151c2e', '#19213a'];
    for (let y = 0; y < H; y++) R(g, bands[Math.min(5, Math.floor(y / 24))], 0, y, W, 1);
    if (flash > 0.05) { g.globalAlpha = flash; R(g, '#aebbe0', 0, 0, W, 150); g.globalAlpha = 1; }
    const sky = assets.skyline;
    g.drawImage(sky.canvas, 0, 0);
    for (const L of sky.lit) if (Math.sin(t * 0.25 + L.phase) < -0.7) R(g, '#0c111c', L.x, L.y, 2, 3);
    // cono di luce del lampione, retinato
    for (let y = 100; y < 178; y++) {
      const k = (y - 100) / 78, half = 4 + k * 26, a = 0.22 * (1 - k * 0.6);
      g.globalAlpha = a;
      for (let x = Math.round(252 - half); x < 252 + half; x++) if ((x + y) % 2 === 0 || k < 0.15) R(g, '#f0c060', x, y);
    }
    g.globalAlpha = 1;
    R(g, '#ffe6a0', 249, 99, 6, 1);
    g.globalAlpha = 0.3; for (let y = 156; y < 180; y += 2) R(g, '#f0c060', 246 + Math.round(Math.sin(y * 0.8 + t * 3) * 2), y, 16, 1); g.globalAlpha = 1;
    // insegna al neon
    'HOTEL'.split('').forEach((ch, i) => {
      R(g, '#1a0f14', 40, 60 + i * 7, 7, 7);
      if (neonOn(t, i)) { g.globalAlpha = 0.3; R(g, '#ff4a70', 38, 59 + i * 7, 11, 8); g.globalAlpha = 1; }
      text(g, ch, 42, 61 + i * 7, neonOn(t, i) ? '#ffb0c0' : '#3a1a24');
    });
    // Dante sotto il lampione (2x)
    const f = chars.dante.frame('front', 'normal', 'stand').left;
    g.globalAlpha = 0.45; R(g, '#000', 244, 176, 24, 3); g.globalAlpha = 1;
    g.drawImage(f, 238, 130, 36, 48);
    // pioggia
    drawRain(g, titleRain, 0, 0, 'rgba(140,160,200,0.35)');
    drawRain(g, titleRainFront, 0, 0, 'rgba(190,205,235,0.55)');
    for (let k = 0; k < 8; k++) {
      const x = (k * 53 + Math.floor(t * 40) * 17) % W, y = 156 + (k * 7) % 22;
      R(g, '#6a7e94', x, y, 2, 1);
    }
  }

  const introRain = makeRain(90, W, H, 170);
  function drawIntro(g, t, S, dt) {
    stepRain(introRain, dt, W, H);
    R(g, '#030406', 0, 0, W, H);
    if (S.flash > 0.05) { g.globalAlpha = S.flash * 0.35; R(g, '#aebbe0', 0, 0, W, H); g.globalAlpha = 1; }
    drawRain(g, introRain, 0, 0, 'rgba(120,140,180,0.18)');
  }

  // ───────────────────────────── Setup ─────────────────────────────

  const assets = {};
  function init() {
    assets.room = buildRoom();
    assets.desk = buildDesk();
    assets.winCity = buildWindowCity();
    assets.skyline = buildSkyline();
    assets.light = buildMasks();
    assets.watchScene = buildWatchScene();
    assets.key = sprite(KEY, { k: '#3a2808', y: '#c9a25a', Y: '#f0d690' }, 2);
    assets.keyShadow = sprite(KEY.map(r => r.replace(/[yY]/g, 'k')), { k: '#000' }, 2);
  }

  return {
    W, H, WIN, GLASS, WATCH_SPOTS, chars, assets, init, R, text, clamp, rng, portrait,
    updateWindow, drawWindow, drawEmissive, drawDoor, drawDeskItems, drawClientChair,
    drawUmbrella, drawTitle, drawIntro, drawWatch, drawSilhouette,
  };
})();
