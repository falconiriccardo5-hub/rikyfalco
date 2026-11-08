/** Reel «I pesi non allenano solo i muscoli»: ossa, cervello, umore — infografica animata nello stile RF Coaching. */
import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {Captions, CapLine} from '../Captions';
import {Headline, KeywordCTA, Handle, Sparkles} from '../v13/kit';
import {Grain} from '../ui';
import timing from '../voice23_timing.json';

type Seg = {id: string; scene: string; text: string; t0: number; t1: number; words: [number, number, string][]};
const T = timing as unknown as Seg[];
const seg = (id: string) => T.find((s) => s.id === id)!;
export const END23 = seg('a9').t1 + 1.6;
export const DURATION23 = Math.ceil(END23 * 30);
// finestre delle scene
const W: Record<string, [number, number]> = {
  hook: [0, seg('a2').t0 - 0.15],
  futuro: [seg('a2').t0 - 0.15, seg('a3').t0 - 0.15],
  ossa: [seg('a3').t0 - 0.15, seg('a4').t0 - 0.15],
  ossa2: [seg('a4').t0 - 0.15, seg('a5').t0 - 0.15],
  cervello: [seg('a5').t0 - 0.15, seg('a6').t0 - 0.15],
  umore: [seg('a6').t0 - 0.15, seg('a7').t0 - 0.15],
  pratica: [seg('a7').t0 - 0.15, seg('a8').t0 - 0.15],
  fiducia: [seg('a8').t0 - 0.15, seg('a9').t0 - 0.15],
  cta: [seg('a9').t0 - 0.15, END23 + 1],
};
/** tempo (s) dell'n-esima parola di una frase */
const wt = (id: string, n: number) => seg(id).words[Math.min(n, seg(id).words.length - 1)][0];

/* ------------------------------------------------------------------ elementi grafici */
const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 34, boxShadow: `10px 10px 0 ${C.ink}`, ...style}}>{children}</div>
);
const Source: React.FC<{text: string; t0: number}> = ({text, t0}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1240, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 26, color: 'rgba(17,17,17,.55)', opacity: prog(t, t0, t0 + 0.4)}}>
      Fonte: {text}
    </div>
  );
};
const Label: React.FC<{text: string; t0: number; top: number; color?: string; size?: number}> = ({text, t0, top, color = C.ink, size = 62}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.35, E.back);
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -1, color, transform: `scale(${mix(0.7, 1, p)})`, opacity: Math.min(1, p * 2)}}>
      {text}
    </div>
  );
};

const Barbell: React.FC<{y: number}> = ({y}) => (
  <g transform={`translate(0,${y})`}>
    <rect x={180} y={-10} width={720} height={20} rx={10} fill={C.ink} />
    {[150, 210, 870, 930].map((x, i) => (
      <rect key={i} x={x - 26} y={i % 3 === 0 ? -95 : -120} width={52} height={i % 3 === 0 ? 190 : 240} rx={14} fill={i % 3 === 0 ? C.blueL : C.blue} stroke={C.ink} strokeWidth={8} />
    ))}
  </g>
);

const Bone: React.FC<{glow: number; t: number}> = ({glow, t}) => (
  <svg width={760} height={560} viewBox="0 0 760 560">
    <path d="M150 190 C70 130 70 40 160 40 C230 40 250 110 280 150 L480 150 C510 110 530 40 600 40 C690 40 690 130 610 190 C690 250 690 340 600 340 C530 340 510 270 480 230 L280 230 C250 270 230 340 160 340 C70 340 70 250 150 190 Z" transform="translate(0,90)" fill="#FFF8EC" stroke={C.ink} strokeWidth={10} />
    {Array.from({length: 26}).map((_, i) => {
      const x = 300 + (i % 13) * 14 + ((i * 37) % 9);
      const y = 255 + Math.floor(i / 13) * 30 + ((i * 53) % 11);
      const on = Math.max(0, Math.min(1, glow * 1.6 - (i % 7) * 0.12));
      return <circle key={i} cx={x} cy={y} r={7 + 3 * on * (0.8 + 0.2 * Math.sin(t * 6 + i))} fill={on > 0.05 ? C.blue : '#D9CDB4'} opacity={0.5 + 0.5 * on} />;
    })}
  </svg>
);

