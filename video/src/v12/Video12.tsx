import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, shake, rnd, useT, useTalk} from '../brand';
import {Bg, FullSvg, Show, Grain, Dumbbell, Check, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky} from '../Riky';
import {GymRoom, Bench} from './Gym';
import {RikyLying, TopView, dumbbellLocal} from './Lying';
import timing from '../voice12_timing.json';
import env12 from '../voice12_env.json';

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
const ENV = env12 as number[];

/** Finestre delle scene: ogni cambio cade ~0.25 s prima della frase che lo introduce. */
const G = 0.25;
export const END = Math.min(39.9, Math.max(en('b14') + 0.7, 36));
export const DURATION12 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = {
  s1: [0, st('b03') - G],
  s2: [st('b03') - G, st('b04') - G],
  s3a: [st('b04') - G, st('b06') - G],
  s3b: [st('b06') - G, st('b07') - G],
  s4a: [st('b07') - G, st('b08') - G],
  s4b: [st('b08') - G, st('b09') - G],
  s5a: [st('b09') - G, st('b10') - G],
  s5b: [st('b10') - G, st('b11') - G],
  s6: [st('b11') - G, st('b13') - G],
  s7: [st('b13') - G, END],
};

/* ------------------------------------------------------------------ elementi comuni */
const Callout: React.FC<{t0: number; x: number; y: number; to: [number, number]; text: string; color?: string; fg?: string; w?: number; size?: number}> = ({
  t0,
  x,
  y,
  to,
  text,
  color = C.cream,
  fg = C.ink,
  w = 420,
  size = 40,
}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.3, E.back);
  if (t < t0) return null;
  const cx = x + w / 2;
  const cy = y + 40;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
        <line x1={cx} y1={cy} x2={mix(cx, to[0], p)} y2={mix(cy, to[1], p)} stroke={C.ink} strokeWidth={OUT} strokeLinecap="round" />
        <circle cx={mix(cx, to[0], p)} cy={mix(cy, to[1], p)} r={14 * p} fill={color === C.cream ? C.blue : color} stroke={C.ink} strokeWidth={OUT - 2} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          transform: `scale(${p})`,
          transformOrigin: '50% 50%',
          ...cardStyle(color, 8),
          padding: '8px 22px 10px',
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          color: fg,
          lineHeight: 1.1,
        }}
      >
        {text}
      </div>
    </>
  );
};

const ErrBadge: React.FC<{t0: number; n: number; good?: boolean}> = ({t0, n, good}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.3, E.back);
  const col = good ? C.blue : C.red;
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        top: 70,
        transform: `rotate(-4deg) scale(${p})`,
        transformOrigin: '0 50%',
        background: col,
        border: `${OUT}px solid ${C.ink}`,
        borderRadius: 22,
        boxShadow: `8px 8px 0 ${C.ink}`,
        padding: '4px 30px 8px',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 64,
        color: '#fff',
        letterSpacing: 1,
      }}
    >
      {good ? `CORREZIONE ${n}` : `ERRORE ${n}`}
    </div>
  );
};

