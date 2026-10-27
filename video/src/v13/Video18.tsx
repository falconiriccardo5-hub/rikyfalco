import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {cardStyle} from '../ui';
import {GirlSide} from './Girl';
import {FLOOR, World, repH, Tag, StepCard, Burst, Sparkles} from './kit';
import {Paper, RikyAt, BigSign, Mirror, LogTable, TrustChips, CtaScene, enter} from './common';
import {makeTiming, buildCaps, ReelShell, VT, SceneFC} from './reel';
import timing from '../voice18_timing.json';
import envR from '../voice18_env_r.json';

const ER = envR as number[];
const SL = ['d01', 'd02', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09', 'd10', 'd11', 'd12', 'd13', 'd14'];
const T = makeTiming(timing as VT[], SL);
export const DURATION18 = T.DURATION;
const {wd, W} = T;
const GX = 430;

const Clock: React.FC<{sec: number; size?: number; color?: string}> = ({sec, size = 300, color = C.blue}) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (
    <div style={{...cardStyle('#fff', 12), padding: '10px 36px', fontFamily: FONT, fontWeight: 900, fontSize: size * 0.5, color, letterSpacing: 2, fontVariantNumeric: 'tabular-nums'}}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
};

const D01: SceneFC = ({a, b}) => {
  const t = useT();
  const sec = Math.max(0, 40 * 60 - (t - a) * 420);
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.1, 1.18, prog(t, a, b, E.lin)), cx: 520, cy: 1060}}>
        <GirlSide x={GX} y={FLOOR} sq={repH(t, a, 1.6, 0.03, 0.85)} bar smile={0.4} sway={Math.sin(t * 4)} />
      </World>
      <div style={{position: 'absolute', right: 60, top: 480, transform: `rotate(4deg) scale(${enter(t, a + 0.2)})`}}>
        <Clock sec={sec} size={180} />
      </div>
    </AbsoluteFill>
  );
};

const D02: SceneFC = ({a}) => {
  const w = wd('d02');
  return (
    <Paper>
      <RikyAt env={ER} circle arm="wag" brow={10} />
      <Tag t0={w[6] - 0.05} at={[540, 360]} text="QUESTO ERRORE" icon="no" size={64} rot={-4} />
      <Tag t0={a + 0.1} at={[540, 220]} text="POSSONO BASTARE ✓" bg={C.blue} fg="#fff" size={52} rot={3} />
    </Paper>
  );
};

const D03: SceneFC = ({a, b}) => {
  const t = useT();
  const w = wd('d03');
  const k = Math.floor((t - a) / 0.9) % 3;
  const props = k === 0 ? {h: repH(t, a, 1.8)} : k === 1 ? {sq: repH(t, a, 1.8, 0.03, 0.8), bar: true} : {h: 0.3, backHand: 0.0};
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.12, 1.2, prog(t, a, b, E.lin)), cx: 520, cy: 1060}}>
        <GirlSide x={GX} y={FLOOR} smile={0} sway={Math.sin(t * 4)} {...props} />
      </World>
      <Burst t0={w[8] - 0.1} x={820} y={560} text="?" color={C.red} size={110} hold={3} />
      <Tag t0={w[10] - 0.1} at={[300, 520]} text="ESERCIZI A CASO" bg={C.red} fg="#fff" size={46} />
    </AbsoluteFill>
  );
};

const D04: SceneFC = ({a}) => <Mirror a={a} eqAt={wd('d04')[5]} labels={['MESE 1', 'MESE 4']} />;

