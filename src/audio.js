'use strict';
/*
 * Pioggia Nera — audio sintetizzato con WebAudio: pioggia, tuoni, effetti e
 * un piccolo tema noir generativo. Nessun file audio esterno.
 */
const Sound = (() => {
  let ctx = null, master, sfx, amb, mus, noise, brown;
  let muted = false;
  const rainNodes = {};

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = bus(0.9); amb = bus(0.7); mus = bus(0.3);
    noise = makeNoise(2); brown = makeBrown(4);
    startRain();
  }
  function bus(v) { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
  function makeNoise(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeBrown(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  function src(buf, loop) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; }
  function filt(type, f, q) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function env(g, t, a, peak, d, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
  }
  const now = () => ctx.currentTime;

  // ── Pioggia ──
  function startRain() {
    const hiss = src(noise, true), hp = filt('highpass', 500), lp = filt('lowpass', 3200), g1 = gain(0.1);
    chain(hiss, hp, lp, g1, amb); hiss.start();
    const roar = src(brown, true), lp2 = filt('lowpass', 420), g2 = gain(0.5);
    chain(roar, lp2, g2, amb); roar.start();
    rainNodes.hiss = g1; rainNodes.roar = g2;
    (function drip() {
      if (!ctx) return;
      const t = now();
      const o = ctx.createOscillator(), g = gain(0);
      o.type = 'sine'; o.frequency.setValueAtTime(1400 + Math.random() * 1400, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.05);
      env(g, t, 0.003, 0.03 + Math.random() * 0.03, 0.06);
      chain(o, g, amb); o.start(t); o.stop(t + 0.1);
      setTimeout(drip, 120 + Math.random() * 500);
    })();
  }
  function rainLevel(v, sec = 1.5) {
    if (!ctx) return;
    rainNodes.hiss.gain.linearRampToValueAtTime(0.1 * v, now() + sec);
    rainNodes.roar.gain.linearRampToValueAtTime(0.5 * v, now() + sec);
  }

  // ── Tuono ──
  function thunder(power = 1, delay = 0.8) {
    if (!ctx) return;
    const t = now() + delay;
    const s = src(brown), lp = filt('lowpass', 1400), g = gain(0);
    s.playbackRate.value = 0.6 + Math.random() * 0.3;
    lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(120, t + 3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.2 * power, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.5 * power, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    chain(s, lp, g, sfx); s.start(t, Math.random() * 0.5); s.stop(t + 4);
    if (power > 0.8) {
      const c = src(noise), hp = filt('highpass', 900), cg = gain(0);
      env(cg, t, 0.005, 0.5 * power, 0.35);
      chain(c, hp, cg, sfx); c.start(t); c.stop(t + 0.5);
    }
  }

  // ── Effetti ──
  function knock(times = 3, gap = 0.3, vol = 1) {
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const t = now() + 0.05 + i * gap;
      const o = ctx.createOscillator(), g = gain(0);
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      env(g, t, 0.004, 0.9 * vol, 0.16);
      chain(o, g, sfx); o.start(t); o.stop(t + 0.2);
      const n = src(noise), bp = filt('bandpass', 700, 1.2), ng = gain(0);
      env(ng, t, 0.002, 0.35 * vol, 0.05);
      chain(n, bp, ng, sfx); n.start(t); n.stop(t + 0.1);
    }
  }
  function creak(dur = 1.4) {
    if (!ctx) return;
    const t = now();
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = gain(35);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(120, t + dur);
    lfo.frequency.value = 9; chain(lfo, lg); lg.connect(o.frequency);
    const bp = filt('bandpass', 1100, 7), g = gain(0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.15);
    g.gain.setValueAtTime(0.35, t + dur - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(o, bp, g, sfx); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }
  function doorShut() { knock(1, 0, 1.3); }
  function step(vol = 1) {
    if (!ctx) return;
    const t = now();
    const n = src(noise), lp = filt('lowpass', 380 + Math.random() * 120), g = gain(0);
    env(g, t, 0.004, 0.22 * vol, 0.07);
    chain(n, lp, g, sfx); n.start(t, Math.random()); n.stop(t + 0.1);
  }
  function stairs(count = 8, gap = 0.7) {
    if (!ctx) return;
    for (let i = 0; i < count; i++) {
      const t = now() + i * gap, vol = 0.25 + (i / count) * 0.9;
      const o = ctx.createOscillator(), g = gain(0);
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      env(g, t, 0.006, 0.7 * vol, 0.2);
      const lp = filt('lowpass', 300);
      chain(o, lp, g, sfx); o.start(t); o.stop(t + 0.25);
    }
  }
  const VOICES = { dante: 150, lucia: 330, voice: 95, thought: 0, radio: 240 };
  function blip(who) {
    if (!ctx || !VOICES[who]) return;
    const t = now();
    const o = ctx.createOscillator(), g = gain(0);
    o.type = who === 'voice' ? 'sawtooth' : 'triangle';
    o.frequency.value = VOICES[who] * (0.92 + Math.random() * 0.16);
    env(g, t, 0.004, who === 'voice' ? 0.03 : 0.05, 0.04);
    chain(o, g, sfx); o.start(t); o.stop(t + 0.06);
  }
  function tick() {
    if (!ctx) return;
    const t = now();
    const n = src(noise), hp = filt('highpass', 3000), g = gain(0);
    env(g, t, 0.001, 0.12, 0.02);
    chain(n, hp, g, sfx); n.start(t); n.stop(t + 0.05);
  }
  function select() {
    if (!ctx) return;
    const t = now();
    const o = ctx.createOscillator(), g = gain(0);
    o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.setValueAtTime(780, t + 0.05);
    env(g, t, 0.004, 0.08, 0.12);
    chain(o, g, sfx); o.start(t); o.stop(t + 0.2);
  }
  function clue() {
    if (!ctx) return;
    const t = now();
    [67, 71, 74, 79].forEach((n, i) => {
      const o = ctx.createOscillator(), g = gain(0);
      o.type = 'sine'; o.frequency.value = midi(n);
      env(g, t + i * 0.07, 0.01, 0.07, 0.6);
      chain(o, g, sfx); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.7);
    });
  }
  function sting() {
    if (!ctx) return;
    const t = now();
    [33, 40, 46, 81, 82].forEach((n, i) => {
      const o = ctx.createOscillator(), g = gain(0);
      o.type = i < 3 ? 'triangle' : 'sine'; o.frequency.value = midi(n);
      env(g, t, i < 3 ? 0.01 : 0.4, i < 3 ? 0.35 : 0.04, 4);
      chain(o, g, sfx); o.start(t); o.stop(t + 4.5);
    });
  }
  let ringTimer = null;
  function ringOnce() {
    const t = now();
    const g = gain(0), am = gain(0);
    [1020, 1290].forEach(f => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(am); o.start(t); o.stop(t + 1.1); });
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 22;
    const lg = gain(0.5); chain(lfo, lg); lg.connect(am.gain); am.gain.value = 0.5;
    lfo.start(t); lfo.stop(t + 1.1);
    const bp = filt('bandpass', 1500, 1.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    g.gain.setValueAtTime(0.09, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    chain(am, bp, g, sfx);
  }
  function ring(on) {
    if (!ctx) return;
    clearInterval(ringTimer); ringTimer = null;
    if (on) { ringOnce(); ringTimer = setInterval(ringOnce, 2600); }
  }
  function pickup() {
    if (!ctx) return;
    knock(1, 0, 0.4); tick();
  }
  function busy() {
    if (!ctx) return;
    for (let i = 0; i < 4; i++) {
      const t = now() + 0.3 + i * 0.4;
      const o = ctx.createOscillator(), g = gain(0);
      o.frequency.value = 425;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.setValueAtTime(0.05, t + 0.19); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      chain(o, g, sfx); o.start(t); o.stop(t + 0.22);
    }
  }
  function radioStatic(dur = 2.5) {
    if (!ctx) return;
    const t = now();
    const n = src(noise, true), bp = filt('bandpass', 1800, 0.8), g = gain(0);
    g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < dur * 12; k++) g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.1, t + k / 12);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    chain(n, bp, g, sfx); n.start(t); n.stop(t + dur);
  }
  function pour() {
    if (!ctx) return;
    for (let i = 0; i < 4; i++) {
      const t = now() + i * 0.14;
      const n = src(noise), bp = filt('bandpass', 500 + i * 90, 6), g = gain(0);
      env(g, t, 0.01, 0.3, 0.12);
      chain(n, bp, g, sfx); n.start(t); n.stop(t + 0.2);
    }
  }
  function paper() {
    if (!ctx) return;
    const t = now();
    const n = src(noise), hp = filt('highpass', 2400), g = gain(0);
    env(g, t, 0.02, 0.12, 0.18);
    chain(n, hp, g, sfx); n.start(t); n.stop(t + 0.3);
  }
  function powerDown() {
    if (!ctx) return;
    const t = now();
    const o = ctx.createOscillator(), g = gain(0);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(25, t + 0.7);
    const lp = filt('lowpass', 500);
    env(g, t, 0.01, 0.18, 0.7);
    chain(o, lp, g, sfx); o.start(t); o.stop(t + 0.8);
    tick();
  }
  function rattle() {
    if (!ctx) return;
    for (let i = 0; i < 7; i++) {
      const t = now() + i * 0.09 + Math.random() * 0.04;
      const n = src(noise), bp = filt('bandpass', 2600 + Math.random() * 1000, 4), g = gain(0);
      env(g, t, 0.002, 0.25, 0.04);
      chain(n, bp, g, sfx); n.start(t); n.stop(t + 0.06);
    }
  }

  let droneNodes = null;
  function drone(on) {
    if (!ctx) return;
    if (on && !droneNodes) {
      const t = now(), g = gain(0);
      g.gain.linearRampToValueAtTime(0.16, t + 4);
      const lp = filt('lowpass', 260);
      const oscs = [41, 41.4, 55.2].map(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t); return o; });
      chain(lp, g, sfx);
      droneNodes = { g, oscs };
    } else if (!on && droneNodes) {
      const { g, oscs } = droneNodes, t = now();
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.3);
      oscs.forEach(o => o.stop(t + 0.35));
      droneNodes = null;
    }
  }

  // ── Musica: un giro minore lento, contrabbasso, piano elettrico e tromba sordina ──
  const BPM = 64, BEAT = 60 / BPM;
  const BARS = [
    { bass: [45, 48, 52, 50], chord: [60, 64, 67, 71] },
    { bass: [41, 45, 48, 43], chord: [57, 60, 64, 69] },
    { bass: [38, 41, 45, 44], chord: [53, 57, 60, 64] },
    { bass: [40, 44, 47, 46], chord: [56, 62, 65, 68] },
  ];
  const MELODY = [
    [0, 0, 76, 1.5], [0, 1.5, 74, 0.5], [0, 2, 72, 1], [0, 3, 69, 1],
    [1, 0, 72, 2.5], [1, 3, 69, 0.5], [1, 3.5, 67, 0.5],
    [2, 0, 74, 1], [2, 1, 77, 1], [2, 2, 76, 1], [2, 3, 74, 1],
    [3, 0, 71, 2], [3, 2, 68, 2],
  ];
  let musicTimer = null, nextT = 0, stepN = 0;
  function pluck(t, n, d) {
    const o = ctx.createOscillator(), s = ctx.createOscillator(), g = gain(0), lp = filt('lowpass', 700);
    o.type = 'triangle'; o.frequency.value = midi(n); s.type = 'sine'; s.frequency.value = midi(n - 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); s.connect(lp); chain(lp, g, mus);
    o.start(t); s.start(t); o.stop(t + d); s.stop(t + d);
  }
  function keys(t, notes, d, vol) {
    notes.forEach((n, i) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = gain(0);
      o.type = 'sine'; o.frequency.value = midi(n); o2.type = 'triangle'; o2.frequency.value = midi(n) * 1.003;
      const tt = t + i * 0.025;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(vol, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
      o.connect(g); o2.connect(g); g.connect(mus);
      o.start(tt); o2.start(tt); o.stop(tt + d); o2.stop(tt + d);
    });
  }
  function horn(t, n, d) {
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = gain(4), lp = filt('lowpass', 1300, 3), g = gain(0);
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    vib.frequency.value = 5; chain(vib, vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
    g.gain.setValueAtTime(0.07, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    chain(o, lp, g, mus); o.start(t); vib.start(t); o.stop(t + d); vib.stop(t + d);
  }
  function brush(t) {
    const n = src(noise), bp = filt('bandpass', 5000, 0.8), g = gain(0);
    env(g, t, 0.03, 0.05, 0.18);
    chain(n, bp, g, mus); n.start(t, Math.random()); n.stop(t + 0.25);
  }
  function schedule() {
    while (nextT < now() + 0.25) {
      const bar = Math.floor(stepN / 4) % 4, b = stepN % 4, loop = Math.floor(stepN / 16);
      const B = BARS[bar];
      pluck(nextT, B.bass[b] - 12, BEAT * 0.95);
      if (b === 0) keys(nextT, B.chord, BEAT * 3.5, 0.045);
      if (b === 2) keys(nextT + BEAT * 0.66, B.chord.slice(2), BEAT * 1.2, 0.03);
      if (b % 2 === 1) brush(nextT);
      if (loop % 2 === 1) for (const [mb, off, n, d] of MELODY) if (mb === bar && off >= b && off < b + 1) horn(nextT + (off - b) * BEAT, n, d * BEAT);
      nextT += BEAT; stepN++;
    }
  }
  function music(on, vol = 0.3) {
    if (!ctx) return;
    const t = now();
    mus.gain.cancelScheduledValues(t);
    mus.gain.setValueAtTime(mus.gain.value, t);
    if (on) {
      mus.gain.linearRampToValueAtTime(vol, t + 2);
      if (!musicTimer) { nextT = t + 0.1; stepN = 0; musicTimer = setInterval(schedule, 60); schedule(); }
    } else {
      mus.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      const tm = musicTimer; musicTimer = null;
      setTimeout(() => clearInterval(tm), 1600);
    }
  }

  function setMuted(m) {
    muted = m;
    if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
  }

  return {
    init, thunder, knock, creak, doorShut, step, stairs, blip, tick, select, clue, sting,
    ring, pickup, busy, radioStatic, pour, paper, powerDown, rattle, drone, music, rainLevel,
    setMuted, get muted() { return muted; }, get ready() { return !!ctx; },
  };
})();
