import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT, useTalk} from '../brand';
import {Riky} from '../Riky';

export const S8 = {cut: 43.1, riky: 43.18, logo: 43.24, handle: 43.4, cta: 43.62, pill: 40.9};

export const S8a: React.FC = () => {
  const t = useT();
  const p = prog(t, S8.pill, S8.pill + 0.35, E.back);
  return (
    <AbsoluteFill>
      <Bg color={C.ink} dot="rgba(255,255,255,0.07)" drift={18} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 90, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${mix(40, 0, p)}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, background: C.cream, borderRadius: 999, padding: '12px 36px 12px 18px', boxShadow: `8px 8px 0 ${C.blue}`}}>
          <svg width={56} height={56} viewBox="0 0 64 64">
            <rect x={4} y={4} width={56} height={56} rx={17} fill="none" stroke={C.ink} strokeWidth={5} />
            <circle cx={32} cy={32} r={13} fill="none" stroke={C.ink} strokeWidth={5} />
            <circle cx={47} cy={17} r={3.5} fill={C.ink} />
          </svg>
          <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 46, color: C.ink}}>@riccardofalconi_coach</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const S8b: React.FC = () => {
  const t = useT();
  const rp = prog(t, S8.riky, S8.riky + 0.5, E.back);
  const lp = prog(t, S8.logo, S8.logo + 0.35, E.back);
  const hp = prog(t, S8.handle, S8.handle + 0.3, E.back);
  const cp = prog(t, S8.cta, S8.cta + 0.3, E.back);
  const wave = Math.sin(t * 12) * 34;
  const talk = useTalk();
  const sk = shake(t, S8.logo, 8, 0.3);
  return (
    <AbsoluteFill>
      <Bg />
      <FullSvg>
        <circle cx={560} cy={560} r={380} fill={C.blue} transform={`scale(${rp})`} style={{transformOrigin: '560px 560px'}} />
        <Riky
          x={560}
          y={mix(1300, 990, rp)}
          scale={0.8}
          smile={1}
          mouth={talk}
          brow={6}
          armR={{hand: [640 + wave, 400]}}
          armL={{hand: [273, 822]}}
          tilt={Math.sin(t * 3) * 2}
          bob={Math.abs(Math.sin(t * 3)) * 4}
        />
      </FullSvg>
      <div style={{position: 'absolute', left: 1010 + sk.x, top: 190 + sk.y, transform: `translateX(${mix(400, 0, lp)}px)`, opacity: lp}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 200, lineHeight: 0.92, letterSpacing: -8, color: C.ink}}>COACH</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 200, lineHeight: 0.92, letterSpacing: -8, color: C.blue, WebkitTextStroke: `${OUT + 2}px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `10px 10px 0 ${C.ink}`}}>RIKY</div>
      </div>
      <div style={{position: 'absolute', left: 1010, top: 650, transform: `scale(${hp})`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 22, background: C.ink, borderRadius: 999, padding: '16px 40px 16px 20px', boxShadow: `8px 8px 0 ${C.blue}`}}>
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={4} width={56} height={56} rx={17} fill="none" stroke={C.cream} strokeWidth={5} />
          <circle cx={32} cy={32} r={13} fill="none" stroke={C.cream} strokeWidth={5} />
          <circle cx={47} cy={17} r={3.5} fill={C.cream} />
        </svg>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 52, color: C.cream, letterSpacing: -0.5}}>@riccardofalconi_coach</span>
      </div>
      <div style={{position: 'absolute', left: 1010, top: 800, transform: `scale(${cp})`, transformOrigin: '0 50%', fontFamily: FONT, fontWeight: 900, fontSize: 50, color: C.ink, letterSpacing: 1}}>
        SEGUIMI <span style={{color: C.blue}}>→</span> ALLENATI BENE.
      </div>
    </AbsoluteFill>
  );
};