const BigText: React.FC<{lines: string[]; t0: number; color?: string; size?: number; y?: number; x?: number}> = ({lines, t0, color = C.ink, size = 118, y = 200, x = 90}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: x, top: y, fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.0, letterSpacing: -size * 0.03, color}}>
      {lines.map((l, i) => {
        const p = prog(t, t0 + i * 0.14, t0 + i * 0.14 + 0.3, E.back);
        return (
          <div key={i} style={{transform: `translateX(${mix(-900, 0, p)}px) skewX(${mix(-18, 0, p)}deg)`, transformOrigin: '0 50%', opacity: Math.min(1, p * 3)}}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Ouch: React.FC<{x: number; y: number; t0: number; text?: string}> = ({x, y, t0, text = 'AHI!'}) => {
  const t = useT();
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.25, E.back);
  const sk = shake(t, t0, 8, 0.4);
  return (
    <g transform={`translate(${x + sk.x},${y + sk.y}) rotate(-8) scale(${p})`}>
      <polygon
        points={Array.from({length: 16}).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const r = i % 2 ? 62 : 96;
          return `${Math.cos(a) * r},${Math.sin(a) * r}`;
        }).join(' ')}
        fill={C.red}
        stroke={C.ink}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <text y={20} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={54} fill="#fff" stroke={C.ink} strokeWidth={8} paintOrder="stroke">{text}</text>
    </g>
  );
};

// posizione schermo dell'origine locale del figura sdraiata
const LX = 690;
const LY = 540;
const LS = 1.2;
const toScreen = (p: [number, number]): [number, number] => [LX + p[0] * LS, LY + p[1] * LS];

const press = (t: number, t0: number, period = 3.4) => 0.5 + 0.5 * Math.cos(((t - t0) / period) * Math.PI * 2);

/* ------------------------------------------------------------------ scene */
const S1: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const pIn = prog(t, a, a + 0.5, E.out);
  const b2 = st('b02');
  const hurt = prog(t, b2 + 0.9, b2 + 1.2, E.back);
  const badge = prog(t, b2, b2 + 0.3, E.back);
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  const blink = t % 2.8 > 2.7 ? 1 : 0;
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <g transform="translate(560,690) scale(0.7)">
          <Bench />
        </g>
        <Riky
          x={1130}
          y={mix(1300, 880, pIn)}
          scale={0.56}
          mouth={talk}
          smile={mix(1, -0.5, hurt)}
          brow={hurt * 10}
          browTilt={-hurt * 8}
          lid={blink}
          armL={{hand: [273, 822]}}
          armR={hurt > 0.1 ? {hand: [mix(547, 380, hurt), mix(822, 640, hurt)]} : {hand: [547, 822]}}
          tilt={hurt * 5}
          front={
            <g>
              <Dumbbell x={266} y={846} s={0.8} rot={90} />
              <Dumbbell x={mix(554, 372, hurt)} y={mix(846, 676, hurt)} s={0.8} rot={mix(90, -30, hurt)} color={C.ink} />
            </g>
          }
        />
        {hurt > 0.2 && (
          <g transform="translate(1088,480)" opacity={0.5 + 0.4 * pulse}>
            <circle r={44 + pulse * 8} fill={C.red} opacity={0.35} />
          </g>
        )}
        <g transform={`translate(1480,640) scale(${badge}) rotate(-6)`}>
          <circle r={96} fill={C.red} stroke={C.ink} strokeWidth={OUT} />
          <text y={32} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={120} fill="#fff" stroke={C.ink} strokeWidth={9} paintOrder="stroke">3</text>
          <text y={-62} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={26} fill="#fff" letterSpacing={3}>ERRORI</text>
        </g>
      </FullSvg>
    </AbsoluteFill>
  );
};

const LyingScene: React.FC<{a: number; h: number; arch: number; hurt?: number; shk?: number; mouth: number; glow?: boolean; lid?: number; smile?: number; brow?: number; browTilt?: number; showHurt?: boolean}> = ({
  h,
  arch,
  hurt = 0,
  shk = 0,
  mouth,
  glow,
  lid = 0,
  smile = 0.6,
  brow = 0,
  browTilt = 0,
}) => <RikyLying x={LX} y={LY} scale={LS} h={h} arch={arch} hurt={hurt} shake={shk} mouth={mouth} glow={glow ? C.blue : undefined} lid={lid} smile={smile} brow={brow} browTilt={browTilt} dumbbell={C.blue} label="12" />;

const S2: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const w = v('b03').words;
  const h = t < a + 0.6 ? mix(1, 1, 0) : press(t, a + 0.6, 3.6);
  const pIn = prog(t, a, a + 0.4, E.out);
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <g opacity={pIn}>
          <LyingScene a={a} h={h} arch={0.5} mouth={talk * 0.7} glow />
        </g>
      </FullSvg>
      <Callout t0={w[3]} x={1010} y={110} to={toScreen(dumbbellLocal(h))} text="MANUBRI SOPRA IL PETTO" w={470} />
      <Callout t0={w[7]} x={1010} y={300} to={toScreen([10, -40])} text="SPALLE INDIETRO E IN BASSO" w={520} color={C.blue} fg="#fff" />
    </AbsoluteFill>
  );
};

