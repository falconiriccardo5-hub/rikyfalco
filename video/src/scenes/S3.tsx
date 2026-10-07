import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Stamp, cardStyle} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT} from '../brand';
import {Riky} from '../Riky';

const MONTHS = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];
export const REEL_T0 = 9.15;
export const REEL_T1 = 11.5;
export const REEL_END = 17; // indice (GIUGNO del secondo giro)
/** easeInOutCubic (replicata in audio/make_audio.py) */
export const eio3 = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const S3B = {l: 11.65, r: 12.05, eq: 12.55, stamp: 13.1};

export const S3a: React.FC = () => {
  const t = useT();
  const p = Math.min(1, Math.max(0, (t - REEL_T0) / (REEL_T1 - REEL_T0)));
  const s = REEL_END * eio3(p);
  const speed = (REEL_END * 3 * Math.min(p, 1 - p) ** 2 * 4) / (REEL_T1 - REEL_T0); // ~ derivativa
  const blur = Math.min(9, Math.abs(speed) * 0.9);
  const ITEM = 150;
  const wk = Math.round(26 * eio3(p));
  const pIn = prog(t, 9.05, 9.4, E.back);
  const landed = t >= REEL_T1;
  const sk = shake(t, REEL_T1, 9, 0.3);
  return (
    <AbsoluteFill>
      <Bg color={C.blue} dot="rgba(255,255,255,0.14)" drift={30} />
      <div style={{position: 'absolute', left: 140, top: 310, width: 400, transform: `translateY(${mix(-600, 0, pIn)}px)`, ...cardStyle(C.ink), textAlign: 'center', padding: '18px 10px 24px', boxShadow: `10px 10px 0 ${C.cream}`, border: `${OUT}px solid ${C.cream}`}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: 5, color: C.blueL}}>CARICO</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 130, lineHeight: 1.05, color: C.cream}}>40</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 58, color: C.cream}}>KG</div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: 5, color: C.blueL, marginTop: 6}}>SEMPRE UGUALE</div>
      </div>
      {/* slot reel */}
      <div style={{position: 'absolute', left: 590, top: 250, width: 740, height: 450, transform: `translate(${sk.x}px,${mix(-700, 0, pIn) + sk.y}px)`, ...cardStyle(C.cream), overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 150, height: 150, background: 'rgba(79,122,179,0.20)', borderTop: `${OUT}px solid ${C.ink}`, borderBottom: `${OUT}px solid ${C.ink}`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 150 - s * ITEM, filter: `blur(${blur}px)`}}>
          {Array.from({length: 19}).map((_, i) => (
            <div key={i} style={{height: ITEM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 92, color: i === REEL_END && landed ? C.blueD : C.ink, transform: `translateY(${(i === REEL_END ? 0 : 0)}px)`}}>
              {MONTHS[i % 12]}
            </div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 130, background: 'linear-gradient(rgba(245,243,238,1), rgba(245,243,238,0))'}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, background: 'linear-gradient(rgba(245,243,238,0), rgba(245,243,238,1))'}} />
      </div>
      <div style={{position: 'absolute', left: 1380, top: 310, width: 400, transform: `translateY(${mix(-600, 0, pIn)}px)`, ...cardStyle(C.cream), textAlign: 'center', padding: '18px 10px 24px'}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: 5, color: C.blueD}}>SETTIMANA</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 190, lineHeight: 1, color: C.ink}}>{wk}</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.blueD}}>{landed ? 'FATTO.' : 'IN CORSO…'}</div>
      </div>
      {landed && (
        <div style={{position: 'absolute', left: 590, top: 740, width: 740, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 54, color: C.cream, opacity: prog(t, REEL_T1 + 0.1, REEL_T1 + 0.3)}}>
          6 MESI DOPO…
        </div>
      )}
    </AbsoluteFill>
  );
};

export const S3b: React.FC = () => {
  const t = useT();
  const pl = prog(t, S3B.l, S3B.l + 0.35, E.back);
  const pr = prog(t, S3B.r, S3B.r + 0.35, E.back);
  const eq = prog(t, S3B.eq, S3B.eq + 0.25, E.back);
  const blink = (t % 2.1) > 2.0 ? 1 : 0;
  const sigh = Math.sin(t * 2.2) * 0.5 + 0.5;
  const pose = {
    smile: 0,
    lid: Math.max(0.22, blink),
    brow: -5,
    browTilt: -3,
    look: 0,
    tilt: sigh * 2,
    bob: sigh * 4,
    sy: 1 + sigh * 0.005,
  };
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{position: 'absolute', left: 280, top: 70, transform: `translateY(${mix(-200, 0, pl)}px) scale(${pl})`, ...cardStyle(C.cream), padding: '8px 40px'}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink}}>GENNAIO</span>
      </div>
      <div style={{position: 'absolute', left: 1130, top: 70, transform: `translateY(${mix(-200, 0, pr)}px) scale(${pr})`, ...cardStyle(C.blue), padding: '8px 40px'}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 60, color: '#fff'}}>GIUGNO</span>
      </div>
      <FullSvg>
        <circle cx={500} cy={560} r={290} fill={C.grey} transform={`scale(${pl})`} style={{transformOrigin: '500px 560px'}} />
        <circle cx={1420} cy={560} r={290} fill={C.blueL} transform={`scale(${pr})`} style={{transformOrigin: '1420px 560px'}} />
        <Riky x={500} y={mix(1300, 885, pl)} scale={0.56} {...pose} />
        <Riky x={1420} y={mix(1300, 885, pr)} scale={0.56} {...pose} tilt={-pose.tilt} />
        <g transform={`translate(960,560) scale(${eq})`}>
          <circle r={96} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
          <rect x={-52} y={-34} width={104} height={20} rx={8} fill={C.ink} />
          <rect x={-52} y={14} width={104} height={20} rx={8} fill={C.ink} />
        </g>
      </FullSvg>
      <Stamp text="IDENTICO." t0={S3B.stamp} x={960} y={300} rot={-6} size={118} color={C.red} bg={C.cream} />
    </AbsoluteFill>
  );
};
