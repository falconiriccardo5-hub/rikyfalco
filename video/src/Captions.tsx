import React from 'react';
import {C, E, FONT, OUT, mix, prog, shake, useT} from './brand';

export type CapLine = {
  t0: number;
  t1: number;
  text: string;
  /** indici parole evidenziate (blu) */
  hl?: number[];
  /** tempi manuali di ogni parola (secondi assoluti); altrimenti distribuiti */
  times?: number[];
  big?: boolean;
  y?: number; // posizione verticale per big
  size?: number;
  color?: string; // colore parole hl in modalità big
  slam?: number; // indice parola che "sbatte" (shake)
  dark?: boolean; // testo su sfondo scuro (big)
  hlColors?: Record<number, string>;
};

const words = (l: CapLine) => l.text.split(' ');

const wordTimes = (l: CapLine) => {
  if (l.times) return l.times;
  const ws = words(l);
  const total = ws.reduce((a, w) => a + w.length + 2, 0);
  let acc = 0;
  const dur = (l.t1 - l.t0) * 0.92;
  return ws.map((w) => {
    const t = l.t0 + (acc / total) * dur;
    acc += w.length + 2;
    return t;
  });
};

/** Sottotitolo piccolo "karaoke" in basso, stile card neo-brutal Coach Riky */
const SmallCaption: React.FC<{l: CapLine}> = ({l}) => {
  const t = useT();
  const ws = words(l);
  const ts = wordTimes(l);
  const pIn = prog(t, l.t0, l.t0 + 0.22, E.back);
  const pOut = prog(t, l.t1 - 0.14, l.t1, E.in);
  const active = ts.reduce((a, w, i) => (t >= w ? i : a), -1);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 72,
        display: 'flex',
        justifyContent: 'center',
        opacity: 1 - pOut,
        transform: `translateY(${mix(40, 0, pIn) + pOut * 24}px) scale(${mix(0.9, 1, pIn)})`,
      }}
    >
      <div
        style={{
          background: C.cream,
          border: `${OUT}px solid ${C.ink}`,
          borderRadius: 28,
          boxShadow: `9px 9px 0 ${C.ink}`,
          padding: '14px 30px 16px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 58,
          textTransform: 'uppercase',
          letterSpacing: -0.5,
          color: C.ink,
          whiteSpace: 'nowrap',
        }}
      >
        {ws.map((w, i) => {
          const on = i === active;
          const pw = prog(t, ts[i], ts[i] + 0.16, E.back);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: '0 12px',
                borderRadius: 14,
                background: on || (l.hl?.includes(i) && i <= active) ? C.blue : 'transparent',
                color: on || (l.hl?.includes(i) && i <= active) ? '#fff' : t < ts[i] ? 'rgba(17,17,17,0.28)' : C.ink,
                transform: on ? `scale(${mix(0.9, 1.1, pw)}) rotate(-1.5deg)` : 'none',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Hook / chiusura: parole enormi che esplodono a tempo */
const BigCaption: React.FC<{l: CapLine}> = ({l}) => {
  const t = useT();
  const ws = words(l);
  const ts = wordTimes(l);
  const size = l.size ?? 112;
  const pOut = prog(t, l.t1 - 0.16, l.t1, E.in);
  const sk = l.slam !== undefined ? shake(t, ts[l.slam], 16, 0.4) : {x: 0, y: 0};
  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        right: 100,
        top: l.y ?? 60,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * 0.26,
        rowGap: size * 0.02,
        opacity: 1 - pOut,
        transform: `translate(${sk.x}px,${sk.y}px) translateY(${-pOut * 30}px)`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.025,
        textTransform: 'uppercase',
        color: l.dark ? C.cream : C.ink,
      }}
    >
      {ws.map((w, i) => {
        if (t < ts[i]) return <span key={i} style={{opacity: 0}}>{w}</span>;
        const p = prog(t, ts[i], ts[i] + 0.2, E.back);
        const hl = l.hl?.includes(i);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${mix(0.3, 1, p)}) rotate(${mix(i % 2 ? 6 : -6, 0, p)}deg)`,
              opacity: Math.min(1, p * 2.5),
              color: hl ? l.hlColors?.[i] ?? l.color ?? C.blue : undefined,
              WebkitTextStroke: hl ? `${size * 0.045}px ${C.ink}` : undefined,
              paintOrder: 'stroke fill',
              textShadow: hl ? `${size * 0.05}px ${size * 0.05}px 0 ${C.ink}` : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{lines: CapLine[]}> = ({lines}) => {
  const t = useT();
  return (
    <>
      {lines.map((l, i) =>
        t >= l.t0 && t < l.t1 ? l.big ? <BigCaption key={i} l={l} /> : <SmallCaption key={i} l={l} /> : null,
      )}
    </>
  );
};