const S3a: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w5 = st('b05');
  const wob = Math.sin(t * 3.2) * 2;
  const pCard = prog(t, a + 0.15, a + 0.5, E.back);
  const warn = prog(t, w5, w5 + 0.3, E.back);
  const pulse = 0.5 + 0.5 * Math.sin(t * 10);
  return (
    <AbsoluteFill>
      <Bg />
      <ErrBadge t0={a + 0.1} n={1} />
      <BigText lines={['GOMITI', 'TROPPO', 'APERTI']} t0={a + 0.25} color={C.ink} size={150} y={190} />
      <div style={{position: 'absolute', left: 1010, top: 150, transform: `scale(${pCard}) rotate(${wob * 0.2}deg)`, ...cardStyle('#fff', 10), borderColor: C.red, boxShadow: `10px 10px 0 ${C.ink}`, overflow: 'hidden'}}>
        <TopView theta={90 + wob} good={false} />
      </div>
      <div style={{position: 'absolute', left: 1010, top: 700, transform: `scale(${warn})`, transformOrigin: '0 50%', display: 'flex', gap: 16, alignItems: 'center'}}>
        <div style={{...cardStyle(C.red, 8), padding: '4px 26px 8px', fontFamily: FONT, fontWeight: 900, fontSize: 70, color: '#fff'}}>90°</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, lineHeight: 1.05, opacity: 0.6 + 0.4 * pulse}}>= SPALLE<br />IN TENSIONE</div>
      </div>
    </AbsoluteFill>
  );
};

const S3b: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const th = mix(90, 52, prog(t, a + 0.2, a + 0.9, E.inOut));
  const pCard = prog(t, a + 0.05, a + 0.4, E.back);
  const chk = prog(t, a + 0.9, a + 1.2, E.back);
  return (
    <AbsoluteFill>
      <Bg color={C.blue} dot="rgba(255,255,255,0.16)" />
      <ErrBadge t0={a + 0.1} n={1} good />
      <BigText lines={['45–60°', 'DAL BUSTO']} t0={a + 0.25} color={C.cream} size={150} y={230} />
      <div style={{position: 'absolute', left: 1010, top: 150, transform: `scale(${pCard})`, ...cardStyle('#fff', 10), borderColor: C.ink, overflow: 'hidden'}}>
        <TopView theta={th} good />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <Check x={1700} y={170} r={62} p={chk} color={C.blue} />
      </svg>
      <div style={{position: 'absolute', left: 1010, top: 700, transform: `scale(${chk})`, transformOrigin: '0 50%', fontFamily: FONT, fontWeight: 900, fontSize: 50, color: C.cream}}>
        GOMITI VICINI AL BUSTO
      </div>
    </AbsoluteFill>
  );
};

const S4a: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const h = 0.45 + 0.4 * Math.cos((t - a) * 2.4);
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <LyingScene a={a} h={h} arch={0} hurt={0.5 + 0.5 * pulse} mouth={talk * 0.7} brow={6} browTilt={-5} smile={-0.4} />
        <Ouch x={toScreen([10, -40])[0] - 60} y={toScreen([10, -40])[1] - 170} t0={a + 1.0} text="AHI!" />
      </FullSvg>
      <ErrBadge t0={a + 0.1} n={2} />
      <Callout t0={a + 0.55} x={1010} y={330} to={toScreen([210, 60])} text="SCHIENA PIATTA" w={470} color={C.red} fg="#fff" />
    </AbsoluteFill>
  );
};

const S4b: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const w = v('b08').words;
  const arch = prog(t, w[4] - 0.1, w[4] + 0.6, E.inOut) * 0.9 + 0.1 * prog(t, a, a + 0.5);
  const h = 0.5 + 0.5 * Math.cos((t - a) * 2.2);
  const arrow = prog(t, w[1], w[1] + 0.4, E.back);
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <LyingScene a={a} h={h} arch={arch} mouth={talk * 0.7} glow />
        {/* frecce scapole: indietro e in basso */}
        <g transform={`translate(${toScreen([10, -40])[0] - 130},${toScreen([10, -40])[1] - 40}) scale(${arrow})`} stroke={C.blue} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 70 -30 L -10 -30 M 20 -60 L -10 -30 L 20 0" />
          <path d="M 70 40 L 70 120 M 40 90 L 70 120 L 100 90" />
        </g>
      </FullSvg>
      <ErrBadge t0={a + 0.1} n={2} good />
      <Callout t0={w[1]} x={1010} y={150} to={toScreen([10, -40])} text="SCAPOLE INDIETRO E IN BASSO" w={560} color={C.blue} fg="#fff" size={38} />
      <Callout t0={w[6]} x={1010} y={330} to={toScreen([200, 40])} text="LEGGERO ARCO" w={420} />
    </AbsoluteFill>
  );
};

