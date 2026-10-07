import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Barbell, Check, Stamp, cardStyle} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT, useTalk} from '../brand';
import {Riky, armPoints} from '../Riky';

export const REP0 = 4.15; // inizio primo rep
export const REP_LEN = 1.2; // durata rep (picco a +0.6)
export const CARDS = [6.7, 7.4, 8.1];
export const STAMP_T = 8.55;

export const GymBg: React.FC<{clockSpin?: number}> = ({clockSpin = 0}) => {
  const t = useT();
  return (
    <>
      <Bg color={C.night} dot="rgba(255,255,255,0.045)" />
      <FullSvg>
        {Array.from({length: 6}).map((_, i) => (
          <rect key={i} x={50 + i * 322} y={-30} width={296} height={800} rx={14} fill={C.night2} stroke="#2A2F37" strokeWidth={4} />
        ))}
        <rect x={0} y={770} width={1920} height={320} fill="#0E1013" />
        <rect x={0} y={766} width={1920} height={8} fill="#2A2F37" />
        {Array.from({length: 9}).map((_, i) => (
          <line key={i} x1={960 + (i - 4) * 60} y1={774} x2={960 + (i - 4) * 340} y2={1080} stroke="#1A1E24" strokeWidth={4} />
        ))}
        {/* rack */}
        <g stroke="#2F353E" strokeWidth={14} strokeLinecap="round">
          <line x1={150} y1={250} x2={150} y2={780} />
          <line x1={330} y1={250} x2={330} y2={780} />
          <line x1={150} y1={420} x2={330} y2={420} />
        </g>
        <g fill="#2F353E">
          <circle cx={90} cy={620} r={58} />
          <circle cx={90} cy={620} r={20} fill={C.night2} />
          <circle cx={400} cy={680} r={74} />
          <circle cx={400} cy={680} r={24} fill={C.night2} />
        </g>
        {/* orologio */}
        <g transform="translate(1800,105) scale(0.78)">
          <circle r={84} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
          {Array.from({length: 12}).map((_, i) => (
            <line key={i} x1={0} y1={-68} x2={0} y2={-58} stroke={C.ink} strokeWidth={5} transform={`rotate(${i * 30})`} />
          ))}
          <line x1={0} y1={0} x2={0} y2={-50} stroke={C.ink} strokeWidth={7} strokeLinecap="round" transform={`rotate(${t * (30 + clockSpin * 600)})`} />
          <line x1={0} y1={0} x2={0} y2={-34} stroke={C.blue} strokeWidth={9} strokeLinecap="round" transform={`rotate(${t * (30 + clockSpin * 600) / 12})`} />
          <circle r={8} fill={C.ink} />
        </g>
      </FullSvg>
    </>
  );
};

const curl = (t: number) => {
  if (t < REP0) return 0;
  const u = ((t - REP0) % REP_LEN) / REP_LEN;
  const k = u < 0.5 ? E.inOut(u / 0.5) : 1 - E.inOut((u - 0.5) / 0.5);
  return k * 125;
};

