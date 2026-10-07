import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Barbell} from '../ui';
import {C, E, FONT, OUT, mix, prog, rnd, shake, useT} from '../brand';
import {Riky} from '../Riky';

export const S7 = {line0: 32.25, nodes: [32.5, 34.0, 36.0, 37.5], cut: 35.5, stat: 37.9};
const NX = [300, 760, 1220, 1650];
const NY = [560, 490, 420, 350];
const LOAD = [
  {w: 'SETT. 1', kg: '40', rep: '× 8', plates: 1},
  {w: 'SETT. 4', kg: '45', rep: '× 8', plates: 2},
  {w: 'SETT. 8', kg: '50', rep: '× 10', plates: 3},
  {w: 'SETT. 12', kg: '55', rep: '× 10', plates: 4},
];

const progressPath = (t: number) => {
  let d = `M ${NX[0]} ${NY[0]}`;
  for (let i = 0; i < 3; i++) {
    if (t >= S7.nodes[i] + 0.1) {
      const p = prog(t, S7.nodes[i] + 0.1, S7.nodes[i + 1], E.inOut);
      d += ` L ${mix(NX[i], NX[i + 1], p)} ${mix(NY[i], NY[i + 1], p)}`;
    }
  }
  return d;
};

export const S7View: React.FC = () => {
  const t = useT();
  const beat2 = t >= S7.cut;
  const bg = beat2 ? C.blue : C.cream;
  const fg = beat2 ? C.cream : C.ink;
  // posizione testa linea
  let hx = NX[0];
  let hy = NY[0];
  for (let i = 0; i < 3; i++) {
    const a = S7.nodes[i] + 0.1;
    const b = S7.nodes[i + 1];
    const p = prog(t, a, b, E.inOut);
    if (t >= a) {
      hx = mix(NX[i], NX[i + 1], p);
      hy = mix(NY[i], NY[i + 1], p);
    }
  }
  const nodeP = S7.nodes.map((n) => prog(t, n, n + 0.3, E.back));
  const celebrate = t >= S7.nodes[3] + 0.1;
  const statP = prog(t, S7.stat, S7.stat + 0.3, E.back);
  const sk = shake(t, S7.nodes[3], 10, 0.35);
  const confT = t - S7.nodes[3];
  const flipRiky = false;
  return (
    <AbsoluteFill>
      <Bg color={bg} dot={beat2 ? 'rgba(255,255,255,0.16)' : 'rgba(17,17,17,0.10)'} />
      <FullSvg>
        <g transform={`translate(${sk.x},${sk.y})`}>
          {/* linea di base e progresso */}
          <polyline points={NX.map((x, i) => `${x},${NY[i]}`).join(' ')} fill="none" stroke={beat2 ? 'rgba(245,243,238,0.28)' : 'rgba(17,17,17,0.18)'} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 22" />
          <path d={progressPath(t)} fill="none" stroke={C.ink} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
          {NX.map((x, i) => (
            <g key={i} transform={`translate(${x},${NY[i]}) scale(${nodeP[i]})`}>
              <circle r={44} fill={C.blue === bg ? C.cream : C.blue} stroke={C.ink} strokeWidth={OUT} />
              <text y={18} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={50} fill={bg === C.blue ? C.ink : '#fff'}>{i === 0 ? 1 : i === 1 ? 4 : i === 2 ? 8 : 12}</text>
            </g>
          ))}
          {LOAD.map((l, i) => {
            const p = nodeP[i];
            if (p <= 0) return null;
            return (
              <g key={i} transform={`translate(${NX[i]},${NY[i] + 80}) scale(${p})`} opacity={Math.min(1, p * 2)}>
                <rect x={-190} y={0} width={380} height={236} rx={26} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
                <rect x={-184} y={-6} width={368} height={60} rx={0} fill="none" />
                <text x={0} y={56} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} letterSpacing={4} fill={C.blueD}>{l.w}</text>
                <g transform="translate(0,110) scale(0.5)"><Barbell cx={0} cy={0} half={170} plates={l.plates} size={0.9} /></g>
                <text x={0} y={206} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={68} fill={C.ink}>
                  {l.kg}<tspan fontSize={36}> KG </tspan><tspan fill={C.blue}>{l.rep}</tspan>
                </text>
              </g>
            );
          })}
          <Riky
            x={hx - 20}
            y={hy - 46}
            scale={0.24}
            shadow={false}
            smile={1}
            mouth={celebrate ? 0.7 : 0}
            hop={celebrate ? Math.abs(Math.sin(t * 9)) * 26 : Math.abs(Math.sin(t * 10)) * (t > S7.nodes[0] ? 6 : 0)}
            armL={celebrate ? {angles: [150, 10]} : {angles: [18, 20]}}
            armR={celebrate ? {angles: [150, 10]} : {angles: [18, 20]}}
            flip={flipRiky}
          />
        </g>
        {/* coriandoli */}
        {confT > 0 &&
          Array.from({length: 26}).map((_, i) => {
            const a = rnd(i) * Math.PI * 2;
            const sp = 300 + rnd(i + 40) * 500;
            const x = NX[3] + Math.cos(a) * sp * confT * 0.7;
            const y = NY[3] - 120 + Math.sin(a) * sp * confT * 0.7 + 600 * confT * confT;
            const col = [C.blue, C.ink, C.cream, C.blueL][i % 4];
            return <rect key={i} x={x} y={y} width={16} height={34} fill={col} stroke={C.ink} strokeWidth={3} opacity={Math.max(0, 1 - confT / 1.3)} transform={`rotate(${confT * 400 * (rnd(i + 9) - 0.5)} ${x} ${y})`} />;
          })}
      </FullSvg>
      {statP > 0 && (
        <div style={{position: 'absolute', left: 150, top: 150, transform: `scale(${statP}) rotate(-4deg)`, transformOrigin: '0 0', background: C.cream, border: `${OUT}px solid ${C.ink}`, borderRadius: 26, boxShadow: `10px 10px 0 ${C.ink}`, padding: '8px 34px 10px'}}>
          <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 104, color: C.blue}}>+37% </span>
          <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 54, color: C.ink}}>DI CARICO</span>
        </div>
      )}
      <div style={{display: 'none'}}>{fg}</div>
    </AbsoluteFill>
  );
};
