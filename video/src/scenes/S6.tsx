import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Barbell, Check, cardStyle} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT} from '../brand';
import {Riky} from '../Riky';

export const S6_T = [25.0, 26.4, 27.8, 29.2, 30.6];
export const S6_END = 32.0;

const Word: React.FC<{w: string; lt: number; color: string; accent?: string; idx: number; size?: number; x?: number; y?: number}> = ({w, lt, color, idx, size = 200, x = 110, y = 380, accent = C.blue}) => {
  const p = prog(lt, 0.0, 0.28, E.out);
  const sk = shake(lt, 0.22, 8, 0.25);
  return (
    <>
      <div style={{position: 'absolute', left: x, top: y - 120, transform: `translateX(${mix(-300, 0, p)}px)`, opacity: p, ...cardStyle(accent, 6), padding: '4px 22px', borderRadius: 16}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: accent === C.cream ? C.ink : '#fff', letterSpacing: 3}}>0{idx + 1} / 05</span>
      </div>
      <div style={{position: 'absolute', left: x + sk.x, top: y + sk.y, fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -size * 0.03, lineHeight: 1, color, transform: `translateX(${mix(-1200, 0, p)}px) skewX(${mix(-22, 0, p)}deg)`, transformOrigin: '0 50%', whiteSpace: 'nowrap'}}>
        {w}
      </div>
    </>
  );
};

const I1: React.FC<{lt: number}> = ({lt}) => {
  const n = lt < 0.3 ? 1 : lt < 0.7 ? 2 : 3;
  const d = (i: number) => (i === 1 ? mix(-520, 0, prog(lt, 0.3, 0.58, E.bounce)) : i === 2 ? mix(-520, 0, prog(lt, 0.7, 0.98, E.bounce)) : 0);
  const lbl = prog(lt, 1.0, 1.25, E.back);
  return (
    <FullSvg>
      <circle cx={1330} cy={520} r={290} fill={C.blueL} opacity={0.5} />
      <Barbell cx={1330} cy={520} half={300} plates={n} size={1.35} label="40" drop={d} />
      <g transform={`translate(1330,760) scale(${lbl})`}>
        <rect x={-150} y={-52} width={300} height={104} rx={24} fill={C.blue} stroke={C.ink} strokeWidth={OUT} />
        <text x={0} y={26} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={70} fill="#fff">+2,5 KG</text>
      </g>
    </FullSvg>
  );
};

const I2: React.FC<{lt: number}> = ({lt}) => {
  const k = Math.min(4, Math.max(0, Math.floor((lt - 0.25) / 0.2) + 1));
  const reps = lt < 0.25 ? 8 : 8 + k;
  const ring = Math.min(1, Math.max(0, (lt - 0.2) / 0.9));
  const R = 190;
  const pop = Math.max(0, 1 - ((lt - 0.25) % 0.2) / 0.2) * 0.08;
  return (
    <FullSvg>
      <g transform="translate(1470,520)">
        <circle r={R} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
        <circle r={R - 24} fill="none" stroke={C.grey} strokeWidth={26} />
        <circle r={R - 24} fill="none" stroke={C.blue} strokeWidth={26} strokeLinecap="round" strokeDasharray={2 * Math.PI * (R - 24)} strokeDashoffset={(1 - ring) * 2 * Math.PI * (R - 24)} transform="rotate(-90)" />
        <text y={52} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={170} fill={C.ink} transform={`scale(${1 + pop})`}>{reps}</text>
        <text y={118} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={32} letterSpacing={5} fill={C.blueD}>REP</text>
      </g>
      {[0, 1, 2, 3, 4].map((i) => (
        <Check key={i} x={1290 + i * 90} y={790} r={30} p={prog(lt, 0.25 + i * 0.2, 0.45 + i * 0.2, E.back)} />
      ))}
    </FullSvg>
  );
};

