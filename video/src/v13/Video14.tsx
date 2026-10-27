import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {Show, Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky} from '../Riky';
import {GirlSide, GirlProps, girlGeom} from './Girl';
import {VW, VH, FLOOR, Cam, w2s, World, repH, StepCard, Tag, Burst, Sparkles, Headline, KeywordCTA, Handle} from './kit';
import timing from '../voice14_timing.json';
import envR from '../voice14_env_r.json';

export const FPS = 30;
type VT = {slot: string; text: string; t0: number; t1: number; words: number[]};
const VL = timing as VT[];
const v = (s: string) => {
  const x = VL.find((q) => q.slot === s);
  if (!x) throw new Error('slot voce mancante ' + s);
  return x;
};
const st = (s: string) => v(s).t0;
const en = (s: string) => v(s).t1;
const wd = (s: string) => v(s).words;
const ER = envR as number[];

const G = 0.22;
const SL = ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16'];
export const END = Math.min(64, en('q16') + 1.4);
export const DURATION14 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = Object.fromEntries(
  SL.map((s, i) => [s, [i === 0 ? 0 : st(s) - G, i === SL.length - 1 ? END : st(SL[i + 1]) - G]]),
) as Record<string, [number, number]>;

const GX = 450;
const GS = 1.0;
const gW = (lx: number, ly: number): [number, number] => [GX + lx * GS, FLOOR + ly * GS];
const camD = (a: number, b: number, t: number, z0 = 1.12, z1 = 1.22, cx = 520, cy = 1020): Cam => ({z: mix(z0, z1, prog(t, a, b, E.lin)), cx, cy});

/** freccia spessa con contorno, coordinate del mondo */
const Arrow: React.FC<{a: [number, number]; b: [number, number]; color: string; p?: number; w?: number}> = ({a, b, color, p = 1, w = 26}) => {
  if (p <= 0) return null;
  const e: [number, number] = [mix(a[0], b[0], p), mix(a[1], b[1], p)];
  const ang = Math.atan2(e[1] - a[1], e[0] - a[0]);
  const hl = w * 1.6;
  const back: [number, number] = [e[0] - Math.cos(ang) * hl, e[1] - Math.sin(ang) * hl];
  const l: [number, number] = [back[0] + Math.cos(ang + Math.PI / 2) * w * 1.2, back[1] + Math.sin(ang + Math.PI / 2) * w * 1.2];
  const r: [number, number] = [back[0] - Math.cos(ang + Math.PI / 2) * w * 1.2, back[1] - Math.sin(ang + Math.PI / 2) * w * 1.2];
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <line x1={a[0]} y1={a[1]} x2={back[0]} y2={back[1]} stroke={C.ink} strokeWidth={w + 10} />
      <polygon points={`${e[0]},${e[1]} ${l[0]},${l[1]} ${r[0]},${r[1]}`} fill={C.ink} stroke={C.ink} strokeWidth={10} />
      <line x1={a[0]} y1={a[1]} x2={back[0]} y2={back[1]} stroke={color} strokeWidth={w} />
      <polygon points={`${e[0]},${e[1]} ${l[0]},${l[1]} ${r[0]},${r[1]}`} fill={color} />
    </g>
  );
};

const Girl: React.FC<Partial<GirlProps>> = (p) => <GirlSide x={GX} y={FLOOR} scale={GS} bar plateColor={C.blue} {...p} />;

/* ------------------------------------------------------------------ scene */
// 1 · HOOK: squat, poi fitta alla schiena
const S01: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q01');
  const ouch = prog(t, w[4] - 0.1, w[4] + 0.3);
  const sq = repH(t, a + 0.05, 2.0, 0.03, 0.95) * (1 - prog(t, w[5], w[7], E.inOut)) ;
  const pulse = 0.6 + 0.4 * Math.sin(t * 10);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.15, 1.3, 470, 1030)}>
        <Girl sq={sq} round={0.4 * ouch} heelUp={0.3} lumbar={ouch * pulse} hurt={ouch} mouth={ouch * 0.3} smile={0.3 - ouch} sway={Math.sin(t * 4)} />
      </World>
      <Burst t0={w[4]} x={250} y={820} text="AHI!" size={74} />
    </AbsoluteFill>
  );
};