const Brain: React.FC<{glow: number}> = ({glow}) => (
  <svg width={720} height={560} viewBox="0 0 720 560">
    <path d="M200 420 C110 410 80 330 110 270 C70 210 110 130 190 130 C210 70 300 50 350 90 C400 40 500 60 520 130 C600 130 650 210 610 270 C650 340 600 420 520 410 C500 470 410 490 360 450 C310 490 220 480 200 420 Z" fill="#FBE9F1" stroke={C.ink} strokeWidth={10} />
    <path d="M360 95 C350 200 370 330 360 450" stroke={C.ink} strokeWidth={6} fill="none" opacity={0.5} />
    {[
      'M170 230 C220 200 260 240 300 210',
      'M420 200 C470 170 520 210 560 190',
      'M150 320 C200 300 250 340 300 310',
      'M420 320 C470 300 510 340 580 310',
    ].map((d, i) => (
      <path key={i} d={d} stroke={C.ink} strokeWidth={6} fill="none" opacity={0.45} strokeLinecap="round" />
    ))}
    <ellipse cx={420} cy={360} rx={70} ry={34} fill={C.blue} opacity={0.25 + 0.75 * glow} stroke={C.ink} strokeWidth={6} />
    <circle cx={420} cy={360} r={110 * glow} fill={C.blueL} opacity={0.25 * glow} />
  </svg>
);

/* ------------------------------------------------------------------ scene */
const inScene = (t: number, k: string) => t >= W[k][0] && t < W[k][1];

const Hook: React.FC = () => {
  const t = useT();
  const lift = Math.abs(Math.sin(t * 2.4));
  const stamp = prog(t, wt('a1', 9), wt('a1', 9) + 0.3, E.back);
  return (
    <>
      <Headline t0={0.1} lines={[{text: 'I PESI SERVONO'}, {text: 'SOLO AI MUSCOLI?', color: C.blue}]} top={190} size={92} />
      <svg width={1080} height={800} style={{position: 'absolute', left: 0, top: 520}}>
        <Barbell y={420 - lift * 120} />
        <rect x={340} y={600} width={400} height={30} rx={15} fill={C.ink} opacity={0.12} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1010, display: 'flex', justifyContent: 'center', gap: 34}}>
        {['OSSA', 'CERVELLO', 'UMORE'].map((x, i) => {
          const p = prog(t, wt('a1', 10) + i * 0.15, wt('a1', 10) + i * 0.15 + 0.3, E.back);
          return (
            <div key={x} style={{transform: `scale(${p})`, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 44, padding: '14px 26px', borderRadius: 999}}>
              {x}
            </div>
          );
        })}
      </div>
      {stamp > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center', transform: `rotate(-8deg) scale(${mix(2, 1, stamp)})`, opacity: Math.min(1, stamp * 2)}}>
          <div style={{border: `10px solid ${C.red}`, color: C.red, fontFamily: FONT, fontWeight: 900, fontSize: 110, padding: '4px 34px', borderRadius: 20, background: 'rgba(255,255,255,.9)'}}>NON SOLO</div>
        </div>
      )}
    </>
  );
};