export const S2a: React.FC = () => {
  const t = useT();
  const talk = useTalk();
  const f = curl(t);
  const reps = t < REP0 ? 0 : Math.floor((t - REP0) / REP_LEN + 0.5);
  const sa = {angles: [14, f] as [number, number]};
  const pl = armPoints('L', sa);
  const pr = armPoints('R', sa);
  const cy = (pl.hand[1] + pr.hand[1]) / 2;
  const pIn = prog(t, 4.2, 4.55, E.back);
  const lastPeak = t < REP0 + 0.6 ? -1 : REP0 + 0.6 + Math.floor((t - REP0 - 0.6) / REP_LEN + 0.0001) * REP_LEN;
  const pulse = lastPeak > 0 ? Math.max(0, 1 - (t - lastPeak) / 0.3) : 0;
  const sk = shake(t, lastPeak, 6, 0.25);
  const eff = Math.sin((f / 125) * Math.PI);
  return (
    <AbsoluteFill>
      <GymBg />
      <FullSvg>
        <Riky
          x={960 + sk.x}
          y={885 + sk.y}
          scale={0.72}
          armL={sa}
          armR={sa}
          mouth={talk}
          smile={0.2}
          brow={-4 + f / 40}
          browTilt={f > 20 ? 5 : 0}
          lid={0.1}
          look={0}
          tilt={0}
          bob={(f / 125) * 6}
          front={<Barbell cx={(pl.hand[0] + pr.hand[0]) / 2} cy={cy} half={(pr.hand[0] - pl.hand[0]) / 2 + 150} plates={3} size={1.1} label="40" />}
        />
      </FullSvg>
      {/* UI */}
      <div style={{position: 'absolute', left: 100, top: 90, transform: `translateX(${mix(-500, 0, pIn)}px)`, ...cardStyle(C.cream), padding: '16px 34px'}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: C.blueD}}>ESERCIZIO</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 52, color: C.ink}}>CURL CON BILANCIERE</div>
      </div>
      <div style={{position: 'absolute', left: 1360, top: 330, transform: `translateX(${mix(600, 0, pIn)}px) scale(${1 + pulse * 0.06})`, ...cardStyle(C.cream), padding: '14px 40px 20px', textAlign: 'center'}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.blueD}}>CARICO</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1, color: C.ink}}>
          40<span style={{fontSize: 70, marginLeft: 8}}>KG</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 1360, top: 590, transform: `translateX(${mix(600, 0, pIn)}px)`, ...cardStyle(C.blue), padding: '10px 36px 14px', textAlign: 'center'}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: '#fff'}}>RIPETIZIONI</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 92, lineHeight: 1, color: '#fff'}}>
          {reps}
          <span style={{fontSize: 48, opacity: 0.7}}>/10</span>
        </div>
      </div>
      <div style={{position: 'absolute', opacity: eff * 0}} />
    </AbsoluteFill>
  );
};

export const S2b: React.FC = () => {
  const t = useT();
  const talk = useTalk();
  const rows = [
    {t0: CARDS[0], w: 'SETT. 1'},
    {t0: CARDS[1], w: 'SETT. 4'},
    {t0: CARDS[2], w: 'SETT. 8'},
  ];
  const rIn = prog(t, 6.55, 6.95, E.back);
  const sigh = Math.sin(t * 2.4) * 0.5 + 0.5;
  return (
    <AbsoluteFill>
      <GymBg clockSpin={prog(t, 6.5, 8, E.in)} />
      <FullSvg>
        <Riky
          x={mix(-200, 480, rIn)}
          y={885}
          scale={0.7}
          smile={0}
          mouth={talk * 0.8}
          lid={0.5}
          brow={-6}
          browTilt={-4}
          look={12}
          tilt={-4 + sigh * 3}
          bob={sigh * 5}
          armL={{hand: [352, 792]}}
          armR={{hand: [468, 792]}}
          sy={1 + sigh * 0.006}
        />
      </FullSvg>
      {rows.map((r, i) => {
        const p = prog(t, r.t0, r.t0 + 0.3, E.back);
        const y = 200 + i * 200;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: 860,
                top: y,
                width: 880,
                height: 168,
                transform: `translateX(${mix(1100, 0, p)}px)`,
                ...cardStyle(C.cream),
                display: 'flex',
                alignItems: 'center',
                padding: '0 40px',
                gap: 28,
              }}
            >
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.blueD, width: 210}}>{r.w}</div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 96, color: C.ink, lineHeight: 1}}>
                40<span style={{fontSize: 52}}> KG</span> <span style={{color: C.blue}}>× 10</span>
              </div>
            </div>
            {i < 2 && p > 0.9 && (
              <div style={{position: 'absolute', left: 1280, top: y + 150, fontFamily: FONT, fontWeight: 900, fontSize: 70, color: C.cream, lineHeight: '70px', transform: `scale(${mix(0.4, 1, prog(t, r.t0 + 0.3, r.t0 + 0.5, E.back))})`}}>=</div>
            )}
          </React.Fragment>
        );
      })}
      <Stamp text="UGUALE." t0={STAMP_T} x={1300} y={470} rot={-7} size={120} color={C.red} bg={C.cream} />
    </AbsoluteFill>
  );
};
export {Check};