// 2 · "Il problema non è lo squat"
const RikySolo: React.FC<{a: number; b: number; mood: 'wag' | 'shrug'; children?: React.ReactNode}> = ({a, b, mood, children}) => {
  const t = useT();
  const talk = useTalk(ER);
  const pin = prog(t, a, a + 0.35, E.back);
  const wag = Math.sin(t * 12) * 34;
  return (
    <AbsoluteFill>
      <World cam={{z: 1, cx: 540, cy: 960}} mat={false}>
        <circle cx={540} cy={1010} r={330 * pin} fill={C.blue} />
        <Riky
          x={540}
          y={mix(1600, 1420, pin)}
          scale={0.95}
          mouth={talk}
          smile={mood === 'wag' ? 0.5 : -0.2}
          brow={mood === 'wag' ? 10 : 14}
          browTilt={mood === 'shrug' ? -5 : 0}
          tilt={mood === 'shrug' ? Math.sin(t * 6) * 5 : Math.sin(t * 3) * 2}
          armR={mood === 'wag' ? {hand: [610 + wag, 300]} : {hand: [660, 690]}}
          armL={mood === 'shrug' ? {hand: [160, 690]} : undefined}
        />
      </World>
      {children}
    </AbsoluteFill>
  );
};

// 3 · il giorno dopo
const S03: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q03');
  const day = prog(t, w[9] - 0.1, w[9] + 0.35, E.back);
  const back = prog(t, w[9], w[9] + 0.4);
  const sq = repH(t, a, 2.0, 0.03, 0.9) * (1 - prog(t, w[7] - 0.4, w[8], E.inOut));
  const pulse = 0.6 + 0.4 * Math.sin(t * 9);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.15, 1.25, 500, 1030)}>
        <Girl sq={sq} bar={back < 0.5} backHand={back} noDb hurt={0.4 + back * 0.6} mouth={0} smile={-0.3} lumbar={prog(t, w[4], w[6]) * pulse} />
      </World>
      {/* calendario */}
      <div style={{position: 'absolute', right: 70, top: 190, transform: `scale(${day}) rotate(4deg)`, transformOrigin: '50% 0'}}>
        <div style={{width: 300, ...cardStyle('#fff', 10), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900}}>
          <div style={{background: C.red, color: '#fff', fontSize: 34, padding: '8px 0', borderBottom: `${OUT}px solid ${C.ink}`}}>IL GIORNO DOPO</div>
          <div style={{fontSize: 150, color: C.ink, lineHeight: 1.1}}>😣</div>
        </div>
      </div>
      <Tag t0={w[12]} at={[300, 560]} text="LOMBARE RIGIDA" bg={C.red} fg="#fff" size={44} />
    </AbsoluteFill>
  );
};

// 4 · riduci il peso o smetti
const S04: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q04');
  const shrink = prog(t, w[1], w[3] + 0.2, E.inOut);
  const sq = repH(t, a, 2.2, 0.03, 0.85);
  const stop = prog(t, w[5], w[5] + 0.3, E.back);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.15, 1.22, 500, 1030)}>
        <Girl sq={sq * (1 - stop)} smile={-0.2} hurt={0.4} />
        <g transform={`translate(${gW(-40, -300)[0]},${gW(-40, -300)[1]}) scale(${1 - shrink * 0.45})`} />
      </World>
      <Tag t0={w[1]} at={[300, 560]} text="− PESO" bg="#fff" size={52} rot={-4} />
      {stop > 0 && (
        <div style={{position: 'absolute', left: 540, top: 1000, transform: `translate(-50%,-50%) scale(${stop}) rotate(-10deg)`, ...cardStyle(C.red, 10), padding: '10px 34px', fontFamily: FONT, fontWeight: 900, fontSize: 88, color: '#fff', whiteSpace: 'nowrap'}}>
          ✕ NIENTE SQUAT
        </div>
      )}
    </AbsoluteFill>
  );
};