const Futuro: React.FC = () => {
  const t = useT();
  const [a, b] = W.futuro;
  const p = prog(t, a, b, E.lin);
  const steps = 7;
  return (
    <>
      <Label text="TRA 30 ANNI…" t0={a + 0.1} top={190} size={96} />
      <svg width={1080} height={900} style={{position: 'absolute', left: 0, top: 330}}>
        {Array.from({length: steps}).map((_, i) => (
          <rect key={i} x={140 + i * 110} y={760 - i * 90} width={1080} height={90 + i * 90} fill={i % 2 ? '#EFE9F9' : '#E4DAF6'} stroke={C.ink} strokeWidth={6} />
        ))}
      </svg>
      <Img
        src={staticFile('toon/gtq_body.png')}
        style={{position: 'absolute', height: 520, left: 120 + p * 520, top: 520 - p * 470, transform: `translateY(${-Math.abs(Math.sin(t * 7)) * 14}px)`}}
      />
      {/* buste della spesa */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <g transform={`translate(${200 + p * 520},${930 - p * 470})`}>
          <rect x={0} y={0} width={70} height={80} rx={10} fill={C.blue} stroke={C.ink} strokeWidth={6} />
          <path d="M14 0 C14 -30 56 -30 56 0" stroke={C.ink} strokeWidth={6} fill="none" />
        </g>
      </svg>
      <Label text="…LA FORZA LA COSTRUISCI ADESSO" t0={wt('a2', 11)} top={1120} size={54} color={C.blue} />
    </>
  );
};

const Ossa: React.FC = () => {
  const t = useT();
  const [a] = W.ossa;
  const g = prog(t, wt('a3', 6), wt('a3', 14) + 0.3);
  return (
    <>
      <Label text="1 · OSSA" t0={a + 0.05} top={190} size={110} color={C.blue} />
      <div style={{position: 'absolute', left: 160, top: 420}}>
        <Bone glow={g} t={t} />
      </div>
      {/* carico */}
      <svg width={1080} height={300} style={{position: 'absolute', left: 0, top: 360}}>
        {[380, 540, 700].map((x, i) => (
          <path key={i} d={`M${x} ${20 + ((t * 120 + i * 40) % 80)} l0 70 m-24 -24 l24 24 l24 -24`} stroke={C.ink} strokeWidth={10} fill="none" strokeLinecap="round" opacity={prog(t, wt('a3', 4), wt('a3', 6))} />
        ))}
      </svg>
      <Label text="CARICO → STIMOLO → OSSO PIÙ FORTE" t0={wt('a3', 10)} top={1050} size={48} />
    </>
  );
};

const Ossa2: React.FC = () => {
  const t = useT();
  const [a] = W.ossa2;
  const g = prog(t, wt('a4', 22), wt('a4', 26), E.out);
  const l = prog(t, wt('a4', 30), wt('a4', 34), E.out);
  const bar = (h: number, col: string, label: string, val: string, x: number, down?: boolean) => (
    <div style={{position: 'absolute', left: x, top: 470, width: 380, height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 92, color: down ? C.red : C.blue, opacity: h > 0.05 ? 1 : 0}}>{val}</div>
      <div style={{flex: 1, width: '100%', position: 'relative'}}>
        <div style={{position: 'absolute', left: 90, right: 90, [down ? 'top' : 'bottom']: down ? 160 : 160, height: 190 * h * (down ? 0.42 : 1), background: col, border: `${OUT}px solid ${C.ink}`, borderRadius: 14}} />
        <div style={{position: 'absolute', left: 40, right: 40, top: 400, height: 8, background: C.ink}} />
      </div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 36, color: C.ink, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line'}}>{label}</div>
    </div>
  );
  return (
    <>
      <Card style={{position: 'absolute', left: 60, right: 60, top: 150, padding: '22px 30px'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink}}>DONNE IN MENOPAUSA, OSSA FRAGILI</div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 36, color: C.blue, marginTop: 6, opacity: prog(t, wt('a4', 11), wt('a4', 12))}}>CARICHI PESANTI · 2×/SETTIMANA · 8 MESI</div>
      </Card>
      {bar(g, C.blue, 'CARICHI PESANTI\nCON ISTRUTTORE', '+2,9%', 120)}
      {bar(l, '#C9C3D6', 'ESERCIZI\nLEGGERI A CASA', '−1,2%', 580, true)}
      <Label text="DENSITÀ DELLA COLONNA" t0={wt('a4', 22)} top={1140} size={44} />
      <Source text="Watson et al., J Bone Miner Res 2018 (studio LIFTMOR)" t0={a + 0.5} />
    </>
  );
};

const Cervello: React.FC = () => {
  const t = useT();
  const [a] = W.cervello;
  const g = prog(t, wt('a5', 12), wt('a5', 20));
  return (
    <>
      <Label text="2 · CERVELLO" t0={a + 0.05} top={190} size={104} color={C.blue} />
      <div style={{position: 'absolute', left: 180, top: 410}}>
        <Brain glow={g} />
      </div>
      <Label text="6 MESI DI PESI" t0={wt('a5', 12)} top={960} size={72} />
      <Label text="AREE DELLA MEMORIA PIÙ PROTETTE" t0={wt('a5', 17)} top={1060} size={44} color={C.blue} />
      <Source text="Broadhouse et al., NeuroImage: Clinical 2020 (studio SMART, over 55)" t0={a + 0.5} />
    </>
  );
};

const Umore: React.FC = () => {
  const t = useT();
  const [a] = W.umore;
  const n = Math.round(33 * prog(t, wt('a6', 5), wt('a6', 9)));
  return (
    <>
      <Label text="3 · UMORE" t0={a + 0.05} top={190} size={110} color={C.blue} />
      <div style={{position: 'absolute', left: 150, right: 150, top: 420, display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 14}}>
        {Array.from({length: 33}).map((_, i) => (
          <div key={i} style={{aspectRatio: '1', borderRadius: 10, border: `5px solid ${C.ink}`, background: i < n ? C.blue : '#fff'}} />
        ))}
      </div>
      <Label text={`${n} STUDI`} t0={wt('a6', 5)} top={720} size={96} />
      <Label text="≈ 1.900 PERSONE" t0={wt('a6', 8)} top={830} size={56} />
      <Label text="MENO SINTOMI DEPRESSIVI" t0={wt('a6', 12)} top={980} size={58} color={C.blue} />
      <Source text="Gordon et al., JAMA Psychiatry 2018 (33 studi, 1.877 partecipanti)" t0={a + 0.5} />
    </>
  );
};

