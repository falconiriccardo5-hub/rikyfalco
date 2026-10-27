import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {cardStyle} from '../ui';
import {GirlSide} from './Girl';
import {FLOOR, World, repH, Tag, StepCard, Burst, Sparkles} from './kit';
import {Paper, RikyAt, BigSign, RiseChart, TrustChips, CtaScene, enter} from './common';
import {makeTiming, buildCaps, ReelShell, VT, SceneFC} from './reel';
import timing from '../voice19_timing.json';
import envR from '../voice19_env_r.json';

const ER = envR as number[];
const SL = ['e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07', 'e08', 'e09', 'e10', 'e11', 'e12', 'e13', 'e14'];
const T = makeTiming(timing as VT[], SL);
export const DURATION19 = T.DURATION;
const {wd} = T;

const Label: React.FC<{x: number; y: number; text: string; bg: string; p?: number}> = ({x, y, text, bg, p = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p})`, ...cardStyle(bg, 8), padding: '8px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 40, color: bg === '#fff' ? C.ink : '#fff', whiteSpace: 'nowrap'}}>{text}</div>
);

/** due persone, stesso esercizio */
const Duo: React.FC<{a: number; b: number; good?: number; bad?: number; labels?: [string, string]; labelAt?: number; bigA?: number; children?: React.ReactNode}> = ({a, b, good = 0, bad = 0, labels = ['A', 'B'], labelAt, bigA = 0, children}) => {
  const t = useT();
  const sq = repH(t, a, 2.0, 0.03, 0.85);
  const lp = enter(t, labelAt ?? a);
  return (
    <AbsoluteFill>
      <World cam={{z: mix(0.98, 1.04, prog(t, a, b, E.lin)), cx: 540, cy: 1000}}>
        <GirlSide x={290} y={FLOOR} scale={0.72} sq={sq} bar plateColor={C.blue} plate={34} quads={good} glute={good * 0.6} lumbarOk={good * 0.6} smile={0.4 + good * 0.6} sway={Math.sin(t * 4)} />
        <GirlSide x={790} y={FLOOR} scale={0.72 + bigA * 0} sq={sq} bar heelUp={bad * 0.6} round={bad * 0.4 * sq} lumbar={bad * 0.5 * sq} plateColor={C.ink} smile={0.4 - bad * 0.7} hurt={bad * 0.4} sway={Math.sin(t * 4 + 1)} />
      </World>
      <Label x={290} y={560} text={labels[0]} bg={C.blue} p={lp} />
      <Label x={790} y={560} text={labels[1]} bg={C.ink} p={lp} />
      {children}
    </AbsoluteFill>
  );
};

const E01: SceneFC = ({a, b}) => <Duo a={a} b={b} />;

const E02: SceneFC = ({a, b}) => {
  const w = wd('e02');
  const t = useT();
  return (
    <Duo a={a} b={b} good={prog(t, w[1] - 0.1, w[1] + 0.3)} bad={prog(t, w[3] - 0.1, w[3] + 0.3)}>
      <Tag t0={w[1] - 0.05} at={[290, 440]} text="MIGLIORA ↑" bg={C.blue} fg="#fff" size={44} />
      <Tag t0={w[3] - 0.05} at={[790, 440]} text="FERMA =" bg={C.red} fg="#fff" size={44} />
      <Burst t0={w[4] - 0.05} x={540} y={300} text="PERCHÉ?" color={C.blue} size={76} hold={3} />
    </Duo>
  );
};

const E03: SceneFC = ({a, b}) => {
  const t = useT();
  const w = wd('e03');
  const items = ['STESSO SQUAT', 'STESSA PALESTRA', '3× A SETTIMANA'];
  const at = [w[0], w[2], w[4]];
  return (
    <Duo a={a} b={b}>
      <div style={{position: 'absolute', left: 60, right: 60, top: 160, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center'}}>
        {items.map((it, i) => (
          <div key={i} style={{transform: `scale(${prog(t, at[i] - 0.1, at[i] + 0.2, E.back)})`, ...cardStyle('#fff', 7), padding: '6px 26px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink}}>= {it}</div>
        ))}
      </div>
    </Duo>
  );
};

const E04: SceneFC = ({a, b}) => {
  const t = useT();
  const w = wd('e04');
  return (
    <Duo a={a} b={b} good={prog(t, w[5] - 0.1, w[9])} bad={prog(t, w[10], w[12])} labelAt={a - 5}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 180, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, a)}) rotate(-3deg)`}}>
        <div style={{...cardStyle('#fff', 10), overflow: 'hidden', fontFamily: FONT, fontWeight: 900, textAlign: 'center'}}>
          <div style={{background: C.ink, color: '#fff', fontSize: 32, padding: '4px 30px'}}>DOPO</div>
          <div style={{fontSize: 80, color: C.blue, padding: '0 30px'}}>3 MESI</div>
        </div>
      </div>
      <Tag t0={w[6] - 0.05} at={[290, 1210]} text="PIÙ FORTE E TONICA" bg={C.blue} fg="#fff" size={34} />
      <Tag t0={w[12] - 0.05} at={[790, 1210]} text="FERMA" bg={C.red} fg="#fff" size={40} />
    </Duo>
  );
};

