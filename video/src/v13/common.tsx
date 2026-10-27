/** Scene e componenti riusabili per i reel verticali "parlati" (Riky + cartelli). */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {cardStyle} from '../ui';
import {Riky} from '../Riky';
import {GirlSide} from './Girl';
import {VW, VH, KeywordCTA, Handle, Sparkles} from './kit';

export const enter = (t: number, a: number, d = 0.4) => prog(t, a, a + d, E.back);

export const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: '#fff', backgroundImage: 'radial-gradient(rgba(17,17,17,0.10) 2.5px, transparent 3px)', backgroundSize: '54px 54px'}}>{children}</AbsoluteFill>
);

export const RikyAt: React.FC<{env: number[]; x?: number; y?: number; scale?: number; flip?: boolean; smile?: number; brow?: number; browTilt?: number; arm?: 'up' | 'point' | 'shrug' | 'wag' | null; circle?: boolean}> = ({env, x = 540, y = 1560, scale = 0.8, flip = false, smile = 0.9, brow = 6, browTilt = 0, arm = null, circle}) => {
  const t = useT();
  const talk = useTalk(env);
  const wave = Math.sin(t * 10) * 24;
  const wag = Math.sin(t * 12) * 34;
  return (
    <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
      {circle && <circle cx={x} cy={y - 400 * scale} r={(330 * scale) / 0.8} fill={C.blue} />}
      <Riky
        x={x}
        y={y}
        scale={scale}
        flip={flip}
        mouth={talk}
        smile={smile}
        brow={brow}
        browTilt={browTilt}
        tilt={arm === 'shrug' ? Math.sin(t * 6) * 4 : Math.sin(t * 3) * 2}
        armR={arm === 'up' ? {hand: [640 + wave, 380]} : arm === 'point' ? {hand: [700, 560]} : arm === 'shrug' ? {hand: [660, 690]} : arm === 'wag' ? {hand: [610 + wag, 300]} : undefined}
        armL={arm === 'shrug' ? {hand: [160, 690]} : undefined}
      />
    </svg>
  );
};

/** cartello grande centrato */
export const BigSign: React.FC<{t0: number; top?: number; children: React.ReactNode; bg?: string; rot?: number; size?: number}> = ({t0, top = 260, children, bg = '#fff', rot = -3, size = 84}) => {
  const t = useT();
  const p = enter(t, t0);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', transform: `scale(${p}) rotate(${rot}deg)`}}>
      <div style={{...cardStyle(bg, 12), padding: '14px 40px', fontFamily: FONT, fontWeight: 900, fontSize: size, color: bg === '#fff' ? C.ink : '#fff', letterSpacing: -1, textAlign: 'center', lineHeight: 1.05}}>{children}</div>
    </div>
  );
};

