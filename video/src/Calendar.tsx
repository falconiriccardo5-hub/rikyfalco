import React from 'react';
import {C, E, FONT, OUT, mix, prog, useT} from './brand';
import {Check} from './ui';

export type Month = {name: string; days: number; off: number; t0: number; step: number};

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const PW = 760;
export const PH = 640;

/** Una pagina di calendario. I giorni di allenamento (L-M-V) vengono "timbrati" in sequenza. */
export const CalPage: React.FC<{m: Month; tint?: string}> = ({m, tint = C.blue}) => {
  const t = useT();
  const cell = 97;
  const cells: React.ReactNode[] = [];
  let k = 0;
  for (let d = 1; d <= m.days; d++) {
    const idx = m.off + d - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const train = col === 0 || col === 2 || col === 4;
    let stampP = 0;
    if (train) {
      stampP = prog(t, m.t0 + k * m.step, m.t0 + k * m.step + 0.18, E.back);
      k++;
    }
    cells.push(
      <div key={d} style={{position: 'absolute', left: col * cell, top: row * 76, width: cell, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 34, color: col > 4 ? 'rgba(17,17,17,0.35)' : C.ink, opacity: stampP > 0.3 ? 0.35 : 1}}>{d}</span>
        {stampP > 0 && (
          <svg width={cell} height={76} style={{position: 'absolute', left: 0, top: 0}}>
            <Check x={cell / 2} y={38} r={27} p={stampP} color={tint} />
          </svg>
        )}
      </div>,
    );
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: C.paper, border: `${OUT}px solid ${C.ink}`, borderRadius: 28, overflow: 'hidden', boxShadow: `12px 12px 0 ${C.ink}`}}>
      <div style={{height: 132, background: tint, borderBottom: `${OUT}px solid ${C.ink}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 14}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 74, letterSpacing: 2, color: '#fff'}}>{m.name}</span>
      </div>
      <div style={{position: 'absolute', left: 40, top: 150, width: cell * 7, display: 'flex'}}>
        {DOW.map((d, i) => (
          <div key={i} style={{width: cell, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 26, color: C.blueD}}>{d}</div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 40, top: 196}}>{cells}</div>
    </div>
  );
};

/** Calendario a strappo con rings: flips[i] = istante in cui la pagina i gira via. */
export const WallCalendar: React.FC<{months: Month[]; flips: number[]; flipDur?: number; tint?: string}> = ({months, flips, flipDur = 0.32, tint}) => {
  const t = useT();
  let cur = 0;
  flips.forEach((f, i) => {
    if (t >= f + flipDur) cur = i + 1;
  });
  const fi = flips.findIndex((f) => t >= f && t < f + flipDur);
  const p = fi >= 0 ? prog(t, flips[fi], flips[fi] + flipDur, E.in) : 0;
  return (
    <div style={{position: 'relative', width: PW, height: PH, perspective: 2400}}>
      {fi >= 0 && (
        <div style={{position: 'absolute', inset: 0}}>
          <CalPage m={months[fi + 1]} tint={tint} />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '50% 0%',
          transform: `rotateX(${-p * 118}deg)`,
          backfaceVisibility: 'hidden',
          opacity: p > 0.8 ? 1 - (p - 0.8) * 5 : 1,
        }}
      >
        <CalPage m={months[cur]} tint={tint} />
      </div>
      {/* anelli */}
      {[PW * 0.3, PW * 0.7].map((x, i) => (
        <div key={i} style={{position: 'absolute', left: x - 17, top: -26, width: 34, height: 64, borderRadius: 17, background: C.ink}} />
      ))}
      {[PW * 0.3, PW * 0.7].map((x, i) => (
        <div key={'h' + i} style={{position: 'absolute', left: x - 8, top: -8, width: 16, height: 16, borderRadius: 8, background: C.cream}} />
      ))}
    </div>
  );
};
export {mix};
