'use strict';
/*
 * Pioggia Nera — motore: ciclo di gioco, input, attori, camera, luci e UI.
 * La storia (story.js) usa l'API asincrona esposta in Game.api.
 */
const Game = (() => {
  const { W, H, R, clamp } = Art;
  const $ = (s) => document.querySelector(s);

  const screen = $('#screen'), sg = screen.getContext('2d');
  const world = document.createElement('canvas'); world.width = W; world.height = H;
  const wg = world.getContext('2d');
  sg.imageSmoothingEnabled = false; wg.imageSmoothingEnabled = false;
  const pg = $('#portrait').getContext('2d');

  const ui = {
    frame: $('#frame'), stage: $('#stage'),
    dialog: $('#dialog'), name: $('#dname'), text: $('#dtext'), next: $('#dnext'), choices: $('#choices'), pwrap: $('#pwrap'),
    caption: $('#caption'), capText: $('#captext'), capNext: $('#capnext'),
    objective: $('#objective'), objText: $('#objtext'), prompt: $('#prompt'), toast: $('#toast'),
    notes: $('#notebook'), notesList: $('#noteslist'), notesTrust: $('#notestrust'),
    title: $('#title'), start: $('#start'), end: $('#end'),
    btnNotes: $('#btn-notes'), btnSound: $('#btn-sound'),
  };
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ───────────────────────────── Stato ─────────────────────────────
  const S = {
    scene: 'title', mode: 'title', time: 0,
    flags: {}, examined: new Set(), trust: 2, clues: [],
    lamp: true, radio: false, door: 0, silhouette: false, torch: 0, carLights: false,
    ringing: false, handset: true, umbrella: false,
    flash: 0, shake: 0, fade: 1, cinema: 0, storm: true, stormT: 6,
    busy: false, notes: false, hover: null, active: null,
  };
  const cam = { z: 1, cx: W / 2, cy: H / 2 };
  let view = { sx: 0, sy: 0, vw: W, vh: H };

  // ───────────────────────────── Tempo e tween ─────────────────────────────
  const timers = [], tweens = [];
  const wait = (ms) => new Promise(r => timers.push({ at: S.time + ms / 1000, r }));
  const ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function tween(obj, to, ms) {
    return new Promise(r => {
      const from = {};
      for (const k in to) from[k] = obj[k];
      tweens.push({ obj, from, to, t: 0, d: Math.max(0.001, ms / 1000), r });
    });
  }

  // ───────────────────────────── Attori ─────────────────────────────
  class Actor {
    constructor(who, x, y) {
      Object.assign(this, { who, x, y, art: Art.chars[who], dir: 'left', back: false, path: [], speed: 60, t: 0,
        visible: true, sit: false, face: 'normal', blinkT: 3, moving: false, stepT: 0, phone: false, onArrive: null });
    }
    walk(points, speed) {
      this.path = points.map(([x, y]) => ({ x, y }));
      if (speed) this.speed = speed;
      return new Promise(r => { this.onArrive = r; });
    }
    update(dt) {
      this.blinkT -= dt;
      if (this.blinkT < -0.13) this.blinkT = 2.2 + Math.random() * 3.5;
      if (this.path.length) {
        const p = this.path[0], dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy), step = this.speed * dt;
        if (Math.abs(dx) > 0.3) this.dir = dx < 0 ? 'left' : 'right';
        this.back = dy < 0 && Math.abs(dy) > Math.abs(dx);
        if (d <= step) {
          this.x = p.x; this.y = p.y; this.path.shift();
          if (!this.path.length) { this.moving = false; const r = this.onArrive; this.onArrive = null; if (r) r(); }
        } else { this.x += dx / d * step; this.y += dy / d * step; this.moving = true; }
      } else if (!this.manual) this.moving = false;
      if (this.moving) {
        this.t += dt; this.stepT += dt;
        if (this.stepT > 0.29) { this.stepT = 0; Sound.step(this.who === 'lucia' ? 0.5 : 0.8); }
      } else this.t = 0;
    }
    draw(g) {
      if (!this.visible) return;
      let legs = 'stand';
      if (this.moving) legs = ['walkA', 'stand', 'walkB', 'stand'][Math.floor(this.t * 7) % 4];
      if (this.sit && this.who === 'lucia') legs = 'sit';
      const face = this.blinkT < 0 ? 'blink' : this.face;
      const fr = this.art.frame(this.back ? 'back' : 'front', face, legs)[this.dir];
      const bob = this.moving && legs !== 'stand' ? -1 : 0;
      const x = Math.round(this.x) - 9, y = Math.round(this.y) - 24 + bob - (legs === 'sit' ? 8 : 0);
      if (!this.sit) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(Math.round(this.x) - 6, Math.round(this.y) - 1, 12, 2);
        g.fillRect(Math.round(this.x) - 4, Math.round(this.y) + 1, 8, 1);
      }
      g.drawImage(fr, x, y);
      if (this.phone) {
        R(g, '#0c0c0c', x + 1, y + 7, 2, 9); R(g, '#0c0c0c', x, y + 7, 3, 2); R(g, '#0c0c0c', x, y + 14, 3, 2);
        R(g, '#3a3a3a', x + 1, y + 8, 1, 6); R(g, '#f5d8bd', x + 3, y + 12, 1, 2);
      }
    }
  }
  const dante = new Actor('dante', 166, 106);
  const lucia = new Actor('lucia', 36, 104);
  lucia.visible = false;
  const actors = { dante, lucia };

  // ───────────────────────────── Mappa e percorsi ─────────────────────────────
  const HOTSPOTS = [
    { id: 'door', name: 'la porta', at: [36, 108], box: [16, 22, 55, 100], mark: [36, 18] },
    { id: 'coat', name: "l'attaccapanni", at: [66, 108], box: [56, 33, 76, 100], mark: [64, 29] },
    { id: 'cabinet', name: 'lo schedario', at: [88, 108], box: [76, 40, 101, 100], mark: [88, 36] },
    { id: 'radio', name: 'la radio', at: [115, 108], box: [103, 66, 127, 100], mark: [115, 62] },
    { id: 'window', name: 'la finestra', at: [167, 108], box: [130, 8, 206, 84], mark: [167, 5] },
    { id: 'papers', name: 'la scrivania', at: [215, 138], box: [203, 80, 226, 104], mark: [215, 78] },
    { id: 'bottle', name: 'il whisky', at: [230, 138], box: [226, 78, 238, 104], mark: [230, 76] },
    { id: 'phone', name: 'il telefono', at: [245, 138], box: [238, 86, 253, 104], mark: [244, 84] },
    { id: 'lamp', name: 'la lampada', at: [279, 138], box: [266, 78, 291, 104], mark: [279, 74] },
    { id: 'board', name: 'la bacheca', at: [305, 110], box: [292, 22, 319, 64], mark: [305, 18] },
  ];
  const BLOCK = [181, 0, 295, 134];
  const inBlock = (x, y) => x > BLOCK[0] && x < BLOCK[2] && y < BLOCK[3];
  const walkable = (x, y) => x >= 10 && x <= 314 && y >= 106 && y <= 172 && !inBlock(x, y);
  function clampTarget(x, y) {
    x = clamp(x, 10, 314); y = clamp(y, 106, 172);
    if (inBlock(x, y)) {
      const dl = x - BLOCK[0], dr = BLOCK[2] - x, db = BLOCK[3] - y;
      if (db <= dl && db <= dr) y = BLOCK[3] + 3; else if (dl < dr) x = BLOCK[0] - 3; else x = BLOCK[2] + 3;
    }
    return [x, y];
  }
  function clear(a, b) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
    for (let i = 1; i <= n; i++) { const k = i / n; if (inBlock(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)) return false; }
    return true;
  }
  function plan(from, to) {
    if (clear(from, to)) return [to];
    const A = [BLOCK[0] - 4, BLOCK[3] + 5], B = [BLOCK[2] + 4, BLOCK[3] + 5];
    const len = (pts) => pts.reduce((s, p, i) => s + Math.hypot(p[0] - (i ? pts[i - 1][0] : from[0]), p[1] - (i ? pts[i - 1][1] : from[1])), 0);
    const opts = [[A, to], [B, to], [A, B, to], [B, A, to]].filter(p => [from, ...p].every((q, i, arr) => !i || clear(arr[i - 1], q)));
    opts.sort((a, b) => len(a) - len(b));
    return opts[0] || [to];
  }
  function nearestHotspot() {
    let best = null, bd = 20;
    for (const h of HOTSPOTS) {
      const d = Math.hypot((h.at[0] - dante.x) * 0.8, h.at[1] - dante.y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function hotspotAt(x, y) {
    let best = null, area = Infinity;
    for (const h of HOTSPOTS) {
      const [x0, y0, x1, y1] = h.box, a = (x1 - x0) * (y1 - y0);
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && a < area) { best = h; area = a; }
    }
    return best;
  }

  // ───────────────────────────── Dialoghi ─────────────────────────────
  const SPEAKERS = {
    dante: { name: () => 'Dante', portrait: 'dante', cls: 'dante' },
    lucia: { name: () => (S.flags.luciaNamed ? 'Lucia' : '???'), portrait: 'lucia', cls: 'lucia' },
    voice: { name: () => 'Voce al telefono', portrait: null, cls: 'voice' },
    radio: { name: () => 'Radio', portrait: null, cls: 'radio' },
    thought: { name: () => '', portrait: null, cls: 'thought' },
  };
  const D = { el: null, who: null, full: '', shown: 0, done: true, pause: 0, resolve: null, choices: null, sel: 0, choiceResolve: null, hideT: null, last: 0 };

  function cancelHide() { clearTimeout(D.hideT); D.hideT = null; }
  function hideDialog() { cancelHide(); ui.dialog.hidden = true; }
  function scheduleHide() { cancelHide(); D.hideT = setTimeout(hideDialog, 90); }

  function type(el, who, text) {
    D.el = el; D.who = who; D.full = text; D.shown = 0; D.done = false; D.pause = 0.12; D.last = 0;
    el.textContent = '';
    return new Promise(r => { D.resolve = r; });
  }
  function say(who, text, face) {
    cancelHide();
    const sp = SPEAKERS[who];
    ui.dialog.hidden = false;
    ui.dialog.className = 'dialog is-' + sp.cls;
    ui.name.textContent = sp.name();
    ui.name.hidden = !sp.name();
    ui.pwrap.hidden = !sp.portrait;
    if (face && actors[who]) actors[who].face = face;
    if (sp.portrait) Art.portrait(pg, sp.portrait, face || (actors[who] ? actors[who].face : 'normal'));
    ui.choices.hidden = true; ui.choices.innerHTML = '';
    ui.next.hidden = true;
    return type(ui.text, who, text).then(() => scheduleHide());
  }
  const think = (text) => say('thought', text);

  function choose(options) {
    cancelHide();
    const opts = options.map(o => (typeof o === 'string' ? { text: o } : o));
    ui.dialog.hidden = false;
    ui.next.hidden = true;
    ui.choices.innerHTML = '';
    opts.forEach((o, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice';
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><span></span>';
      b.lastChild.textContent = o.text;
      b.addEventListener('click', (e) => { e.stopPropagation(); pick(i); });
      b.addEventListener('pointerenter', () => { D.sel = i; markChoice(); });
      li.appendChild(b); ui.choices.appendChild(li);
    });
    ui.choices.hidden = false;
    D.choices = opts; D.sel = 0; markChoice();
    return new Promise(r => { D.choiceResolve = r; }).then(async (i) => {
      const o = opts[i];
      if (o.say !== false) await say('dante', o.text, o.face);
      return i;
    });
  }
  function markChoice() {
    [...ui.choices.querySelectorAll('.choice')].forEach((b, i) => b.classList.toggle('sel', i === D.sel));
  }
  function pick(i) {
    if (!D.choices) return;
    D.choices = null;
    Sound.select();
    ui.choices.hidden = true;
    const r = D.choiceResolve; D.choiceResolve = null; r(i);
  }

  function advance() {
    if (D.choices) { pick(D.sel); return true; }
    if (!D.resolve) return false;
    if (!D.done) { D.shown = D.full.length; D.el.textContent = D.full; finishTyping(); return true; }
    const r = D.resolve; D.resolve = null;
    ui.next.hidden = true; ui.capNext.hidden = true;
    r();
    return true;
  }
  function finishTyping() {
    D.done = true;
    if (D.el === ui.text) ui.next.hidden = false; else ui.capNext.hidden = false;
  }
  function updateTyping(dt) {
    if (!D.resolve || D.done) return;
    if (D.pause > 0) { D.pause -= dt; return; }
    const cps = D.el === ui.capText ? 30 : 44;
    D.shown += dt * cps;
    const n = Math.min(D.full.length, Math.floor(D.shown));
    if (n !== D.last) {
      for (let i = D.last; i < n; i++) {
        const ch = D.full[i];
        if (i % 2 === 0 && /\S/.test(ch)) Sound.blip(D.who);
        if ('.!?…'.includes(ch) && D.full[i + 1] === ' ') { D.pause = 0.22; D.shown = i + 1; break; }
        if (ch === ',' || ch === ';' || ch === ':') { D.pause = 0.08; D.shown = i + 1; break; }
      }
      D.last = Math.min(n, Math.floor(D.shown));
      D.el.textContent = D.full.slice(0, D.last);
    }
    if (D.last >= D.full.length) finishTyping();
  }

  async function caption(lines) {
    ui.caption.hidden = false;
    for (const line of lines) {
      ui.capText.classList.remove('out');
      await type(ui.capText, 'thought', line);
      ui.capText.classList.add('out');
      await wait(450);
    }
    ui.caption.hidden = true;
    ui.capText.classList.remove('out');
  }

  // ───────────────────────────── HUD ─────────────────────────────
  function objective(text) {
    ui.objText.textContent = text || '';
    ui.objective.hidden = !text;
  }
  const toastQ = [];
  let toastBusy = false;
  function toast(label, text) {
    toastQ.push([label, text]);
    if (!toastBusy) nextToast();
  }
  async function nextToast() {
    const it = toastQ.shift();
    if (!it) { toastBusy = false; return; }
    toastBusy = true;
    ui.toast.querySelector('.tl').textContent = it[0];
    ui.toast.querySelector('.tt').textContent = it[1];
    ui.toast.hidden = false;
    requestAnimationFrame(() => ui.toast.classList.add('show'));
    await new Promise(r => setTimeout(r, 3400));
    ui.toast.classList.remove('show');
    await new Promise(r => setTimeout(r, 400));
    ui.toast.hidden = true;
    nextToast();
  }
  function clue(id, text) {
    if (S.clues.some(c => c.id === id)) return false;
    S.clues.push({ id, text });
    Sound.clue();
    toast('Nuovo indizio', text);
    renderNotes();
    ui.btnNotes.classList.add('ping');
    setTimeout(() => ui.btnNotes.classList.remove('ping'), 1600);
    return true;
  }
  function trust(delta) { S.trust = clamp(S.trust + delta, 0, 5); renderNotes(); }
  function renderNotes() {
    ui.notesList.innerHTML = '';
    if (!S.clues.length) {
      const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Ancora niente. La notte è giovane.';
      ui.notesList.appendChild(li);
    }
    S.clues.forEach(c => { const li = document.createElement('li'); li.textContent = c.text; ui.notesList.appendChild(li); });
    ui.notesTrust.hidden = !S.flags.luciaNamed;
    ui.notesTrust.querySelector('.meter').textContent = '●'.repeat(S.trust) + '○'.repeat(5 - S.trust);
  }
  function toggleNotes(open) {
    S.notes = open === undefined ? !S.notes : open;
    ui.notes.hidden = !S.notes;
    if (S.notes) { renderNotes(); ui.notes.querySelector('button').focus(); }
    else ui.btnNotes.focus({ preventScroll: true });
  }
  function toggleSound() {
    Sound.init();
    Sound.setMuted(!Sound.muted);
    ui.btnSound.textContent = Sound.muted ? 'Audio: no' : 'Audio: sì';
    ui.btnSound.setAttribute('aria-pressed', String(!Sound.muted));
  }

  // ───────────────────────────── Effetti ─────────────────────────────
  function lightning(power = 1, thunderDelay = 0.7) {
    S.flash = Math.max(S.flash, power);
    setTimeout(() => { S.flash = Math.max(S.flash, power * 0.7); }, 140);
    Sound.thunder(Math.min(1, power + 0.1), thunderDelay);
  }
  const smoke = [];
  const floorSpecks = Array.from({ length: 26 }, (_, i) => ({ u: (i * 0.618) % 1, v: (i * 0.37) % 1, s: 0.05 + (i % 5) * 0.012 }));

  // ───────────────────────────── Modalità ─────────────────────────────
  let exploreOpts = null, exploreResolve = null;
  function explore(opts) {
    exploreOpts = opts; S.mode = 'explore'; S.exploreT = 0;
    return new Promise(r => { exploreResolve = r; });
  }
  async function interact(h) {
    if (S.busy || S.mode !== 'explore') return;
    S.busy = true; S.mode = 'cutscene';
    dante.path = []; dante.moving = false; dante.back = true;
    ui.prompt.hidden = true;
    await exploreOpts.onExamine(h.id);
    S.examined.add(h.id);
    hideDialog();
    S.busy = false;
    if (S.mode === 'cutscene') S.mode = 'explore';
  }

  const WS = { sel: 1, seen: {}, crownOut: false, keyOut: false, showSel: true };
  let watchOpts = null, watchResolve = null;
  function watchMode(opts) {
    watchOpts = opts; S.mode = 'watch';
    return new Promise(r => { watchResolve = r; });
  }
  async function examineWatch(i) {
    if (S.busy) return;
    const spot = Art.WATCH_SPOTS[i];
    S.busy = true; WS.sel = i; WS.showSel = false; ui.prompt.hidden = true;
    await watchOpts.onExamine(spot.id, WS);
    WS.seen[spot.id] = true; WS.showSel = true;
    hideDialog();
    S.busy = false;
    if (Art.WATCH_SPOTS.every(s => WS.seen[s.id])) {
      S.mode = 'cutscene';
      const r = watchResolve; watchResolve = null; r();
    } else {
      const nx = Art.WATCH_SPOTS.findIndex(s => !WS.seen[s.id]);
      if (nx >= 0 && WS.seen[Art.WATCH_SPOTS[WS.sel].id]) WS.sel = nx;
    }
  }

  // ───────────────────────────── Input ─────────────────────────────
  const held = new Set();
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Enter: 'act', Space: 'act', KeyE: 'act',
    KeyN: 'notes', Tab: 'notes', Escape: 'esc', KeyM: 'mute',
  };
  addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if (['left', 'right', 'up', 'down', 'act', 'notes'].includes(k)) e.preventDefault();
    if (e.target && e.target.tagName === 'BUTTON' && k === 'act' && S.mode !== 'explore' && !D.resolve && !D.choices) return;
    if (!e.repeat) onPress(k);
    held.add(k);
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
  addEventListener('blur', () => held.clear());

  function onPress(k) {
    if (k === 'mute') return toggleSound();
    if (S.mode === 'title') { if (k === 'act') startGame(); return; }
    if (S.notes) { if (k === 'notes' || k === 'esc') toggleNotes(false); return; }
    if (k === 'notes') { if (S.mode !== 'title' && S.mode !== 'end') toggleNotes(true); return; }
    if (D.choices) {
      if (k === 'up' || k === 'left') { D.sel = (D.sel + D.choices.length - 1) % D.choices.length; markChoice(); Sound.tick(); }
      if (k === 'down' || k === 'right') { D.sel = (D.sel + 1) % D.choices.length; markChoice(); Sound.tick(); }
      if (k === 'act') pick(D.sel);
      return;
    }
    if (k === 'act' && advance()) return;
    if (S.mode === 'explore' && !S.busy && k === 'act') {
      const h = nearestHotspot();
      if (h) interact(h);
    }
    if (S.mode === 'watch' && !S.busy) {
      const n = Art.WATCH_SPOTS.length;
      if (k === 'left' || k === 'up') { WS.sel = (WS.sel + n - 1) % n; Sound.tick(); }
      if (k === 'right' || k === 'down') { WS.sel = (WS.sel + 1) % n; Sound.tick(); }
      if (k === 'act') examineWatch(WS.sel);
    }
  }
  addEventListener('keydown', (e) => {
    if (D.choices && /^Digit[1-9]$/.test(e.code)) {
      const i = +e.code.slice(5) - 1;
      if (i < D.choices.length) { D.sel = i; pick(i); }
    }
  });

  function toWorld(e) {
    const r = screen.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H;
    return [view.sx + px / W * view.vw, view.sy + py / H * view.vh, px, py];
  }
  ui.frame.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || S.notes || S.mode === 'end') return;
    if (S.mode === 'title') { startGame(); return; }
    Sound.init();
    if (D.choices) return;
    if (advance()) return;
    const onCanvas = e.target === screen || e.target.closest('#stage');
    if (!onCanvas) return;
    const [wx, wy, px, py] = toWorld(e);
    if (S.mode === 'explore' && !S.busy) {
      const h = hotspotAt(wx, wy);
      const target = h ? h.at : clampTarget(wx, wy);
      dante.manual = false;
      dante.walk(plan([dante.x, dante.y], target), 62).then(() => {
        if (h && S.mode === 'explore' && !S.busy && Math.hypot(dante.x - h.at[0], dante.y - h.at[1]) < 2) interact(h);
      });
    } else if (S.mode === 'watch' && !S.busy) {
      const i = Art.WATCH_SPOTS.findIndex(s => px >= s.box[0] && px <= s.box[2] && py >= s.box[1] && py <= s.box[3]);
      if (i >= 0) examineWatch(i);
    }
  });
  screen.addEventListener('pointermove', (e) => {
    if (S.mode === 'explore') {
      const [wx, wy] = toWorld(e);
      S.hover = hotspotAt(wx, wy);
    } else if (S.mode === 'watch') {
      const [, , px, py] = toWorld(e);
      const i = Art.WATCH_SPOTS.findIndex(s => px >= s.box[0] && px <= s.box[2] && py >= s.box[1] && py <= s.box[3]);
      if (i >= 0 && !S.busy) WS.sel = i;
      S.hover = i >= 0 ? {} : null;
    } else S.hover = null;
    screen.style.cursor = S.hover ? 'pointer' : 'default';
  });
  screen.addEventListener('pointerleave', () => { S.hover = null; });
  ui.btnNotes.addEventListener('click', () => { if (S.mode !== 'title') toggleNotes(); });
  ui.btnSound.addEventListener('click', toggleSound);
  ui.notes.querySelector('button').addEventListener('click', () => toggleNotes(false));

  let startResolve = null;
  function startGame() {
    if (!startResolve) return;
    Sound.init();
    S.mode = 'cutscene';
    const r = startResolve; startResolve = null; r();
  }
  ui.start.addEventListener('click', startGame);
  function titleScreen() {
    S.scene = 'title'; S.mode = 'title';
    ui.title.hidden = false;
    ui.start.focus({ preventScroll: true });
    tween(S, { fade: 0 }, 1200);
    return new Promise(r => { startResolve = r; });
  }

  // ───────────────────────────── Update ─────────────────────────────
  function update(dt) {
    S.time += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (S.time >= timers[i].at) { const t = timers.splice(i, 1)[0]; t.r(); }
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = ease(Math.min(1, tw.t / tw.d));
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      if (tw.t >= tw.d) { tweens.splice(i, 1); tw.r(); }
    }
    updateTyping(dt);
    S.flash = Math.max(0, S.flash - dt * 3.2);
    S.shake = Math.max(0, S.shake - dt * 6);

    if (S.storm && S.scene !== 'watch') {
      S.stormT -= dt;
      if (S.stormT <= 0) { S.stormT = 14 + Math.random() * 16; lightning(0.45 + Math.random() * 0.45, 0.6 + Math.random() * 1.6); }
    }
    Art.updateWindow(dt);

    if (S.mode === 'explore' && !S.busy && !S.notes) {
      let vx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let vy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (vx || vy) {
        dante.path = []; dante.onArrive = null; dante.manual = true;
        const l = Math.hypot(vx, vy); vx /= l; vy /= l;
        const sp = 62 * dt;
        let moved = false;
        if (vx && walkable(dante.x + vx * sp, dante.y)) { dante.x += vx * sp; moved = true; }
        if (vy && walkable(dante.x, dante.y + vy * sp)) { dante.y += vy * sp; moved = true; }
        if (vx) dante.dir = vx < 0 ? 'left' : 'right';
        dante.back = vy < 0 && Math.abs(vy) >= Math.abs(vx);
        if (!vx && vy > 0) dante.back = false;
        dante.moving = moved;
      } else if (dante.manual) { dante.manual = false; dante.moving = false; }
      S.exploreT += dt;
      if (exploreOpts && exploreOpts.tick) exploreOpts.tick(S.exploreT);
      if (exploreOpts && exploreOpts.until()) {
        S.mode = 'cutscene';
        const r = exploreResolve; exploreResolve = null; exploreOpts = null;
        ui.prompt.hidden = true;
        if (r) r();
      }
    }
    dante.update(dt); lucia.update(dt);

    // fumo della sigaretta
    if (Math.random() < dt * 5) smoke.push({ x: 268, y: 97, life: 0 });
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]; p.life += dt; p.y -= dt * 7; p.x += Math.sin(p.life * 2.2 + p.y * 0.2) * dt * 4;
      if (p.life > 3) smoke.splice(i, 1);
    }
    for (const s of floorSpecks) { s.v += dt * s.s; if (s.v > 1) { s.v -= 1; s.u = Math.random(); } }

    updatePrompt();
  }

  function updatePrompt() {
    let msg = '';
    S.active = null;
    if (S.mode === 'explore' && !S.busy && ui.dialog.hidden) {
      const h = (!coarse && S.hover) || nearestHotspot();
      S.active = h;
      if (h) msg = coarse ? 'Tocca per esaminare ' + h.name : (S.hover && S.hover !== nearestHotspot() ? 'Clicca: ' + h.name : 'E · Esamina ' + h.name);
    } else if (S.mode === 'watch' && !S.busy) {
      const s = Art.WATCH_SPOTS[WS.sel];
      msg = coarse ? 'Tocca: ' + s.name : '← → scegli · E esamina: ' + s.name;
    }
    if (msg) { if (ui.prompt.textContent !== msg) ui.prompt.textContent = msg; ui.prompt.hidden = false; }
    else ui.prompt.hidden = true;
  }

  // ───────────────────────────── Render ─────────────────────────────
  function renderRoom(t) {
    const g = wg, A = Art.assets;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(A.room, 0, 0);
    Art.drawWindow(g, t, S);
    Art.drawDoor(g, t, S);
    if (S.umbrella) Art.drawUmbrella(g, t);
    const list = [{ k: 130, f: () => Art.drawDeskItems(g, t, S) }, { k: 120, f: () => Art.drawClientChair(g) }];
    for (const a of [dante, lucia]) if (a.visible) list.push({ k: a.y + (a.sit ? 1 : 0), f: () => a.draw(g) });
    list.sort((a, b) => a.k - b.k).forEach(o => o.f());
    if (dante.phone) {
      g.fillStyle = '#0c0c0c';
      const hx = Math.round(dante.x) - 8, hy = Math.round(dante.y) - 9;
      for (let i = 0; i < 8; i++) g.fillRect(hx - Math.round(i * 0.6), hy + i + (i % 2), 1, 1);
    }
    for (const p of smoke) { g.globalAlpha = Math.max(0, 0.35 - p.life * 0.11); R(g, '#c8c4bc', Math.round(p.x), Math.round(p.y)); }
    g.globalAlpha = 1;

    const L = A.light[S.lamp ? 'on' : 'off'];
    const flick = S.lamp ? 0.9 + 0.1 * Math.abs(Math.sin(t * 23) * Math.sin(t * 7.1)) : 1;
    g.globalAlpha = 1 - 0.8 * S.flash; g.drawImage(L.dark, 0, 0);
    g.globalCompositeOperation = 'lighter';
    if (S.lamp) { g.globalAlpha = flick; g.drawImage(L.glow, 0, 0); }
    g.globalAlpha = 0.09 + 0.5 * S.flash; g.drawImage(A.light.patch, 0, 0);
    if (S.flash > 0) { g.globalAlpha = 0.3 * S.flash; g.fillStyle = '#8fa6e0'; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // ombre delle gocce che scorrono sul vetro, proiettate sul pavimento
    g.fillStyle = 'rgba(0,0,8,0.28)';
    for (const s of floorSpecks) {
      const y = 103 + s.v * 47, xl = 128 - s.v * 24, x = xl + s.u * 62;
      g.fillRect(Math.round(x), Math.round(y), 1, 2);
    }
    Art.drawEmissive(g, t, S);

    if (S.active && S.mode === 'explore') {
      const [mx, my] = S.active.mark, b = Math.round(Math.sin(t * 5) * 1.5);
      const x = mx - 3, y = my - 4 + b;
      R(g, '#120d0b', x, y, 7, 7); R(g, '#f2e2b0', x + 1, y + 1, 5, 5);
      R(g, '#120d0b', x + 3, y + 7, 1, 1); R(g, '#f2e2b0', x + 3, y + 6, 1, 1);
      R(g, '#8a2a22', x + 3, y + 2, 1, 2); R(g, '#8a2a22', x + 3, y + 5, 1, 1);
    }

    const z = cam.z, vw = W / z, vh = H / z;
    const sx = clamp(cam.cx - vw / 2, 0, W - vw), sy = clamp(cam.cy - vh / 2, 0, H - vh);
    view = { sx, sy, vw, vh };
    const shx = S.shake ? Math.round((Math.random() * 2 - 1) * S.shake) : 0;
    const shy = S.shake ? Math.round((Math.random() * 2 - 1) * S.shake) : 0;
    sg.fillStyle = '#000'; sg.fillRect(0, 0, W, H);
    sg.drawImage(world, sx, sy, vw, vh, shx, shy, W, H);
  }

  let lastDt = 0.016;
  function render() {
    const t = S.time;
    sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over';
    if (S.scene === 'title') Art.drawTitle(sg, t, S, lastDt);
    else if (S.scene === 'intro') Art.drawIntro(sg, t, S, lastDt);
    else if (S.scene === 'room') renderRoom(t);
    else if (S.scene === 'watch') Art.drawWatch(sg, t, WS);
    else { sg.fillStyle = '#000'; sg.fillRect(0, 0, W, H); }
    sg.drawImage(Art.assets.light.vignette, 0, 0);
    if (S.cinema > 0) {
      const b = Math.round(S.cinema * 14);
      sg.fillStyle = '#000'; sg.fillRect(0, 0, W, b); sg.fillRect(0, H - b, W, b);
    }
    if (S.fade > 0) { sg.globalAlpha = S.fade; sg.fillStyle = '#000'; sg.fillRect(0, 0, W, H); sg.globalAlpha = 1; }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastDt = dt;
    update(dt); render();
    requestAnimationFrame(frame);
  }

  // ───────────────────────────── Fine ─────────────────────────────
  function showEnd(data) {
    S.mode = 'end';
    hideDialog(); objective(''); ui.prompt.hidden = true;
    ui.end.querySelector('.end-choice').textContent = data.choice;
    const list = ui.end.querySelector('.end-clues');
    list.innerHTML = '';
    S.clues.forEach(c => { const li = document.createElement('li'); li.textContent = c.text; list.appendChild(li); });
    if (!S.clues.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Nessuno. Il Corvo ringrazia.'; list.appendChild(li); }
    ui.end.querySelector('.end-count').textContent = S.clues.length + ' su ' + data.total;
    ui.end.querySelector('.end-trust').textContent = '●'.repeat(S.trust) + '○'.repeat(5 - S.trust);
    ui.end.querySelector('.end-trust-label').textContent = data.trustLabel;
    ui.end.hidden = false;
    ui.end.querySelector('button').focus({ preventScroll: true });
  }
  ui.end.querySelector('button').addEventListener('click', () => location.reload());

  function boot(run) {
    Art.init();
    renderNotes();
    requestAnimationFrame(frame);
    run();
  }

  const api = {
    S, cam, actors, coarse, dante, lucia, WS, wait, tween, say, think, choose, caption, objective, toast, clue, trust,
    lightning, explore, watchMode, titleScreen, showEnd, hideDialog,
    setScene(s) { S.scene = s; },
    fade: (v, ms = 800) => tween(S, { fade: v }, ms),
    cinema: (v, ms = 600) => tween(S, { cinema: v }, ms),
    zoom: (z, cx, cy, ms = 1200) => tween(cam, { z, cx, cy }, ms),
    hideTitle() { ui.title.hidden = true; },
    hotspotName: (id) => (HOTSPOTS.find(h => h.id === id) || {}).name,
  };
  return { boot, api };
})();
