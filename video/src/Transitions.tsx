import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, prog, useT} from './brand';

export type Tr = {t: number; type: 'wipeR' | 'wipeL' | 'wipeU' | 'stripes' | 'iris'; color?: string; d?: number};


const Block: React.FC<{tr: Tr; c: number; e: number}> = ({tr, c, e}) => {
  const col = tr.color ?? C.blue;
  // c: 0→1 copre · e: 0→1 scopre
  if (tr.type === 'wipeR' || tr.type === 'wipeL') {
    const dir = tr.type === 'wipeR' ? 1 : -1;
    const x = (c - 1) * 115 * dir + e * 115 * dir; // % di larghezza
    return (
      <>
        <AbsoluteFill style={{transform: `translateX(${x + dir * 3}%) skewX(${-12 * dir}deg)`, background: C.ink, width: '125%', left: '-12%'}} />
        <AbsoluteFill style={{transform: `translateX(${x}%) skewX(${-12 * dir}deg)`, background: col, width: '125%', left: '-12%'}} />
      </>
    );
  }
  if (tr.type === 'wipeU') {
    const y = (1 - c) * 112 - e * 112;
    return (
      <>
        <AbsoluteFill style={{transform: `translateY(${y - 3}%)`, background: C.ink}} />
        <AbsoluteFill style={{transform: `translateY(${y}%)`, background: col}} />
      </>
    );
  }
  if (tr.type === 'stripes') {
    const n = 6;
    return (
      <>
        {Array.from({length: n}).map((_, i) => {
          const dir = i % 2 ? 1 : -1;
          const st = i * 0.06;
          const cc = Math.min(1, Math.max(0, (c - st) / (1 - st * 1.3)));
          const ee = Math.min(1, Math.max(0, (e - st * 0.8) / (1 - st)));
          const x = (1 - cc) * -105 * dir + ee * 105 * dir;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                top: `${(i * 100) / n - 0.1}%`,
                height: `${100 / n + 0.3}%`,
                transform: `translateX(${x}%)`,
                background: i % 2 ? C.ink : col,
              }}
            />
          );
        })}
      </>
    );
  }
  // iris
  const R = 1250;
  if (e > 0) {
    const r = e * R;
    return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, transparent ${r}px, ${C.ink} ${r + 2}px)`}} />;
  }
  const r = c * R;
  return (
    <>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${col} ${r}px, transparent ${r + 2}px)`}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, transparent ${Math.max(0, r - 60)}px, ${C.ink} ${Math.max(0, r - 58)}px, ${C.ink} ${r}px, transparent ${r + 2}px)`}} />
    </>
  );
};

export const Transitions: React.FC<{list: Tr[]}> = ({list}) => {
  const t = useT();
  return (
    <>
      {list.map((tr, i) => {
        const d = tr.d ?? 0.42;
        const COVER = d * 0.47;
        const EXIT = d * 0.53;
        if (t < tr.t - COVER || t > tr.t + EXIT) return null;
        const c = prog(t, tr.t - COVER, tr.t, E.inOut);
        const e = prog(t, tr.t, tr.t + EXIT, E.inOut);
        return (
          <AbsoluteFill key={i} style={{overflow: 'hidden', pointerEvents: 'none'}}>
            <Block tr={tr} c={c} e={e} />
          </AbsoluteFill>
        );
      })}
    </>
  );
};
