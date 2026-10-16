import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {C, FONT} from '../brand';
import {Riky, RikyProps} from '../Riky';
import {Check} from '../ui';

export const SW = 1080;
export const SH = 1350;

type Slide = {
  kind: 'cover' | 'q' | 'result' | 'step' | 'cta' | 'info';
  n?: number;
  title: string;
  sub?: string;
  lines?: string[];
  riky?: RikyProps;
  dark?: boolean;
};

const arm = {up: {hand: [273, 822] as [number, number]}, hip: {hand: [205, 760] as [number, number]}};

export const DECKS: Record<string, Slide[]> = {
  scheda: [
    {kind: 'cover', title: 'LA TUA SCHEDA STA FUNZIONANDO?', sub: '7 domande. 1 minuto. Un punteggio onesto.', riky: {smile: 1, brow: 6}},
    {kind: 'q', n: 1, title: 'Sai quanto hai sollevato ieri?', sub: 'Carichi e ripetizioni di ogni esercizio, scritti da qualche parte.', riky: {smile: 0.4}},
    {kind: 'q', n: 2, title: 'Negli ultimi 30 giorni sei salito di carico o ripetizioni?', sub: 'In almeno metà degli esercizi principali.', riky: {smile: 0, brow: 8, browTilt: -4}},
    {kind: 'q', n: 3, title: 'Finisci le serie vicino al limite?', sub: 'Dovresti avere solo 1–3 ripetizioni di riserva. Non 8.', riky: {smile: 0.2, mouth: 0.5}},
    {kind: 'q', n: 4, title: 'Alleni ogni muscolo almeno 2 volte a settimana?', sub: 'Una volta sola è troppo poco per crescere con costanza.', riky: {smile: 0.6}},
    {kind: 'q', n: 5, title: 'Cambi esercizi solo quando smetti di progredire?', sub: 'Non perché ti annoi o perché “bisogna variare”.', riky: {smile: 0, brow: 6, tilt: -5}},
    {kind: 'q', n: 6, title: 'Mangi abbastanza proteine?', sub: 'Come riferimento: 1,6–2 g per ogni kg di peso corporeo.', riky: {smile: 0.7}},
    {kind: 'q', n: 7, title: 'Qualcuno ha controllato la tua tecnica negli ultimi 3 mesi?', sub: 'Un video di lato vale più di mille sensazioni.', riky: {smile: 0.3, brow: 10}},
    {kind: 'result', title: 'CONTA I TUOI “SÌ”', lines: ['6–7|Sei sulla strada giusta. Rifinisci i dettagli.|ok', '4–5|Stai mantenendo, non migliorando.|mid', '0–3|Stai girando a vuoto: serve un cambio di rotta.|bad'], riky: {smile: 0.5, brow: 8}},
    {kind: 'cta', title: 'VUOI SAPERE COSA CAMBIARE?', sub: 'Scrivimi ANALISI in DM e guardo la tua situazione con te. Gratis.', riky: {smile: 1, mouth: 0.4}},
  ],
  percorso: [
    {kind: 'cover', title: 'COME FUNZIONA IL PERCORSO IN 4 PASSI', sub: 'Dall’analisi gratuita ai risultati. Senza sorprese.', riky: {smile: 1}},
    {kind: 'step', n: 1, title: 'ANALISI GRATUITA', sub: 'Mi racconti obiettivo, livello, tempo disponibile e infortuni. Guardo la tua scheda attuale e ti dico cosa non sta funzionando.', riky: {smile: 0.6, brow: 6}},
    {kind: 'step', n: 2, title: 'PIANO SU MISURA', sub: 'Una scheda costruita sulla tua vita: poche sedute ben fatte, esercizi scelti per te, carichi e progressioni chiari.', riky: {smile: 0.8}},
    {kind: 'step', n: 3, title: 'TECNICA CONTROLLATA', sub: 'Mi mandi i video dei tuoi esercizi e ti correggo. Meno rischi, più risultati da ogni ripetizione.', riky: {smile: 0.7, brow: 8}},
    {kind: 'step', n: 4, title: 'PROGRESSIONE E REVISIONE', sub: 'Misuriamo i progressi e aggiorniamo il piano. Se una cosa non funziona, la cambiamo.', riky: {smile: 1}},
    {kind: 'cta', title: 'INIZIA DAL PASSO 1', sub: 'Scrivimi ANALISI in DM: è gratuita e senza impegno.', riky: {smile: 1, mouth: 0.4}},
  ],
};

const Counter: React.FC<{i: number; total: number; dark?: boolean}> = ({i, total, dark}) => (
  <div style={{position: 'absolute', top: 56, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 800, fontSize: 30, color: dark ? C.cream : C.ink, opacity: 0.8}}>
    <span>@riccardofalconi_coach</span>
    <span>{i + 1}/{total}</span>
  </div>
);