const S5a: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const P = 1.7;
  const u = (((t - a) % P) + P) % P;
  // sale piano (0..0.9), cade di botto (0.9..1.05), resta giù, poi risale
  const h = u < 0.9 ? mix(0, 1, E.inOut(u / 0.9)) : u < 1.05 ? mix(1, 0, (u - 0.9) / 0.15) : 0;
  const hit = u >= 1.05 && u < 1.5 ? 1 : 0;
  const cycle = Math.floor((t - a) / P);
  const tHit = a + cycle * P + 1.05;
  const sk = shake(t, tHit, 14, 0.4);
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <LyingScene a={a} h={h} arch={0.4} hurt={hit} shk={sk.x} mouth={talk * 0.7} brow={hit * 8} browTilt={-hit * 6} smile={mix(0.5, -0.6, hit)} lid={hit * 0.4} />
        {t >= tHit && t < tHit + 0.7 && <Ouch x={toScreen([10, -40])[0] + 30} y={toScreen([10, -40])[1] - 160} t0={tHit} text="BOOM!" />}
      </FullSvg>
      <ErrBadge t0={a + 0.1} n={3} />
      <Callout t0={a + 0.6} x={1010} y={150} to={toScreen(dumbbellLocal(h))} text="PESO CHE CADE" w={440} color={C.red} fg="#fff" />
    </AbsoluteFill>
  );
};

const S5b: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const d0 = st('b10') + 0.1; // la discesa parte con "scendi" e dura fino a "spingi"
  const pushT = v('b10').words[5] - 0.05;
  const down = prog(t, d0, pushT, (x) => x);
  const up = prog(t, pushT, pushT + 0.4, E.out);
  const h = t < d0 ? 1 : t < pushT ? mix(1, 0, down) : mix(0, 1, up);
  const num = t < d0 ? 3 : Math.max(1, 3 - Math.floor(down * 3 - 0.0001));
  const ring = t < d0 ? 0 : down;
  const push = prog(t, pushT, pushT + 0.2, E.back);
  return (
    <AbsoluteFill>
      <GymRoom />
      <FullSvg>
        <LyingScene a={a} h={h} arch={0.9} mouth={talk * 0.7} glow />
        <g transform="translate(1470,300)">
          <circle r={150} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
          <circle r={120} fill="none" stroke={C.grey} strokeWidth={26} />
          <circle r={120} fill="none" stroke={C.blue} strokeWidth={26} strokeLinecap="round" strokeDasharray={2 * Math.PI * 120} strokeDashoffset={(1 - ring) * 2 * Math.PI * 120} transform="rotate(-90)" />
          <text y={50} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={150} fill={C.ink}>{push > 0.5 ? '↑' : num}</text>
        </g>
      </FullSvg>
      <ErrBadge t0={a + 0.1} n={3} good />
      <div style={{position: 'absolute', left: 1010, top: 200, transform: `scale(${push})`, ...cardStyle(C.blue, 8), padding: '4px 30px 8px', fontFamily: FONT, fontWeight: 900, fontSize: 70, color: '#fff'}}>SPINGI!</div>
    </AbsoluteFill>
  );
};

