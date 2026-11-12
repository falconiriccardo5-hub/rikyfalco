/** Video 13 «Stacchi rumeni» — versione con il clone HeyGen di Riccardo in riquadro (angolo in basso a sinistra),
 *  sopra il video «solo ragazza». Voce: clone · effetti e musica bassi (public/soundtrack13_clone.wav). */
import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, E, FONT, mix, prog, useT} from '../brand';
import {Video13Body, END} from './Video13';
import words from '../clone_stacco_words.json';

export const DURATION13C = Math.ceil(END * 30);

/* ------------------------------------------------------------------ riquadro del clone */
const PIP = {x: 44, y: 1360, w: 320, h: 400};
// regione del video sorgente (1080×1920) da mostrare: busto e testa, 4:5
const CROP = {x: 230, y: 860, w: 620, h: 775};

type W = [number, number, string];
const WORDS = (words as W[]).map(([a, b, w]) => {
  let x = w.replace(/^rumenie$/i, 'rumeni e');
  if (/^analisi/i.test(x)) x = 'ANALISI' + x.slice(7);
  return [a, b, x] as W;
});
const speaking = (t: number) => WORDS.some(([a, b]) => t >= a - 0.05 && t <= b + 0.12);

const Pip: React.FC = () => {
  const t = useT();
  const f = useCurrentFrame();
  const inn = prog(t, 0.05, 0.55, E.back);
  const cta = prog(t, 28.6, 29.2, E.backSoft);
  const k = PIP.w / CROP.w;
  const sc = mix(0.4, 1, inn) * mix(1, 1.08, cta);
  const talk = speaking(t);
  return (
    <div style={{position: 'absolute', left: PIP.x, top: PIP.y, width: PIP.w, height: PIP.h, transform: `scale(${sc})`, transformOrigin: '0% 100%', opacity: Math.min(1, inn * 1.5)}}>
      {/* alone che pulsa quando parla */}
      <div style={{position: 'absolute', inset: -10, borderRadius: 38, background: C.blue, opacity: talk ? 0.35 + 0.15 * Math.sin(f * 0.6) : 0.12, filter: 'blur(10px)'}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden', border: `6px solid ${C.blue}`, background: '#ddd', boxShadow: '0 18px 40px rgba(0,0,0,.45)'}}>
        <OffthreadVideo
          src={staticFile('clone_stacco.mp4')}
          muted
          style={{position: 'absolute', width: 1080 * k, height: 1920 * k, left: -CROP.x * k, top: -CROP.y * k, maxWidth: 'none'}}
        />
      </div>
      {/* etichetta nome */}
      <div style={{position: 'absolute', left: 18, top: -30, padding: '8px 18px', borderRadius: 14, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 1, transform: `translateY(${(1 - prog(t, 0.4, 0.8, E.back)) * 20}px)`, opacity: prog(t, 0.4, 0.7)}}>
        COACH RIKY
      </div>
      {/* indicatore voce */}
      <div style={{position: 'absolute', right: 16, bottom: 16, display: 'flex', gap: 5, alignItems: 'flex-end', height: 34, padding: '6px 9px', borderRadius: 12, background: 'rgba(17,17,17,.7)'}}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{width: 6, borderRadius: 3, background: '#fff', height: talk ? 8 + 16 * Math.abs(Math.sin(f * 0.45 + i * 1.3)) : 6}} />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ sottotitoli a destra del riquadro */
type Chunk = {t0: number; t1: number; w: W[]};
const KEY = /^(rumeni|schiena|glutei|tre|uno|peso|livello|due|piede|tallone|lombare|anca|indietro|femorali|stacco|ANALISI)/i;
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: W[] = [];
  WORDS.forEach((w, i) => {
    cur.push(w);
    const end = /[.?!]$/.test(w[2]) || (/,$/.test(w[2]) && cur.length >= 3) || cur.length >= 4 || i === WORDS.length - 1;
    const gap = WORDS[i + 1] ? WORDS[i + 1][0] - w[1] > 0.35 : true;
    if (end || gap) {
      out.push({t0: cur[0][0] - 0.08, t1: 0, w: cur});
      cur = [];
    }
  });
  out.forEach((c, i) => (c.t1 = out[i + 1] ? out[i + 1].t0 - 0.02 : END - 0.1));
  return out;
})();
const Subs: React.FC = () => {
  const t = useT();
  const c = CHUNKS.find((x) => t >= x.t0 && t < x.t1);
  if (!c) return null;
  const p = prog(t, c.t0, c.t0 + 0.18, E.back);
  return (
    <div style={{position: 'absolute', left: PIP.x + PIP.w + 34, right: 120, top: PIP.y + 110, transform: `scale(${mix(0.85, 1, p)})`, transformOrigin: 'left center', opacity: Math.min(1, p * 2)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 56, lineHeight: 1.12, color: '#fff', textShadow: '0 4px 0 rgba(0,0,0,.5)', letterSpacing: -0.5}}>
        {c.w.map(([a, , w], i) => {
          const on = t >= a - 0.03;
          const key = KEY.test(w);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: on ? 1 : 0.35, color: on && key ? '#fff' : undefined, background: on && key ? C.blue : 'transparent', borderRadius: 10, padding: key ? '0 8px' : 0, transform: `translateY(${on ? 0 : 6}px)`}}>
              {w.replace(/[,.]$/, '')}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** fascia scura sotto il pavimento per leggibilità di riquadro e sottotitoli */
const Shade: React.FC = () => <div style={{position: 'absolute', left: 0, right: 0, top: 1300, bottom: 0, background: 'linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,.55) 30%, rgba(17,17,17,.7) 100%)'}} />;

export const Video13Clone: React.FC = () => (
  <AbsoluteFill>
    <Video13Body solo audio="soundtrack13_clone.wav" />
    <Shade />
    <Sequence from={0}>
      <Pip />
    </Sequence>
    <Subs />
  </AbsoluteFill>
);