// 6 · tre errori spostano il carico dalle gambe alla schiena
const S06: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q06');
  const g = girlGeom(0, 0.6, 0, 0, 0.85, 0.6, true);
  const legs = prog(t, w[11] - 0.1, w[13], E.out);
  const back = prog(t, w[13], w[15] + 0.2, E.out);
  const knee = gW(g.knee[0], g.knee[1]);
  const hip = gW(g.hip[0], g.hip[1]);
  const lum = gW(g.hip[0] - 40, g.hip[1] - 110);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.2, 1.28, 470, 1080)}>
        <Girl sq={0.85} heelUp={0.6} round={0.6} lumbar={back * (0.6 + 0.4 * Math.sin(t * 9))} smile={-0.3} hurt={back} />
        <g opacity={1 - back * 0.6}>
          <Arrow a={[knee[0] + 120, knee[1] - 60]} b={[knee[0] + 20, knee[1] - 10]} color={C.blue} p={legs} />
        </g>
        <Arrow a={[hip[0] - 230, lum[1] - 120]} b={[lum[0] - 50, lum[1] - 10]} color={C.red} p={back} />
      </World>
      <StepCard n="3" title="errori di tecnica" t0={w[6] - 0.1} bad sub="spostano il carico sulla schiena" />
      <Tag t0={w[13] - 0.1} at={[820, 1250]} text="GAMBE" bg={C.blue} fg="#fff" size={42} />
      <Tag t0={w[15] - 0.05} at={[200, 640]} text="SCHIENA" bg={C.red} fg="#fff" size={42} />
    </AbsoluteFill>
  );
};