const S6: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const w = v('b11').words;
  const thanks = prog(t, st('b12'), st('b12') + 0.3, E.back);
  const h = 0.5 + 0.5 * Math.cos((t - a) * 2.1);
  const items = [
    {t0: w[0], text: 'GOMITI 45–60°'},
    {t0: w[4], text: 'SCAPOLE FERME'},
    {t0: w[6], text: 'DISCESA IN 3″'},
  ];
  return (
    <AbsoluteFill>
      <Bg color={C.blue} dot="rgba(255,255,255,0.16)" />
      <FullSvg>
        <rect x={0} y={858} width={1920} height={222} fill="rgba(17,17,17,0.22)" />
        <rect x={0} y={852} width={1920} height={8} fill={C.ink} />
        <g transform="translate(0,0)">
          <RikyLying x={LX - 40} y={LY + 40} scale={1.1} h={h} arch={0.9} mouth={talk * 0.7 + thanks * 0.2} glow={C.cream} dumbbell={C.ink} smile={mix(0.6, 1, thanks)} label="12" />
        </g>
        {thanks > 0 &&
          [0, 1, 2, 3, 4].map((i) => {
            const a2 = (i / 5) * Math.PI * 2 + t * 1.5;
            return <text key={i} x={LX + 20 + Math.cos(a2) * 80} y={LY - 60 + Math.sin(a2) * 60} fontFamily={FONT} fontWeight={900} fontSize={46} fill={C.cream} opacity={thanks}>✦</text>;
          })}
      </FullSvg>
      {items.map((it, i) => {
        const p = prog(t, it.t0, it.t0 + 0.3, E.back);
        return (
          <div key={i} style={{position: 'absolute', left: 1230, top: 130 + i * 150, transform: `translateX(${mix(500, 0, p)}px)`, opacity: p, ...cardStyle(C.cream, 8), padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 18}}>
            <svg width={60} height={60}><Check x={30} y={30} r={26} /></svg>
            <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 48, color: C.ink, whiteSpace: 'nowrap'}}>{it.text}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const S7: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const talk = useTalk(ENV);
  const w13 = v('b13').words;
  const w14 = st('b14');
  const rp = prog(t, a, a + 0.45, E.back);
  const save = prog(t, w13[0], w13[0] + 0.3, E.back);
  const send = prog(t, w13[3], w13[3] + 0.3, E.back);
  const logo = prog(t, w14 - 0.1, w14 + 0.3, E.back);
  const wave = Math.sin(t * 12) * 34;
  return (
    <AbsoluteFill>
      <Bg />
      <FullSvg>
        <circle cx={520} cy={470} r={300} fill={C.blue} transform={`scale(${rp})`} style={{transformOrigin: '520px 470px'}} />
        <Riky x={520} y={mix(1300, 790, rp)} scale={0.62} smile={1} mouth={talk} brow={6} armR={{hand: [640 + wave, 400]}} armL={{hand: [273, 822]}} tilt={Math.sin(t * 3) * 2} bob={Math.abs(Math.sin(t * 3)) * 4} />
      </FullSvg>
      <div style={{position: 'absolute', left: 1010, top: 140, transform: `scale(${save})`, transformOrigin: '0 50%', ...cardStyle(C.cream, 8), padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 20}}>
        <svg width={64} height={64} viewBox="0 0 64 64"><path d="M 16 6 H 48 V 58 L 32 44 L 16 58 Z" fill={C.blue} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" /></svg>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 54, color: C.ink}}>SALVA IL VIDEO</span>
      </div>
      <div style={{position: 'absolute', left: 1010, top: 290, transform: `scale(${send})`, transformOrigin: '0 50%', ...cardStyle(C.cream, 8), padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 20}}>
        <svg width={64} height={64} viewBox="0 0 64 64"><path d="M 6 30 L 58 8 L 44 56 L 30 38 Z" fill={C.blue} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" /></svg>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, lineHeight: 1.05}}>MANDALO AL TUO<br />COMPAGNO DI ALLENAMENTO</span>
      </div>
      <div style={{position: 'absolute', left: 1010, top: 470, transform: `scale(${logo})`, transformOrigin: '0 50%'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 124, lineHeight: 0.92, letterSpacing: -5, color: C.ink}}>COACH</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 124, lineHeight: 0.92, letterSpacing: -5, color: C.blue, WebkitTextStroke: `${OUT}px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `8px 8px 0 ${C.ink}`}}>RIKY</div>
        <div style={{marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 18, background: C.ink, borderRadius: 999, padding: '12px 32px 12px 16px', boxShadow: `8px 8px 0 ${C.blue}`}}>
          <svg width={50} height={50} viewBox="0 0 64 64">
            <rect x={4} y={4} width={56} height={56} rx={17} fill="none" stroke={C.cream} strokeWidth={5} />
            <circle cx={32} cy={32} r={13} fill="none" stroke={C.cream} strokeWidth={5} />
            <circle cx={47} cy={17} r={3.5} fill={C.cream} />
          </svg>
          <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 44, color: C.cream}}>@riccardofalconi_coach</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const lines: CapLine[] = [];
  const b1 = v('b01');
  const b2 = v('b02');
  lines.push({t0: b1.words[0] - 0.05, t1: b2.words[0] - 0.05, text: 'Spinte con i manubri.', big: true, size: 112, y: 36, hl: [3], color: C.blue, times: b1.words});
  lines.push({t0: b2.words[0] - 0.05, t1: W.s2[0] - 0.02, text: 'Questi 3 errori ti rovinano le spalle.', big: true, size: 66, y: 160, hl: [1, 5, 6], color: C.red, times: b2.words.length === 7 ? b2.words : undefined, slam: 1});
  const SMALL: {slot: string; hl?: number[]}[] = [
    {slot: 'b03', hl: [3, 7]},
    {slot: 'b04', hl: [4, 5]},
    {slot: 'b05', hl: [1, 4]},
    {slot: 'b06', hl: [1, 2]},
    {slot: 'b07', hl: [4]},
    {slot: 'b08', hl: [2, 4, 8]},
    {slot: 'b09', hl: [4, 5]},
    {slot: 'b10', hl: [2]},
    {slot: 'b11', hl: [0, 4, 6]},
    {slot: 'b12', hl: [2]},
    {slot: 'b13', hl: [0]},
    {slot: 'b14', hl: [0]},
  ];
  const small = SMALL.map((s) => {
    const x = v(s.slot);
    return {t0: x.words[0] - 0.18, t1: x.t1 + 0.3, text: x.text, hl: s.hl, times: x.words} as CapLine;
  }).sort((p, q) => p.t0 - q.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, END - 0.05);
  });
  return [...lines, ...small];
};
const CAPS = buildCaps();

const TRANS: Tr[] = [
  {t: W.s2[0], type: 'wipeR', color: C.blue},
  {t: W.s3a[0], type: 'iris', color: C.blue},
  {t: W.s3b[0], type: 'wipeU', color: C.ink},
  {t: W.s4a[0], type: 'stripes', color: C.red},
  {t: W.s4b[0], type: 'wipeL', color: C.blue},
  {t: W.s5a[0], type: 'wipeR', color: C.ink},
  {t: W.s5b[0], type: 'iris', color: C.blue},
  {t: W.s6[0], type: 'wipeU', color: C.blue},
  {t: W.s7[0], type: 'stripes', color: C.blue},
];

export const Video12: React.FC = () => (
  <AbsoluteFill style={{background: C.cream, fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <Show from={W.s1[0]} to={W.s1[1]} punch={0}><S1 a={W.s1[0]} /></Show>
    <Show from={W.s2[0]} to={W.s2[1]}><S2 a={W.s2[0]} /></Show>
    <Show from={W.s3a[0]} to={W.s3a[1]}><S3a a={W.s3a[0]} /></Show>
    <Show from={W.s3b[0]} to={W.s3b[1]}><S3b a={W.s3b[0]} /></Show>
    <Show from={W.s4a[0]} to={W.s4a[1]}><S4a a={W.s4a[0]} /></Show>
    <Show from={W.s4b[0]} to={W.s4b[1]}><S4b a={W.s4b[0]} /></Show>
    <Show from={W.s5a[0]} to={W.s5a[1]}><S5a a={W.s5a[0]} /></Show>
    <Show from={W.s5b[0]} to={W.s5b[1]}><S5b a={W.s5b[0]} /></Show>
    <Show from={W.s6[0]} to={W.s6[1]}><S6 a={W.s6[0]} /></Show>
    <Show from={W.s7[0]} to={W.s7[1] + 1}><S7 a={W.s7[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack12.wav')} />
  </AbsoluteFill>
);
export {rnd};