const E05: SceneFC = ({a}) => {
  const w = wd('e05');
  return (
    <Paper>
      <RikyAt env={ER} circle arm="wag" brow={12} />
      <BigSign t0={w[2] - 0.1} top={260} size={80}>
        NON È<br />
        <span style={{color: C.blue}}>L'ESERCIZIO</span>
      </BigSign>
    </Paper>
  );
};

const E06: SceneFC = ({a, b}) => {
  const t = useT();
  const w = wd('e06');
  const chips = [
    {txt: 'ESECUZIONE', at: w[6]},
    {txt: 'CARICO', at: w[9]},
    {txt: 'PROGRESSIONE', at: w[12]},
  ];
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.15, 1.22, prog(t, a, b, E.lin)), cx: 470, cy: 1060}}>
        <GirlSide x={430} y={FLOOR} sq={repH(t, a, 2.0, 0.03, 0.85)} bar smile={0.4} sway={Math.sin(t * 4)} />
      </World>
      <div style={{position: 'absolute', left: 60, right: 60, top: 160, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end'}}>
        {chips.map((c, i) => (
          <div key={i} style={{transform: `scale(${prog(t, c.at - 0.1, c.at + 0.2, E.back)})`, transformOrigin: '100% 50%', ...cardStyle(C.blue, 8), padding: '10px 28px', fontFamily: FONT, fontWeight: 900, fontSize: 50, color: '#fff'}}>{c.txt}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const E07: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('e07');
  const s = prog(t, w[2] - 0.05, w[2] + 0.25, E.back);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 140, right: 140, top: 260, height: 820, transform: `scale(${enter(t, a)}) rotate(-3deg)`, ...cardStyle('#fff', 12), overflow: 'hidden'}}>
        <div style={{background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 44, padding: '14px 26px'}}>SCHEDA GENERICA</div>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{height: 22, borderRadius: 11, background: '#E6E1F5', margin: '34px 30px 0', width: `${55 + ((i * 7) % 4) * 10}%`}} />
        ))}
      </div>
      <div style={{position: 'absolute', left: 540, top: 700, transform: `translate(-50%,-50%) scale(${mix(2.2, 1, s)}) rotate(-12deg)`, opacity: s, border: `14px solid ${C.red}`, borderRadius: 26, padding: '12px 36px', background: 'rgba(255,255,255,0.95)', fontFamily: FONT, fontWeight: 900, fontSize: 84, color: C.red, whiteSpace: 'nowrap'}}>TAGLIA UNICA</div>
    </Paper>
  );
};

const E08: SceneFC = ({a}) => (
  <Paper>
    <RikyAt env={ER} circle arm="up" />
    <BigSign t0={a + 0.05} top={220} size={76}>
      PIANO<br />
      <span style={{color: C.blue}}>PERSONALIZZATO</span>
    </BigSign>
  </Paper>
);

const E09: SceneFC = ({a, b}) => {
  const t = useT();
  const w = wd('e09');
  const box = prog(t, w[3] - 0.1, w[3] + 0.3, E.back);
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.15, 1.22, prog(t, a, b, E.lin)), cx: 470, cy: 1060}}>
        <g transform={`translate(${430 - 230},${FLOOR}) scale(1,${box})`}>
          <rect x={0} y={-215} width={170} height={215} rx={12} fill="#C9A87C" stroke={C.ink} strokeWidth={OUT} />
          <rect x={0} y={-215} width={170} height={26} rx={10} fill={C.blue} stroke={C.ink} strokeWidth={OUT - 2} />
        </g>
        <GirlSide x={430} y={FLOOR} sq={repH(t, a, 2.2, 0.03, 0.72)} bar smile={0.8} quads={0.6} sway={Math.sin(t * 4)} />
      </World>
      <StepCard n="1" title="Esercizio adattato a te" t0={a + 0.05} sub="corpo, mobilità, limiti" />
      <Tag t0={w[9] - 0.05} at={[780, 640]} text="VARIANTE SU MISURA" bg={C.blue} fg="#fff" size={40} />
    </AbsoluteFill>
  );
};