const Pratica: React.FC = () => {
  const t = useT();
  const [a] = W.pratica;
  const rows = [
    {n: '1', txt: '2 SEDUTE A SETTIMANA', at: wt('a7', 3)},
    {n: '2', txt: 'POCHI ESERCIZI FONDAMENTALI', at: wt('a7', 7)},
    {n: '3', txt: 'FACILE? AUMENTA UN POCO', at: wt('a7', 16)},
  ];
  return (
    <>
      <Label text="DA DOVE PARTIRE" t0={a + 0.05} top={170} size={86} />
      <Img src={staticFile('toon/gtq_body.png')} style={{position: 'absolute', height: 560, left: 650, top: 640, transform: `translateY(${Math.sin(t * 2.2) * 6}px)`}} />
      <div style={{position: 'absolute', left: 54, top: 330, display: 'flex', flexDirection: 'column', gap: 26}}>
        {rows.map((r) => {
          const p = prog(t, r.at - 0.1, r.at + 0.25, E.back);
          return (
            <div key={r.n} style={{display: 'flex', alignItems: 'center', gap: 18, transform: `translateX(${(1 - p) * -500}px)`, opacity: Math.min(1, p * 2)}}>
              <div style={{width: 92, height: 92, borderRadius: 46, background: C.blue, border: `${OUT}px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{r.n}</div>
              <Card style={{padding: '18px 26px', fontFamily: FONT, fontWeight: 900, fontSize: 42, color: C.ink, boxShadow: `7px 7px 0 ${C.ink}`, borderRadius: 24}}>{r.txt}</Card>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Fiducia: React.FC = () => {
  const t = useT();
  const [a] = W.fiducia;
  const items = [
    {txt: 'CARICO GIUSTO PER TE', at: wt('a8', 8)},
    {txt: 'TECNICA SOTTO CONTROLLO', at: wt('a8', 14)},
    {txt: 'PROGRESSI MISURATI', at: wt('a8', 19)},
  ];
  return (
    <>
      <Label text="COME LAVORO CON CHI SEGUO" t0={a + 0.05} top={180} size={64} />
      <Card style={{position: 'absolute', left: 90, right: 90, top: 380, padding: '40px 40px'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.blue, textAlign: 'center', marginBottom: 20}}>RF COACHING</div>
        {items.map((it) => (
          <div key={it.txt} style={{display: 'flex', alignItems: 'center', gap: 20, margin: '18px 0', opacity: prog(t, it.at - 0.1, it.at + 0.2)}}>
            <div style={{width: 58, height: 58, borderRadius: 16, background: C.blue, border: `5px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✓</div>
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink}}>{it.txt}</div>
          </div>
        ))}
      </Card>
    </>
  );
};

const Cta: React.FC = () => {
  const [a] = W.cta;
  return (
    <>
      <KeywordCTA t0={wt('a9', 6) - 0.1} word="ANALISI" />
      <Handle t0={wt('a9', 8)} top={720} />
      <Sparkles t0={wt('a9', 6)} x={540} y={420} n={14} />
      <Img src={staticFile('toon/gtq_body.png')} style={{position: 'absolute', height: 430, left: 330, top: 840}} />
      <span style={{display: 'none'}}>{a}</span>
    </>
  );
};

const Scenes: React.FC = () => {
  const t = useT();
  const S: Record<string, React.FC> = {hook: Hook, futuro: Futuro, ossa: Ossa, ossa2: Ossa2, cervello: Cervello, umore: Umore, pratica: Pratica, fiducia: Fiducia, cta: Cta};
  const k = Object.keys(W).find((x) => inScene(t, x)) ?? 'cta';
  const Comp = S[k];
  const [a] = W[k];
  const enter = prog(t, a, a + 0.25, E.out);
  return (
    <AbsoluteFill style={{transform: `translateY(${(1 - enter) * 40}px)`, opacity: k === 'hook' ? 1 : enter}}>
      <Comp />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ sottotitoli parola per parola */
const CAPS: CapLine[] = (() => {
  const out: CapLine[] = [];
  for (const s of T) {
    const ws = s.words;
    for (let i = 0; i < ws.length; i += 5) {
      const ch = ws.slice(i, i + 5);
      out.push({t0: ch[0][0] - 0.05, t1: ch[ch.length - 1][1] + 0.1, text: ch.map((w) => w[2].replace(/\s+/g, '')).join(' '), times: ch.map((w) => w[0]), hl: [], bottom: 300, wrapAt: 22, fs: 52});
    }
  }
  out.forEach((l, i) => {
    const nx = out[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.02);
  });
  return out;
})();

export const Video23: React.FC = () => (
  <AbsoluteFill style={{background: C.cream, fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: 0.35}}>
      {Array.from({length: 28}).map((_, i) => (
        <circle key={i} cx={(i * 197) % 1080} cy={(i * 331) % 1920} r={4} fill={C.blueL} />
      ))}
    </svg>
    <Scenes />
    <Captions lines={CAPS} />
    <Grain />
    <Audio src={staticFile('soundtrack23.wav')} />
  </AbsoluteFill>
);