const I3: React.FC<{lt: number}> = ({lt}) => {
  const scan = (lt * 1.1) % 1;
  const labels = [
    {t: 0.4, w: 'SCHIENA NEUTRA'},
    {t: 0.7, w: 'RANGE COMPLETO'},
    {t: 1.0, w: 'CONTROLLO'},
  ];
  return (
    <>
      <FullSvg>
        <g transform="translate(1130,500)">
          <rect x={-190} y={-310} width={380} height={620} rx={26} fill={C.night2} stroke={C.cream} strokeWidth={OUT} />
          {[[-190, -310, 1, 1], [190, -310, -1, 1], [-190, 310, 1, -1], [190, 310, -1, -1]].map(([cx, cy, sx, sy], i) => (
            <path key={i} d={`M ${cx} ${cy + sy * 70} L ${cx} ${cy} L ${cx + sx * 70} ${cy}`} stroke={C.blueL} strokeWidth={10} fill="none" strokeLinecap="round" />
          ))}
          <Riky x={0} y={280} scale={0.46} smile={1} shadow={false}  />
          <line x1={-190} x2={190} y1={-310 + scan * 620} y2={-310 + scan * 620} stroke={C.blueL} strokeWidth={6} opacity={0.9} />
          <rect x={-190} y={-310 + scan * 620 - 40} width={380} height={40} fill="url(#scanG)" opacity={0.35} />
          <defs>
            <linearGradient id="scanG" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.blueL} stopOpacity={0} />
              <stop offset="1" stopColor={C.blueL} stopOpacity={1} />
            </linearGradient>
          </defs>
        </g>
      </FullSvg>
      {labels.map((l, i) => {
        const p = prog(lt, l.t, l.t + 0.25, E.back);
        return (
          <div key={i} style={{position: 'absolute', left: 1390, top: 300 + i * 150, transform: `translateX(${mix(500, 0, p)}px)`, opacity: p, ...cardStyle(C.cream, 8), padding: '10px 26px', display: 'flex', alignItems: 'center', gap: 16}}>
            <svg width={52} height={52}><Check x={26} y={26} r={22} /></svg>
            <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: C.ink, whiteSpace: 'nowrap'}}>{l.w}</span>
          </div>
        );
      })}
    </>
  );
};

const I4: React.FC<{lt: number}> = ({lt}) => {
  const hs = [120, 190, 250, 330, 420];
  const f = prog(lt, 0.9, 1.15, E.back);
  return (
    <FullSvg>
      <g transform="translate(1000,800)">
        <line x1={-30} x2={830} y1={0} y2={0} stroke={C.ink} strokeWidth={OUT} strokeLinecap="round" />
        {hs.map((h, i) => {
          const p = prog(lt, 0.2 + i * 0.16, 0.5 + i * 0.16, E.back);
          return <rect key={i} x={i * 160} y={-h * p} width={120} height={h * p} rx={12} fill={i === 4 ? C.blue : C.ink} stroke={C.ink} strokeWidth={OUT} />;
        })}
      </g>
      <g transform={`translate(1360,280) scale(${f})`}>
        <rect x={-300} y={-56} width={600} height={112} rx={26} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
        <text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={56} fill={C.ink}>SERIE × REP × KG</text>
      </g>
    </FullSvg>
  );
};

const I5: React.FC<{lt: number}> = ({lt}) => {
  const ring = prog(lt, 0.15, 1.2, E.inOut);
  const secs = Math.round(90 - 90 * ring);
  const R = 200;
  const z = (i: number) => {
    const p = ((lt * 1.2 + i * 0.33) % 1);
    return {x: 1620 + p * 80 + i * 30, y: 330 - p * 130, o: Math.sin(p * Math.PI)};
  };
  return (
    <FullSvg>
      <g transform="translate(1400,540)">
        <circle r={R} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
        <circle r={R - 26} fill="none" stroke={C.grey} strokeWidth={28} />
        <circle r={R - 26} fill="none" stroke={C.blue} strokeWidth={28} strokeLinecap="round" strokeDasharray={2 * Math.PI * (R - 26)} strokeDashoffset={ring * 2 * Math.PI * (R - 26)} transform="rotate(-90)" />
        <text y={36} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={140} fill={C.ink}>{secs}″</text>
        <text y={104} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} letterSpacing={5} fill={C.blueD}>RECUPERO</text>
      </g>
      {[0, 1, 2].map((i) => {
        const p = z(i);
        return (
          <text key={i} x={p.x} y={p.y} fontFamily={FONT} fontWeight={900} fontSize={70 + i * 20} fill={C.cream} stroke={C.ink} strokeWidth={8} paintOrder="stroke" opacity={p.o}>
            z
          </text>
        );
      })}
    </FullSvg>
  );
};

export const S6: React.FC = () => {
  const t = useT();
  const bgs: [string, string, string][] = [
    [C.cream, C.ink, C.blue],
    [C.night, C.cream, C.blue],
    [C.blue, C.cream, C.ink],
    [C.cream, C.ink, C.blue],
    [C.night, C.cream, C.blue],
  ];
  const items = [
    {w: 'CARICO', I: I1, size: 210},
    {w: 'RIPETIZIONI', I: I2, size: 142},
    {w: 'TECNICA', I: I3, size: 170},
    {w: 'VOLUME', I: I4, size: 200},
    {w: 'RECUPERO', I: I5, size: 190},
  ];
  let k = 0;
  S6_T.forEach((s, i) => {
    if (t >= s) k = i;
  });
  const lt = t - S6_T[k];
  const [bg, fg, ac] = bgs[k];
  const {w, I, size} = items[k];
  return (
    <AbsoluteFill>
      <Bg color={bg} dot={bg === C.cream ? 'rgba(17,17,17,0.10)' : 'rgba(255,255,255,0.08)'} drift={40} />
      <Word w={w} lt={lt} color={fg} accent={ac} idx={k} size={size} y={k === 1 ? 410 : 380} />
      <I lt={lt} />
    </AbsoluteFill>
  );
};