const Foot: React.FC<{dark?: boolean; last?: boolean}> = ({dark, last}) => (
  <div style={{position: 'absolute', bottom: 56, left: 72, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: dark ? C.cream : C.ink, opacity: 0.75}}>
    {last ? 'COACH RIKY' : 'SCORRI  →'}
  </div>
);

const wrap: React.CSSProperties = {fontFamily: FONT, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2};

export const CarouselSlide: React.FC<{deck: string; index: number}> = ({deck, index}) => {
  const slides = DECKS[deck];
  const s = slides[index];
  const total = slides.length;
  const dark = s.kind === 'cover' || s.kind === 'cta';
  const bg = dark ? C.ink : C.cream;
  const fg = dark ? C.cream : C.ink;
  const rk = s.riky ?? {};
  const big = s.kind === 'cover' || s.kind === 'cta';
  return (
    <AbsoluteFill style={{background: bg, backgroundImage: `radial-gradient(${dark ? 'rgba(245,243,238,0.08)' : 'rgba(17,17,17,0.10)'} 2.5px, transparent 3px)`, backgroundSize: '54px 54px'}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
        @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
      `}</style>
      <Counter i={index} total={total} dark={dark} />

      {s.kind === 'q' && (
        <>
          <div style={{position: 'absolute', left: 72, top: 150, width: 150, height: 150, borderRadius: 75, background: C.blue, border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrap, fontSize: 100, color: C.cream}}>{s.n}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 330, ...wrap, fontSize: 76, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 520, top: 800, fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: fg, opacity: 0.8}}>{s.sub}</div>
          <div style={{position: 'absolute', left: 72, bottom: 130, padding: '16px 30px', background: C.ink, color: C.cream, borderRadius: 18, fontFamily: FONT, fontWeight: 900, fontSize: 38}}>SÌ = 1 PUNTO</div>
        </>
      )}

      {s.kind === 'step' && (
        <>
          <div style={{position: 'absolute', left: 72, top: 150, ...wrap, fontSize: 38, color: C.blue, letterSpacing: 4}}>PASSO</div>
          <div style={{position: 'absolute', left: 60, top: 170, ...wrap, fontSize: 330, color: C.blue, lineHeight: 1, letterSpacing: -10}}>{s.n}</div>
          <div style={{position: 'absolute', left: 72, width: 650, top: 520, ...wrap, fontSize: 80, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 520, top: 740, fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.32, color: fg, opacity: 0.85}}>{s.sub}</div>
        </>
      )}

      {big && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: s.kind === 'cover' ? 200 : 240, width: 650, right: undefined, ...wrap, fontSize: s.kind === 'cover' ? 92 : 90, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 560, top: s.kind === 'cover' ? 820 : 780, fontFamily: FONT, fontWeight: 700, fontSize: 42, lineHeight: 1.3, color: C.blueL}}>{s.sub}</div>
          {s.kind === 'cta' && (
            <div style={{position: 'absolute', left: 72, bottom: 140, padding: '20px 40px', background: C.blue, color: C.cream, border: `6px solid ${C.cream}`, borderRadius: 24, fontFamily: FONT, fontWeight: 900, fontSize: 72, letterSpacing: 2}}>ANALISI</div>
          )}
        </>
      )}

      {s.kind === 'result' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 150, ...wrap, fontSize: 90, color: fg}}>{s.title}</div>
          {s.lines!.map((ln, i) => {
            const [pts, txt, tone] = ln.split('|');
            const col = tone === 'ok' ? C.blue : tone === 'mid' ? C.ink : C.red;
            return (
              <div key={i} style={{position: 'absolute', left: 72, right: 72, top: 360 + i * 270, height: 235, background: C.paper, border: `6px solid ${C.ink}`, borderRadius: 28, boxShadow: `10px 10px 0 ${col}`, display: 'flex', alignItems: 'center', padding: '0 36px', gap: 36}}>
                <div style={{...wrap, fontSize: 92, color: col, minWidth: 250}}>{pts}</div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 38, lineHeight: 1.22, color: C.ink, maxWidth: 400}}>{txt}</div>
              </div>
            );
          })}
        </>
      )}

      {big && <div style={{position: 'absolute', right: -40, bottom: 40, width: 430, height: 700, borderRadius: 215, background: C.cream, opacity: 0.96}} />}
      <svg width={SW} height={SH} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <Riky x={s.kind === 'result' ? 900 : 830} y={SH - 40} scale={s.kind === 'result' ? 0.0 : s.kind === 'q' || s.kind === 'step' ? 0.55 : 0.6} {...rk} />
      </svg>
      <Foot dark={dark} last={s.kind === 'cta'} />
    </AbsoluteFill>
  );
};