const D05: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('d05');
  const x = prog(t, w[2], w[2] + 0.3);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, a)})`}}>
        <div style={{position: 'relative'}}>
          <Clock sec={40 * 60} size={260} color={C.ink} />
          <svg width={600} height={240} style={{position: 'absolute', left: -20, top: -20}}>
            <line x1={30} y1={210} x2={30 + 540 * x} y2={210 - 190 * x} stroke={C.red} strokeWidth={20} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <BigSign t0={w[5] - 0.1} top={900} bg={C.red}>NON È IL TEMPO</BigSign>
    </Paper>
  );
};

const D06: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('d06');
  return (
    <Paper>
      <StepCard n="?" title="Stai progredendo?" t0={a + 0.05} sub="senza un piano non lo sai" bad />
      <div style={{position: 'absolute', left: 50, right: 50, top: 520, display: 'flex', gap: 18, justifyContent: 'center'}}>
        {['SEDUTA 1', 'SEDUTA 2', 'SEDUTA 3'].map((s, i) => {
          const p = prog(t, a + 0.3 + i * 0.25, a + 0.6 + i * 0.25, E.back);
          return (
            <div key={i} style={{width: 290, ...cardStyle('#fff', 8), overflow: 'hidden', transform: `scale(${p})`, fontFamily: FONT, fontWeight: 900}}>
              <div style={{background: C.ink, color: '#fff', fontSize: 30, padding: '6px 14px'}}>{s}</div>
              {['Squat 3×10', 'Panca 3×10', 'Lat 3×10'].map((x, j) => (
                <div key={j} style={{fontSize: 30, padding: '10px 14px', color: C.ink, borderTop: j ? '3px dashed rgba(17,17,17,0.2)' : 'none'}}>{x}</div>
              ))}
            </div>
          );
        })}
      </div>
      <Tag t0={w[15] - 0.05} at={[540, 960]} text="SEMPRE LA STESSA SEDUTA" bg={C.red} fg="#fff" size={44} />
    </Paper>
  );
};

const D07: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('d07');
  const waste = prog(t, w[6] - 0.2, w[10], E.inOut);
  const ang = 360 * 0.3 * waste;
  const r = 230;
  const rad = ((ang - 90) * Math.PI) / 180;
  const large = ang > 180 ? 1 : 0;
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, a)})`}}>
        <svg width={560} height={560} viewBox="-280 -280 560 560">
          <circle r={r + 14} fill={C.ink} />
          <circle r={r} fill={C.blue} />
          {ang > 1 && <path d={`M 0 0 L 0 ${-r} A ${r} ${r} 0 ${large} 1 ${Math.cos(rad) * r} ${Math.sin(rad) * r} Z`} fill={C.red} />}
          <circle r={40} fill="#fff" stroke={C.ink} strokeWidth={8} />
          <text y={-r - 30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill={C.ink}>40 MIN</text>
        </svg>
      </div>
      <Tag t0={w[8] - 0.1} at={[700, 900]} text="12' PER DECIDERE COSA FARE" bg={C.red} fg="#fff" size={40} />
    </Paper>
  );
};

const D08: SceneFC = ({a}) => (
  <Paper>
    <RikyAt env={ER} circle arm="up" y={1560} />
    <BigSign t0={a + 0.05} top={240}>
      IL MIO <span style={{color: C.blue}}>PIANO</span>
    </BigSign>
  </Paper>
);

const D09: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('d09');
  const ex = ['Squat', 'Spinte con manubri', 'Rematore', 'Stacco rumeno', 'Plank'];
  return (
    <Paper>
      <StepCard n="1" title="5 esercizi fondamentali" t0={a + 0.05} sub="per allenare tutto il corpo" />
      <div style={{position: 'absolute', left: 70, right: 70, top: 440, display: 'flex', flexDirection: 'column', gap: 18}}>
        {ex.map((e, i) => {
          const p = prog(t, w[1] + i * 0.15, w[1] + i * 0.15 + 0.3, E.back);
          return (
            <div key={i} style={{transform: `translateX(${(1 - p) * -400}px)`, opacity: p, ...cardStyle('#fff', 8), padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink}}>
              <span style={{width: 56, height: 56, borderRadius: 28, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32}}>{i + 1}</span>
              {e}
            </div>
          );
        })}
      </div>
    </Paper>
  );
};

