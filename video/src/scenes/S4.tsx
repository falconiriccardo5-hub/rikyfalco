import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Barbell, Stamp} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT} from '../brand';

export const S4A = {l1: 14.15, l2: 15.0, l3: 15.85};
export const S4B = {draw0: 16.6, draw1: 18.2, eq: 17.3, zero: 17.8};

const Line: React.FC<{t0: number; a: string; b: string; y: number; kind: 0 | 1 | 2; icon: React.ReactNode}> = ({t0, a, b, y, kind, icon}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.3, kind === 1 ? E.back : E.out);
  if (t < t0) return null;
  const sk = shake(t, t0 + 0.12, 10, 0.3);
  let tf = '';
  if (kind === 0) tf = `translateX(${mix(-1300, 0, p)}px) skewX(${mix(-24, 0, p)}deg)`;
  if (kind === 1) tf = `scale(${mix(0.2, 1, p)}) rotate(${mix(-8, 0, p)}deg)`;
  if (kind === 2) tf = `translateY(${mix(-500, 0, p)}px)`;
  return (
    <div style={{position: 'absolute', left: 300 + sk.x, top: y + sk.y, display: 'flex', alignItems: 'center', gap: 30, transform: tf, transformOrigin: '0 50%', opacity: Math.min(1, p * 3)}}>
      <div style={{position: 'absolute', left: -170, top: -4}}>{icon}</div>
      <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 138, letterSpacing: -4, color: C.cream, lineHeight: 1}}>{a}</span>
      <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 138, letterSpacing: -4, color: C.blueL, lineHeight: 1}}>{b}</span>
    </div>
  );
};

export const S4a: React.FC = () => {
  const t = useT();
  const badge = (children: React.ReactNode) => (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={58} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
      {children}
    </svg>
  );
  return (
    <AbsoluteFill>
      <Bg color={C.ink} dot="rgba(255,255,255,0.06)" />
      <Line
        t0={S4A.l1}
        a="STESSO"
        b="PESO"
        y={170}
        kind={0}
        icon={badge(<g transform="translate(65,65) scale(0.34)"><Barbell cx={0} cy={0} half={110} plates={2} size={0.7} label="40" /></g>)}
      />
      <Line
        t0={S4A.l2}
        a="STESSI"
        b="ESERCIZI"
        y={390}
        kind={1}
        icon={badge(
          <g transform={`translate(65,65) rotate(${t * 140})`} fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M -30 -6 A 30 30 0 0 1 20 -24" />
            <path d="M 12 -34 L 22 -24 L 10 -16" />
            <path d="M 30 6 A 30 30 0 0 1 -20 24" />
            <path d="M -12 34 L -22 24 L -10 16" />
          </g>,
        )}
      />
      <Line
        t0={S4A.l3}
        a="STESSO"
        b="STIMOLO"
        y={610}
        kind={2}
        icon={badge(<path d="M 18 70 L 112 70" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />)}
      />
    </AbsoluteFill>
  );
};

export const S4b: React.FC = () => {
  const t = useT();
  const dp = prog(t, S4B.draw0, S4B.draw1, E.lin);
  const X0 = 250;
  const X1 = 1670;
  const Y = 360;
  const tipX = X0 + (X1 - X0) * dp;
  const eq = prog(t, S4B.eq, S4B.eq + 0.3, E.back);
  const z = prog(t, S4B.zero, S4B.zero + 0.3, E.back);
  const pIn = prog(t, 16.5, 16.8, E.back);
  const blinkPulse = (Math.sin(t * 22) > 0.2 ? 1 : 0.4) * (dp < 1 ? 1 : 0.8);
  const bumps = [0.08, 0.13, 0.18];
  const path: string[] = [`M ${X0} ${Y}`];
  const N = 120;
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    let y = Y;
    // piccolo battito iniziale poi linea piatta
    for (const b of bumps) {
      const d = u - b;
      if (Math.abs(d) < 0.02) y -= (1 - Math.abs(d) / 0.02) * (b === 0.13 ? 150 : 60);
    }
    if (X0 + (X1 - X0) * u <= tipX) path.push(`L ${X0 + (X1 - X0) * u} ${y}`);
  }
  return (
    <AbsoluteFill>
      <Bg color={C.ink} dot="rgba(255,255,255,0.06)" />
      <div style={{position: 'absolute', left: 150, top: 110, width: 1620, height: 470, border: `${OUT}px solid ${C.cream}`, borderRadius: 26, transform: `scale(${mix(0.8, 1, pIn)})`, opacity: pIn, overflow: 'hidden', background: '#0E1013'}}>
        <svg width={1620} height={470} style={{position: 'absolute', left: -150 - OUT, top: -110 - OUT}}>
          {Array.from({length: 17}).map((_, i) => (
            <line key={i} x1={150 + i * 100} y1={110} x2={150 + i * 100} y2={580} stroke="rgba(245,243,238,0.07)" strokeWidth={2} />
          ))}
          {Array.from({length: 5}).map((_, i) => (
            <line key={i} x1={150} y1={150 + i * 90} x2={1770} y2={150 + i * 90} stroke="rgba(245,243,238,0.07)" strokeWidth={2} />
          ))}
          <path d={path.join(' ')} fill="none" stroke={C.red} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={tipX} cy={Y} r={14} fill={C.red} opacity={blinkPulse} />
        </svg>
        <div style={{position: 'absolute', left: 36, top: 26, fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: 5, color: C.cream}}>STIMOLO NEL TEMPO</div>
        <div style={{position: 'absolute', right: 36, top: 26, fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 3, color: C.red, opacity: blinkPulse}}>● {dp >= 1 ? 'PIATTO' : 'LIVE'}</div>
      </div>
      <div style={{position: 'absolute', left: 150, top: 640, display: 'flex', alignItems: 'center', gap: 28, transform: `scale(${eq})`, transformOrigin: '0 50%', opacity: eq}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 120, color: C.red}}>=</span>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 120, letterSpacing: -3, color: C.cream}}>STESSO FISICO</span>
      </div>
      <Stamp text="0% PROGRESSI" t0={S4B.zero} x={1480} y={715} rot={-5} size={64} color={C.red} bg={C.ink} />
      <div style={{display: 'none'}}>{z}</div>
    </AbsoluteFill>
  );
};