export const Mirror: React.FC<{a: number; eqAt: number; labels?: [string, string]}> = ({a, eqAt, labels = ['PRIMA', 'OGGI']}) => {
  const t = useT();
  const p = enter(t, a);
  const eq = prog(t, eqAt - 0.1, eqAt + 0.25, E.back);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', gap: 120, transform: `scale(${p})`}}>
        {labels.map((lbl, i) => (
          <div key={i} style={{width: 360, height: 900, borderRadius: 180, border: `14px solid ${C.ink}`, background: '#EEE9FB', position: 'relative', overflow: 'hidden', boxShadow: `12px 12px 0 ${C.blue}`}}>
            <svg width={332} height={872} viewBox="0 0 332 872">
              <GirlSide x={166} y={800} scale={0.82} h={0} noDb smile={i ? -0.3 : 0.2} hurt={i ? 0.3 : 0} />
            </svg>
            <div style={{position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink}}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 540, top: 670, transform: `translate(-50%,-50%) scale(${eq})`, width: 120, height: 120, borderRadius: 60, background: C.red, border: `${OUT}px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 86, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>=</div>
    </Paper>
  );
};

export const LogTable: React.FC<{a: number; showAt: number; beatAt: number; rows?: string[][]}> = ({a, showAt, beatAt, rows}) => {
  const t = useT();
  const R = rows ?? [
    ['Squat', '40 kg × 8', '42,5 kg × 8'],
    ['Panca manubri', '20 kg × 8', '20 kg × 9'],
    ['Rematore', '18 kg × 10', '20 kg × 10'],
  ];
  const beat = prog(t, beatAt, beatAt + 0.4);
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 440, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12), overflow: 'hidden', fontFamily: FONT}}>
      <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', background: C.ink, color: '#fff', fontWeight: 900, fontSize: 32, padding: '14px 20px'}}>
        <span>ESERCIZIO</span>
        <span>SETT. 1</span>
        <span>SETT. 2</span>
      </div>
      {R.map((r, i) => {
        const p = prog(t, showAt + i * 0.2, showAt + i * 0.2 + 0.3);
        return (
          <div key={i} style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', padding: '22px 20px', borderTop: `4px solid ${C.ink}`, fontWeight: 900, fontSize: 36, color: C.ink, alignItems: 'center'}}>
            <span>{r[0]}</span>
            <span style={{opacity: p}}>{r[1]}</span>
            <span style={{opacity: beat, color: C.blue}}>{r[2]} ↑</span>
          </div>
        );
      })}
    </div>
  );
};

export const RiseChart: React.FC<{a: number; until: number; title: string; flat?: boolean}> = ({a, until, title, flat}) => {
  const t = useT();
  const pts = [0, 1, 2, 3, 4, 5].map((i) => [100 + i * 150, flat ? 300 + Math.sin(i * 2.3) * 20 : 430 - i * 62 - (i % 2) * 14] as [number, number]);
  const p = prog(t, a + 0.2, until, E.inOut);
  const n = Math.max(1, Math.floor(p * pts.length));
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 300, height: 640, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, padding: '20px 30px'}}>{title}</div>
      <svg width={960} height={520} style={{position: 'absolute', left: 0, top: 100}}>
        <line x1={60} y1={460} x2={900} y2={460} stroke={C.ink} strokeWidth={6} />
        <line x1={60} y1={40} x2={60} y2={460} stroke={C.ink} strokeWidth={6} />
        <polyline points={pts.slice(0, n).map((q) => q.join(',')).join(' ')} stroke={flat ? C.red : C.blue} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.slice(0, n).map((q, i) => (
          <circle key={i} cx={q[0]} cy={q[1]} r={18} fill="#fff" stroke={C.ink} strokeWidth={6} />
        ))}
      </svg>
    </div>
  );
};

export const TrustChips: React.FC<{env: number[]; a: number; title: [string, string]; chips: {txt: string; at: number}[]}> = ({env, a, title, chips}) => {
  const t = useT();
  const talk = useTalk(env);
  const pin = enter(t, a);
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={300} cy={1100} r={250 * pin} fill={C.blue} />
        <Riky x={300} y={mix(1700, 1470, pin)} scale={0.72} flip={false} mouth={talk} smile={0.9} brow={6} armR={{hand: [700, 560 + Math.sin(t * 4) * 20]}} />
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, letterSpacing: -1}}>{title[0]}</div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 230, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.blue, letterSpacing: -1}}>{title[1]}</div>
      <div style={{position: 'absolute', left: 400, right: 50, top: 420, display: 'flex', flexDirection: 'column', gap: 24}}>
        {chips.map((c, i) => {
          const p = prog(t, c.at - 0.1, c.at + 0.25, E.back);
          return (
            <div key={i} style={{transform: `translateX(${(1 - p) * 300}px)`, opacity: p, ...cardStyle(i === 1 ? C.blue : '#fff', 8), padding: '16px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 40, color: i === 1 ? '#fff' : C.ink}}>✓ {c.txt}</div>
          );
        })}
      </div>
    </Paper>
  );
};

export const CtaScene: React.FC<{env: number[]; a: number; wordAt: number; handleAt: number}> = ({env, a, wordAt, handleAt}) => {
  const t = useT();
  const talk = useTalk(env);
  const pin = enter(t, a);
  const wave = Math.sin(t * 10) * 26;
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={540} cy={1170} r={320 * pin} fill={C.blue} />
        <Riky x={540} y={mix(1800, 1560, pin)} scale={0.8} mouth={talk} smile={1} brow={8} armR={{hand: [650 + wave, 380]}} tilt={Math.sin(t * 3) * 2} />
      </svg>
      <KeywordCTA t0={wordAt - 0.1} word="ANALISI" />
      <Handle t0={handleAt} top={720} />
      <Sparkles t0={wordAt} x={540} y={400} n={14} />
    </Paper>
  );
};