// 7 · più peso, più carico
const S07: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q07');
  const step = prog(t, w[2] - 0.1, w[4], E.inOut) + prog(t, w[6], w[8], E.inOut);
  const kg = Math.round(40 + step * 30);
  const sq = repH(t, a, 1.8, 0.05, 0.85);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.1, 1.18, 500, 1060)}>
        <Girl sq={sq} heelUp={0.4} round={0.3 * step} plateColor={step > 1.2 ? C.red : C.blue} lumbar={step / 2} smile={-0.3} hurt={step / 2} />
      </World>
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, ...cardStyle('#fff', 10), padding: '22px 30px', fontFamily: FONT}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontWeight: 900, fontSize: 40, color: C.ink}}>BILANCIERE</span>
          <span style={{fontWeight: 900, fontSize: 92, color: C.ink, letterSpacing: -2}}>{kg} KG</span>
        </div>
        <div style={{fontWeight: 900, fontSize: 34, color: C.red, marginTop: 8}}>CARICO SULLA SCHIENA</div>
        <div style={{height: 44, borderRadius: 22, border: `${OUT}px solid ${C.ink}`, marginTop: 8, overflow: 'hidden', background: '#F1EEF8'}}>
          <div style={{width: `${20 + step * 40}%`, height: '100%', background: C.red}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 8 · filmati di lato: 3 controlli
const S08: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q08');
  const ph = prog(t, w[3] - 0.15, w[3] + 0.25, E.back);
  const sq = repH(t, a + 0.2, 2.2, 0.03, 0.85);
  const items = ['Piedi', 'Bacino', 'Tronco'];
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.12, 1.2, 500, 1020)}>
        <Girl sq={sq} smile={0.5} />
      </World>
      {/* inquadratura del telefono */}
      <div style={{position: 'absolute', left: 120, top: 560, width: 840, height: 920, border: `14px solid ${C.ink}`, borderRadius: 60, transform: `scale(${mix(1.25, 1, ph)})`, opacity: ph, boxShadow: '0 0 0 2000px rgba(17,17,17,0.25)'}}>
        <div style={{position: 'absolute', left: 30, top: 24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff', background: C.ink, borderRadius: 999, padding: '6px 18px'}}>
          <span style={{width: 22, height: 22, borderRadius: 11, background: C.red, opacity: Math.sin(t * 8) > 0 ? 1 : 0.3}} />
          REC · DI LATO
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, display: 'flex', gap: 18, justifyContent: 'center'}}>
        {items.map((it, i) => {
          const p = prog(t, w[8] + i * 0.18, w[8] + i * 0.18 + 0.3, E.back);
          return (
            <div key={i} style={{transform: `scale(${p})`, ...cardStyle('#fff', 8), padding: '10px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, display: 'flex', alignItems: 'center', gap: 12}}>
              <span style={{width: 40, height: 40, borderRadius: 10, border: `${OUT - 1}px solid ${C.ink}`, display: 'inline-block'}} />
              {it}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 9-10 · talloni
const S09: React.FC<{a: number; b: number; fix?: boolean}> = ({a, b, fix}) => {
  const t = useT();
  const slot = fix ? 'q10' : 'q09';
  const w = wd(slot);
  const sq = repH(t, a + 0.1, 2.3, 0.05, 0.9);
  const up = fix ? 0 : Math.min(1, sq * 1.4);
  const heel = gW(-40, -10);
  const toe = gW(92, -10);
  const g = girlGeom(0, 0, 0, 0, sq, up, true);
  const shoulder = gW(g.sp[0], g.sp[1]);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.3, 1.42, 470, 1110)}>
        <Girl sq={sq} heelUp={up} smile={fix ? 0.8 : -0.2} hurt={fix ? 0 : up * 0.6} lumbar={fix ? 0 : up * 0.7} quads={fix ? sq : 0} />
        {!fix && <Arrow a={[shoulder[0] - 40, shoulder[1] - 40]} b={[shoulder[0] + 110, shoulder[1] + 40]} color={C.red} p={prog(t, w[12] - 0.1, w[13] + 0.2)} w={20} />}
        {fix && (
          <g>
            <rect x={heel[0] - 30} y={heel[1] + 8} width={toe[0] - heel[0] + 60} height={18} rx={9} fill={C.blue} stroke={C.ink} strokeWidth={4} opacity={prog(t, w[1], w[3])} />
          </g>
        )}
      </World>
      {fix ? (
        <>
          <StepCard n="1" title="Tutto il piede a terra" t0={a - 5} sub="talloni giù, peso su tutto il piede" />
          <Tag t0={w[3] - 0.05} at={[540, 1240]} text="PIEDE APPOGGIATO" icon="ok" size={44} />
        </>
      ) : (
        <>
          <StepCard n="1" title="Talloni che si alzano" t0={a + 0.05} bad />
          <Tag t0={w[2]} at={[w2s(heel, camD(a, b, t, 1.3, 1.42, 470, 1110))[0] - 60, 1180]} to={w2s(heel, camD(a, b, t, 1.3, 1.42, 470, 1110))} text="TALLONI SU" icon="no" size={44} />
          <Tag t0={w[12]} at={[760, 520]} text="BUSTO IN AVANTI" bg={C.red} fg="#fff" size={40} />
        </>
      )}
    </AbsoluteFill>
  );
};

// 11-12 · bacino che si arrotonda
const S11: React.FC<{a: number; b: number; fix?: boolean}> = ({a, b, fix}) => {
  const t = useT();
  const w = wd(fix ? 'q12' : 'q11');
  const sq = repH(t, a + 0.05, 2.4, 0.05, fix ? 0.72 : 1.0);
  const wink = fix ? 0 : Math.max(0, (sq - 0.75) / 0.25);
  const g = girlGeom(0, 0, 0, 0, 0.72, 0, true);
  const hipLine = gW(g.hip[0], g.hip[1]);
  const cam = camD(a, b, t, 1.25, 1.35, 440, 1100);
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <Girl sq={sq} round={wink} lumbar={wink * 0.9} lumbarOk={fix ? 0.7 : 0} smile={fix ? 0.7 : -0.2} hurt={wink * 0.7} />
        {fix && (
          <g opacity={prog(t, w[2] - 0.1, w[2] + 0.3)}>
            <line x1={hipLine[0] - 220} y1={hipLine[1]} x2={hipLine[0] + 380} y2={hipLine[1]} stroke={C.blue} strokeWidth={8} strokeDasharray="22 14" />
          </g>
        )}
      </World>
      {fix ? (
        <>
          <StepCard n="2" title="Scendi finché la schiena è neutra" t0={a - 5} />
          <Tag t0={w[2]} at={[w2s([hipLine[0] + 300, hipLine[1]], cam)[0], w2s(hipLine, cam)[1] - 70]} text="FIN QUI" bg={C.blue} fg="#fff" size={46} />
          <Tag t0={w[5]} at={[300, 600]} text="SCHIENA NEUTRA" icon="ok" size={42} />
        </>
      ) : (
        <>
          <StepCard n="2" title="Il bacino si arrotonda" t0={a + 0.05} bad sub="in fondo al movimento" />
          <Tag t0={w[6]} at={[260, 620]} text="LOMBARE IN TENSIONE" bg={C.red} fg="#fff" size={38} />
        </>
      )}
    </AbsoluteFill>
  );
};

// 13 · blocca il tronco
const S13: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q13');
  const air = prog(t, w[5] - 0.1, w[6] + 0.2, E.out);
  const brace = prog(t, w[7] - 0.1, w[8] + 0.1, E.out);
  const down = t > w[9] ? repH(t, w[9] - 0.2, 2.4, 0.03, 0.85) : 0.03;
  const g = girlGeom(0, 0, 0, 0, down, 0, true);
  const head = gW(g.head[0], g.head[1]);
  const cam = camD(a, b, t, 1.25, 1.32, 470, 1020);
  const hs = w2s(head, cam);
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <Girl sq={down} brace={brace} smile={0.5} mouth={air > 0 && air < 1 ? 0.4 : 0} />
        {air > 0 && (
          <g transform={`translate(${head[0] + 120},${head[1] - 40}) scale(${air})`}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${-60 + i * 12} ${-30 + i * 30} C -20 ${-50 + i * 30} 20 ${-10 + i * 30} 60 ${-30 + i * 30}`} stroke={C.blueL} strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.9} />
            ))}
          </g>
        )}
      </World>
      <StepCard n="3" title="Blocca il tronco" t0={a + 0.05} sub="aria → addome stretto → scendi" />
      <Tag t0={w[5]} at={[hs[0] + 230, hs[1] - 120]} text="1. ARIA" size={44} />
      <Tag t0={w[7]} at={[260, 1220]} text="2. ADDOME STRETTO" bg={C.blue} fg="#fff" size={40} />
      <Tag t0={w[10] - 0.05} at={[820, 1240]} text="3. SCENDI" size={44} />
    </AbsoluteFill>
  );
};

// 14 · risultato
const S14: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q14');
  const sq = repH(t, a + 0.05, 2.2, 0.03, 0.82);
  const legs = prog(t, w[1] - 0.1, w[3]);
  const safe = prog(t, w[6] - 0.1, w[8]);
  return (
    <AbsoluteFill>
      <World cam={camD(a, b, t, 1.15, 1.25, 480, 1040)}>
        <Girl sq={sq} quads={legs * (0.7 + 0.3 * Math.sin(t * 6))} glute={legs * 0.8} lumbarOk={safe * 0.8} brace={0.5} smile={1} />
      </World>
      <Tag t0={w[3] - 0.1} at={[800, 1200]} text="GAMBE AL LAVORO" bg={C.blue} fg="#fff" size={42} />
      <Tag t0={w[8] - 0.15} at={[300, 560]} text="SCHIENA PROTETTA" icon="ok" size={42} />
      <Sparkles t0={w[8]} x={540} y={800} n={12} />
    </AbsoluteFill>
  );
};

// 15 · fiducia: il mio metodo
const S15: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('q15');
  const talk = useTalk(ER);
  const pin = prog(t, a, a + 0.35, E.back);
  const rows: {ic: string; txt: string; at: number}[] = [
    {ic: '▶', txt: 'Guardo il tuo video', at: w[8]},
    {ic: '◎', txt: 'Un dettaglio alla volta', at: w[11]},
    {ic: '↗', txt: 'Misuriamo i progressi', at: w[17]},
  ];
  return (
    <AbsoluteFill>
      <World cam={{z: 1, cx: 540, cy: 960}} mat={false}>
        <circle cx={300} cy={1250} r={260 * pin} fill={C.blue} />
        <Riky x={300} y={mix(1800, 1640, pin)} scale={0.78} flip={false} mouth={talk} smile={0.9} brow={6} armR={{hand: [700, 560 + Math.sin(t * 4) * 20]}} />
      </World>
      <div style={{position: 'absolute', left: 60, right: 60, top: 130, display: 'flex', flexDirection: 'column', gap: 12, transform: `scale(${pin})`}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, letterSpacing: -1}}>COSÌ LAVORO</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.blue, letterSpacing: -1, marginTop: -12}}>CON I MIEI CLIENTI</div>
      </div>
      <div style={{position: 'absolute', left: 420, right: 50, top: 420, display: 'flex', flexDirection: 'column', gap: 26}}>
        {rows.map((r, i) => {
          const p = prog(t, r.at - 0.1, r.at + 0.25, E.back);
          return (
            <div key={i} style={{transform: `translateX(${(1 - p) * 300}px)`, opacity: p, ...cardStyle('#fff', 8), padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: C.ink}}>
              <span style={{width: 66, height: 66, borderRadius: 18, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, border: `${OUT - 1}px solid ${C.ink}`, flexShrink: 0}}>{r.ic}</span>
              {r.txt}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 16 · CTA
const S16: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = wd('q16');
  const talk = useTalk(ER);
  const pin = prog(t, a, a + 0.4, E.back);
  const wave = Math.sin(t * 10) * 26;
  return (
    <AbsoluteFill>
      <World cam={{z: 1, cx: 540, cy: 960}} mat={false}>
        <circle cx={540} cy={1330} r={330 * pin} fill={C.blue} />
        <Riky x={540} y={mix(1900, 1720, pin)} scale={0.86} mouth={talk} smile={1} brow={8} armR={{hand: [650 + wave, 380]}} tilt={Math.sin(t * 3) * 2} />
      </World>
      <KeywordCTA t0={w[6] - 0.1} word="ANALISI" />
      <Handle t0={w[9]} top={720} />
      <Sparkles t0={w[7]} x={540} y={400} n={14} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const big: CapLine[] = [];
  const q1 = v('q01');
  const q2 = v('q02');
  const q5 = v('q05');
  big.push({t0: q1.words[0] - 0.05, t1: W.q02[0] - 0.02, text: q1.text, big: true, size: 98, y: 140, hl: [4, 7], color: C.red, times: q1.words, slam: 4});
  big.push({t0: q2.words[0] - 0.05, t1: W.q03[0] - 0.02, text: q2.text, big: true, size: 104, y: 140, hl: [2, 3, 5], color: C.blue, times: q2.words, slam: 2});
  big.push({t0: q5.words[0] - 0.05, t1: W.q06[0] - 0.02, text: q5.text, big: true, size: 104, y: 140, hl: [1, 3], color: C.red, times: q5.words, slam: 3});
  const meta: Record<string, number[]> = {
    q03: [4, 13, 15],
    q04: [1, 5],
    q06: [6, 7, 13, 15],
    q07: [2, 7],
    q08: [3, 5, 8],
    q09: [2, 4, 13],
    q10: [1, 3],
    q11: [6, 8],
    q12: [5, 7],
    q13: [2, 5, 7, 10],
    q14: [3, 8],
    q15: [8, 11, 17],
    q16: [7],
  };
  const DISPLAY: Record<string, string> = {q16: 'Vuoi che guardi il tuo squat? Scrivimi ANALISI in DM.'};
  const small = Object.entries(meta)
    .map(([slot, hl]) => {
      const x = v(slot);
      return {t0: x.words[0] - 0.15, t1: x.t1 + 0.35, text: DISPLAY[slot] ?? x.text, hl, times: x.words, bottom: 330, wrapAt: 20, fs: 54, bg: '#fff'} as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, END - 0.05);
  });
  return [...big, ...small];
};
const CAPS = buildCaps();

const TT: Tr['type'][] = ['wipeR', 'iris', 'wipeL', 'stripes', 'wipeU', 'wipeR', 'iris', 'stripes', 'wipeL', 'wipeU', 'wipeR', 'iris', 'wipeU', 'stripes', 'iris'];
const TC = [C.blue, C.ink, C.red, C.ink, C.red, C.blue, C.ink, C.red, C.blue, C.red, C.blue, C.ink, C.blue, C.ink, C.blue];
export const TRANS: Tr[] = SL.slice(1).map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}));

export const Video14: React.FC = () => (
  <AbsoluteFill style={{background: '#fff', fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <Show from={W.q01[0]} to={W.q01[1]} punch={0}><S01 a={W.q01[0]} b={W.q01[1]} /></Show>
    <Show from={W.q02[0]} to={W.q02[1]}><RikySolo a={W.q02[0]} b={W.q02[1]} mood="wag" /></Show>
    <Show from={W.q03[0]} to={W.q03[1]}><S03 a={W.q03[0]} b={W.q03[1]} /></Show>
    <Show from={W.q04[0]} to={W.q04[1]}><S04 a={W.q04[0]} b={W.q04[1]} /></Show>
    <Show from={W.q05[0]} to={W.q05[1]}><RikySolo a={W.q05[0]} b={W.q05[1]} mood="shrug" /></Show>
    <Show from={W.q06[0]} to={W.q06[1]}><S06 a={W.q06[0]} b={W.q06[1]} /></Show>
    <Show from={W.q07[0]} to={W.q07[1]}><S07 a={W.q07[0]} b={W.q07[1]} /></Show>
    <Show from={W.q08[0]} to={W.q08[1]}><S08 a={W.q08[0]} b={W.q08[1]} /></Show>
    <Show from={W.q09[0]} to={W.q09[1]}><S09 a={W.q09[0]} b={W.q09[1]} /></Show>
    <Show from={W.q10[0]} to={W.q10[1]}><S09 a={W.q10[0]} b={W.q10[1]} fix /></Show>
    <Show from={W.q11[0]} to={W.q11[1]}><S11 a={W.q11[0]} b={W.q11[1]} /></Show>
    <Show from={W.q12[0]} to={W.q12[1]}><S11 a={W.q12[0]} b={W.q12[1]} fix /></Show>
    <Show from={W.q13[0]} to={W.q13[1]}><S13 a={W.q13[0]} b={W.q13[1]} /></Show>
    <Show from={W.q14[0]} to={W.q14[1]}><S14 a={W.q14[0]} b={W.q14[1]} /></Show>
    <Show from={W.q15[0]} to={W.q15[1]}><S15 a={W.q15[0]} b={W.q15[1]} /></Show>
    <Show from={W.q16[0]} to={W.q16[1] + 1}><S16 a={W.q16[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack14.wav')} />
  </AbsoluteFill>
);
export {VW, VH};