const D10: SceneFC = ({a, b}) => {
  const t = useT();
  const p = prog(t, a + 0.3, b - 0.2, E.lin);
  const r = 220;
  const L = 2 * Math.PI * r;
  return (
    <Paper>
      <StepCard n="2" title="Recuperi brevi" t0={a + 0.05} sub="60–90 secondi tra le serie" />
      <div style={{position: 'absolute', left: 0, right: 0, top: 480, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, a)})`}}>
        <svg width={560} height={560} viewBox="-280 -280 560 560">
          <circle r={r} fill="#fff" stroke={C.ink} strokeWidth={14} />
          <circle r={r - 30} fill="none" stroke={C.blue} strokeWidth={40} strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform="rotate(-90)" />
          <text y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={110} fill={C.ink}>{Math.round(p * 90)}"</text>
        </svg>
      </div>
    </Paper>
  );
};

const D11: SceneFC = ({a}) => {
  const w = wd('d11');
  return (
    <Paper>
      <StepCard n="3" title="Scrivi e migliora" t0={a + 0.05} sub="carichi e ripetizioni, ogni settimana" />
      <LogTable a={a} showAt={w[2]} beatAt={w[8]} />
    </Paper>
  );
};

const D12: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('d12');
  const p1 = prog(t, w[0] - 0.1, w[4], E.out);
  const p2 = prog(t, w[7] - 0.1, w[10], E.out);
  const Bar: React.FC<{label: string; n: number; p: number; good: boolean}> = ({label, n, p, good}) => (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
      <div style={{height: 600, width: 260, display: 'flex', alignItems: 'flex-end'}}>
        <div style={{width: '100%', height: `${(good ? 100 : 45) * p}%`, background: good ? C.blue : '#D9D6E2', border: `${OUT}px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`}} />
      </div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink, textAlign: 'center', lineHeight: 1.05, whiteSpace: 'pre-line'}}>{label}</div>
      <div style={{display: 'flex', gap: 8}}>
        {Array.from({length: n}).map((_, i) => (
          <span key={i} style={{width: 34, height: 34, borderRadius: 8, background: good ? C.blue : '#D9D6E2', border: `4px solid ${C.ink}`}} />
        ))}
      </div>
    </div>
  );
  return (
    <Paper>
      <div style={{position: 'absolute', left: 60, right: 60, top: 140, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, letterSpacing: -1}}>PROGRESSI</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', justifyContent: 'center', gap: 120}}>
        <Bar label={'2 SEDUTE\nCON UN PIANO'} n={2} p={p1} good />
        <Bar label={'4 SEDUTE\nA CASO'} n={4} p={p2} good={false} />
      </div>
      {t > w[4] && <Sparkles t0={w[4]} x={330} y={300} n={8} />}
    </Paper>
  );
};

const D13: SceneFC = ({a}) => {
  const w = wd('d13');
  return <TrustChips env={ER} a={a} title={['COSÌ LAVORO', 'CON I MIEI CLIENTI']} chips={[{txt: 'Brevi', at: w[11]}, {txt: 'Sostenibili', at: w[12]}, {txt: 'Misurabili', at: w[14]}]} />;
};

const D14: SceneFC = ({a}) => {
  const w = wd('d14');
  return <CtaScene env={ER} a={a} wordAt={w[9]} handleAt={w[12]} />;
};

const SCENES: Record<string, SceneFC> = {d01: D01, d02: D02, d03: D03, d04: D04, d05: D05, d06: D06, d07: D07, d08: D08, d09: D09, d10: D10, d11: D11, d12: D12, d13: D13, d14: D14};

const CAPS = buildCaps(
  T,
  [
    {slot: 'd01', hl: [2, 3, 4, 5], color: C.blue, size: 92, y: 120, until: 'd02'},
    {slot: 'd05', hl: [5, 6], color: C.red, size: 100, y: 150, until: 'd06'},
  ],
  {d02: [1, 7], d03: [8, 10], d04: [4, 7], d06: [4, 9, 15], d07: [6, 8], d08: [3], d09: [1, 3], d10: [2, 5, 10], d11: [1, 2, 8], d12: [0, 7, 10], d13: [11, 12, 14], d14: [10]},
  {d14: 'Se hai poco tempo e vuoi capire come organizzarti, scrivimi ANALISI in privato.'},
);

export const Video18: React.FC = () => <ReelShell T={T} SL={SL} scenes={SCENES} caps={CAPS} audio="soundtrack18.wav" />;
export {W};