const E10: SceneFC = ({a}) => {
  const t = useT();
  const w = wd('e10');
  return (
    <Paper>
      <StepCard n="2" title="Carichi dal tuo livello" t0={a + 0.05} sub="non da quello di qualcun altro" />
      <div style={{position: 'absolute', left: 0, right: 0, top: 480, display: 'flex', justifyContent: 'center', gap: 50}}>
        {[
          {who: 'TU', kg: '12 kg', col: C.blue, at: w[5]},
          {who: 'LEI', kg: '30 kg', col: '#D9D6E2', at: w[9]},
        ].map((c, i) => (
          <div key={i} style={{width: 400, transform: `scale(${prog(t, c.at - 0.1, c.at + 0.2, E.back)})`, ...cardStyle('#fff', 10), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900}}>
            <div style={{background: i ? C.ink : C.blue, color: '#fff', fontSize: 40, padding: '8px 0'}}>{c.who}</div>
            <div style={{fontSize: 120, color: i ? 'rgba(17,17,17,0.35)' : C.ink, padding: '20px 0'}}>{c.kg}</div>
            <div style={{fontSize: 34, color: i ? C.red : C.blue, paddingBottom: 18}}>{i ? '✕ non è il tuo' : '✓ il tuo punto di partenza'}</div>
          </div>
        ))}
      </div>
    </Paper>
  );
};

const E11: SceneFC = ({a}) => {
  const w = wd('e11');
  return (
    <Paper>
      <StepCard n="3" title="Progressione sui tuoi dati" t0={a + 0.05} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 120}}>
        <RiseChart a={a} until={w[9]} title="I TUOI DATI, SETTIMANA DOPO SETTIMANA" />
      </div>
    </Paper>
  );
};

const E12: SceneFC = ({a, b}) => {
  const w = wd('e12');
  const t = useT();
  return (
    <Duo a={a} b={b} good={1} labels={['PERSONALIZZATO', 'GENERICO']} labelAt={a}>
      <Tag t0={w[5]} at={[540, 220]} text="OGNI SERIE LAVORA PER TE" bg={C.blue} fg="#fff" size={44} />
      {t > w[9] && <Sparkles t0={w[9]} x={290} y={800} n={10} />}
    </Duo>
  );
};

const E13: SceneFC = ({a}) => {
  const w = wd('e13');
  return <TrustChips env={ER} a={a} title={['PARTO DA TE,', 'NON DA UNA SCHEDA PRONTA']} chips={[{txt: 'Analisi iniziale', at: w[3]}, {txt: 'Piano su misura', at: w[6]}, {txt: 'Controlli costanti', at: w[12]}]} />;
};

const E14: SceneFC = ({a}) => {
  const w = wd('e14');
  return <CtaScene env={ER} a={a} wordAt={w[7]} handleAt={w[10]} />;
};

const SCENES: Record<string, SceneFC> = {e01: E01, e02: E02, e03: E03, e04: E04, e05: E05, e06: E06, e07: E07, e08: E08, e09: E09, e10: E10, e11: E11, e12: E12, e13: E13, e14: E14};

const CAPS = buildCaps(
  T,
  [
    {slot: 'e01', hl: [0, 4, 5], color: C.blue, size: 92, y: 120, until: 'e02'},
    {slot: 'e02', hl: [1, 3, 4], color: C.red, size: 96, y: 120, until: 'e03'},
  ],
  {e03: [1, 3, 5], e04: [6, 9, 12], e05: [1, 4], e06: [8, 10, 13], e07: [2, 7], e08: [6], e09: [3, 6, 9, 13], e10: [6, 11], e11: [2, 6], e12: [6, 7, 9], e13: [6, 8, 12], e14: [8]},
  {e14: 'Vuoi sapere cosa cambierei nel tuo allenamento? Scrivimi ANALISI in privato.'},
);

export const Video19: React.FC = () => <ReelShell T={T} SL={SL} scenes={SCENES} caps={CAPS} audio="soundtrack19.wav" />;
