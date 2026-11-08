/** Personaggi «realistici» (proporzioni adulte, campiture piatte con ombre morbide, niente contorni neri) per il Video 23 premium.
 *  Coordinate locali: piedi in (0,0), altezza ≈ 640 unità. Angoli in radianti dalla verticale verso il basso, + verso destra (x+). */
import React from 'react';

type P = [number, number];
export type Limb = [number, number]; // [angolo coscia/omero, angolo tibia/avambraccio] (assoluti)
export type Pose = {armL?: Limb; armR?: Limb; legL?: Limb; legR?: Limb; bend?: number; dy?: number; blink?: boolean; mouth?: number; thigh?: number};
export type Kind = 'girl' | 'riky' | 'old';

const PAL = {
  girl: {skin: '#F0C7AA', skinD: '#D9A98B', hair: '#231B19', top: '#F06B55', topD: '#D1533F', bot: '#1E6E74', botD: '#134D52', shoe: '#F4F4F6', sole: '#7B4BE0', acc: '#7B4BE0'},
  old: {skin: '#EEC9B1', skinD: '#D4AA92', hair: '#CFCBD4', top: '#8A73C8', topD: '#6C56AA', bot: '#3C465C', botD: '#2D3548', shoe: '#E9E7EC', sole: '#55555F', acc: '#F06B55'},
  riky: {skin: '#F4D8C4', skinD: '#DDB79F', hair: '#111113', top: '#1B1B20', topD: '#2B2B33', bot: '#6D3BD2', botD: '#5329A8', shoe: '#F4F4F6', sole: '#2A2A30', acc: '#6D3BD2'},
};

export const pt = (p: P, a: number, l: number): P => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];
const mixP = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angOf = (a: P, b: P) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const deg = (r: number) => (-r * 180) / Math.PI;

/** segmento rastremato (estremi arrotondati opzionali) */
const Seg: React.FC<{a: P; b: P; w1: number; w2: number; c: string; capA?: boolean; capB?: boolean}> = ({a, b, w1, w2, c, capA = true, capB = true}) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = `M${a[0] + nx * w1} ${a[1] + ny * w1} L${b[0] + nx * w2} ${b[1] + ny * w2} L${b[0] - nx * w2} ${b[1] - ny * w2} L${a[0] - nx * w1} ${a[1] - ny * w1} Z`;
  return (
    <g>
      <path d={d} fill={c} />
      {capA && <circle cx={a[0]} cy={a[1]} r={w1} fill={c} />}
      {capB && <circle cx={b[0]} cy={b[1]} r={w2} fill={c} />}
    </g>
  );
};

export const Person: React.FC<{
  kind: Kind;
  view?: 'front' | 'side';
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  pose?: Pose;
  /** oggetti dietro il corpo / sopra il corpo (coordinate locali, ricevono la posizione dei polsi) */
  under?: (h: {L: P; R: P}) => React.ReactNode;
  hold?: (h: {L: P; R: P}) => React.ReactNode;
}> = ({kind, view = 'front', x, y, s = 1, flip, pose = {}, under, hold}) => {
  const c = PAL[kind];
  const side = view === 'side';
  const old = kind === 'old';
  const riky = kind === 'riky';
  const girl = kind === 'girl';
  const bend = pose.bend ?? (old ? 0.14 : 0);
  const th = pose.thigh ?? 1;
  const defLeg = (sd: 'L' | 'R'): Limb => (side ? [0, 0] : sd === 'L' ? [-0.035, -0.015] : [0.035, 0.015]);
  const legA = (sd: 'L' | 'R') => (sd === 'L' ? pose.legL : pose.legR) ?? defLeg(sd);
  const ext = (l: Limb) => Math.cos(l[0]) * 160 * th + Math.cos(l[1]) * 150;
  // anca calcolata dalle gambe: i piedi restano a terra
  const hipY = -Math.max(ext(legA('L')), ext(legA('R'))) - 12 + (pose.dy ?? 0);
  const up = (dx: number, h: number): P => [dx * Math.cos(bend) + h * Math.sin(bend), hipY - h * Math.cos(bend) + dx * Math.sin(bend)];
  const shW = side ? 0 : riky ? 58 : 50;
  const hipW = side ? 0 : 24;
  const shL = up(-shW, 180);
  const shR = up(shW, 180);
  const H = up(side ? 8 : 0, 250);
  const legOf = (sd: 'L' | 'R') => {
    const [a1, a2] = legA(sd);
    const h: P = [sd === 'L' ? -hipW : hipW, hipY];
    const k = pt(h, a1, 160 * th);
    const an = pt(k, a2, 150);
    return {h, k, an};
  };
  const armOf = (sd: 'L' | 'R') => {
    const def: Limb = side ? [0.05, 0.12] : sd === 'L' ? [-0.1, -0.04] : [0.1, 0.04];
    const [a1, a2] = (sd === 'L' ? pose.armL : pose.armR) ?? def;
    const sh = sd === 'L' ? shL : shR;
    const e = pt(sh, a1, 122);
    const w = pt(e, a2, 112);
    return {sh, e, w};
  };
  const LL = legOf('L');
  const LR = legOf('R');
  const AL = armOf('L');
  const AR = armOf('R');

  const leg = (g: ReturnType<typeof legOf>, dark: boolean) => {
    const sk = dark ? c.skinD : c.skin;
    const col = old ? (dark ? c.botD : c.bot) : sk;
    const dir = side ? 1 : g.h[0] < 0 ? -1 : 1;
    const cm = mixP(g.k, g.an, 0.3);
    return (
      <g>
        <Seg a={g.h} b={g.k} w1={girl ? 27 : 26} w2={16} c={col} />
        <Seg a={g.k} b={g.an} w1={16} w2={10} c={col} />
        {!old && <ellipse cx={cm[0] - (side ? 4 : 0)} cy={cm[1]} rx={14} ry={40} fill={sk} transform={`rotate(${deg(angOf(g.k, g.an))} ${cm[0]} ${cm[1]})`} />}
        {!old && <rect x={g.an[0] - 10} y={g.an[1] - 14} width={20} height={12} rx={4} fill="#fff" opacity={0.9} />}
        {side ? (
          <g fill={dark ? '#D2D2D8' : c.shoe}>
            <path d={`M${g.an[0] - 18} ${g.an[1] - 4} Q${g.an[0] - 16} ${g.an[1] - 18} ${g.an[0] + 2} ${g.an[1] - 14} L${g.an[0] + 30} ${g.an[1] - 4} Q${g.an[0] + 48} ${g.an[1] + 2} ${g.an[0] + 46} ${g.an[1] + 14} L${g.an[0] - 20} ${g.an[1] + 14} Z`} />
            <rect x={g.an[0] - 21} y={g.an[1] + 10} width={68} height={8} rx={4} fill={c.sole} />
          </g>
        ) : (
          <g fill={dark ? '#D2D2D8' : c.shoe}>
            <path d={`M${g.an[0] - 15 + dir * 3} ${g.an[1] - 4} Q${g.an[0]} ${g.an[1] - 18} ${g.an[0] + 15 + dir * 3} ${g.an[1] - 4} L${g.an[0] + 19 + dir * 5} ${g.an[1] + 14} L${g.an[0] - 19 + dir * 5} ${g.an[1] + 14} Z`} />
            <rect x={g.an[0] - 21 + dir * 5} y={g.an[1] + 10} width={42} height={8} rx={4} fill={c.sole} />
          </g>
        )}
      </g>
    );
  };
  const arm = (g: ReturnType<typeof armOf>, dark: boolean) => {
    const sk = dark ? c.skinD : c.skin;
    const a2 = angOf(g.e, g.w);
    const sleeve = old ? (dark ? c.topD : c.top) : sk;
    const hc = pt(g.w, a2, 12);
    return (
      <g>
        <Seg a={g.sh} b={g.e} w1={riky ? 18 : 15} w2={12} c={sleeve} capA={girl} />
        {!girl && <circle cx={g.sh[0] - Math.sign(g.sh[0] || 1) * 4} cy={g.sh[1] + 10} r={riky ? 22 : 17} fill={dark ? c.topD : c.top} />}
        <Seg a={g.e} b={g.w} w1={old ? 13 : 12} w2={9} c={sleeve} capB={!old} />
        {old && <Seg a={pt(g.e, a2, 92)} b={g.w} w1={9} w2={9} c={sk} />}
        {riky && <Seg a={pt(g.sh, angOf(g.sh, g.e), 8)} b={pt(g.sh, angOf(g.sh, g.e), 58)} w1={20} w2={20} c={dark ? c.topD : c.top} capB={false} />}
        <ellipse cx={hc[0]} cy={hc[1]} rx={12} ry={14} fill={sk} transform={`rotate(${deg(a2)} ${hc[0]} ${hc[1]})`} />
        {girl && <rect x={g.w[0] - 10} y={g.w[1] - 12} width={20} height={9} rx={4} fill={c.acc} transform={`rotate(${deg(a2)} ${g.w[0]} ${g.w[1] - 8})`} />}
      </g>
    );
  };

  // ---- busto
  const waist = girl ? 38 : riky ? 50 : 46;
  const torsoFront = () => {
    const pts: P[] = [up(-shW + 4, 176), up(-shW + 10, 120), up(-waist, 70), up(-hipW - 26, 6), up(hipW + 26, 6), up(waist, 70), up(shW - 10, 120), up(shW - 4, 176)];
    const n = up(0, 196);
    return `M${pts[0]} C${up(-shW + 8, 150)} ${up(-shW + 12, 140)} ${pts[1]} C${up(-shW + 14, 100)} ${up(-waist, 90)} ${pts[2]} C${up(-waist, 40)} ${up(-hipW - 26, 30)} ${pts[3]} L${pts[4]} C${up(hipW + 26, 30)} ${up(waist, 40)} ${pts[5]} C${up(waist, 90)} ${up(shW - 14, 100)} ${pts[6]} C${up(shW - 12, 140)} ${up(shW - 8, 150)} ${pts[7]} Q${n} ${pts[0]} Z`;
  };
  const torsoSide = () => {
    const a = up(-26, 186), b = up(-34, 120), cc = up(-26, 60), d = up(-32, 4), e = up(34, 4), f = up(26, 64), g = up(girl ? 36 : 32, 128), h = up(24, 180);
    return `M${a} C${up(-36, 170)} ${up(-38, 140)} ${b} C${up(-30, 96)} ${up(-24, 80)} ${cc} C${up(-28, 40)} ${up(-34, 20)} ${d} L${e} C${up(34, 30)} ${up(24, 44)} ${f} C${up(28, 90)} ${up(girl ? 42 : 34, 110)} ${g} C${up(30, 160)} ${up(26, 176)} ${h} Z`;
  };
  const torso = side ? torsoSide() : torsoFront();
  const shortsH = (riky ? 92 : girl ? 70 : 60) * Math.min(1, th + 0.15);
  const thighA = (g: ReturnType<typeof legOf>) => angOf(g.h, g.k);
  const shorts = side
    ? `M${up(-34, 16)} L${up(36, 16)} L${pt([36, hipY], thighA(LL), shortsH)} L${pt([-30, hipY], thighA(LL), shortsH)} Z`
    : `M${up(-hipW - 28, 16)} L${up(hipW + 28, 16)} L${pt([LR.h[0] + 30, hipY], thighA(LR) * 0.7, shortsH)} L${pt([LR.h[0] - 24, hipY], thighA(LR), shortsH)} L0 ${hipY + 30} L${pt([LL.h[0] + 24, hipY], thighA(LL), shortsH)} L${pt([LL.h[0] - 30, hipY], thighA(LL) * 0.7, shortsH)} Z`;

  // ---- testa
  const face = () => {
    const ex = side ? [H[0] + 14] : [H[0] - 12, H[0] + 12];
    const ey = H[1] + 2;
    const browC = old ? '#9C97A3' : '#2A1E1C';
    return (
      <g>
        {ex.map((e, i) =>
          pose.blink ? (
            <path key={i} d={`M${e - 5} ${ey} q5 3 10 0`} stroke="#2A1E1C" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ) : (
            <ellipse key={i} cx={e} cy={ey} rx={3.6} ry={4.4} fill="#2A1E1C" />
          ),
        )}
        {ex.map((e, i) => (
          <path key={'b' + i} d={`M${e - 8} ${ey - 12} q8 -5 16 0`} stroke={browC} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        ))}
        {side ? (
          <path d={`M${H[0] + 28} ${H[1] - 2} q9 9 1 13`} fill={c.skin} stroke={c.skinD} strokeWidth={2.5} />
        ) : (
          <path d={`M${H[0]} ${H[1] + 4} q-3 10 2 12`} stroke={c.skinD} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        )}
        <path
          d={side ? `M${H[0] + 12} ${H[1] + 22} q8 ${2 + (pose.mouth ?? 0) * 6} 13 -2` : `M${H[0] - 9} ${H[1] + 22} q9 ${5 + (pose.mouth ?? 0) * 8} 18 0`}
          stroke="#9E4A45"
          strokeWidth={3.2}
          fill={pose.mouth ? '#7A2E2E' : 'none'}
          strokeLinecap="round"
        />
        {(girl || old) && !side && (
          <g opacity={0.3} fill="#F08C84">
            <circle cx={H[0] - 18} cy={H[1] + 14} r={6} />
            <circle cx={H[0] + 18} cy={H[1] + 14} r={6} />
          </g>
        )}
      </g>
    );
  };
  const hairBack = () => {
    if (riky) return null;
    if (old) return <circle cx={H[0] + (side ? -24 : 0)} cy={H[1] - 40} r={17} fill={c.hair} />;
    return side ? (
      <path d={`M${H[0] - 14} ${H[1] - 34} C${H[0] - 64} ${H[1] - 40} ${H[0] - 70} ${H[1] + 10} ${H[0] - 58} ${H[1] + 52} C${H[0] - 52} ${H[1] + 72} ${H[0] - 62} ${H[1] + 90} ${H[0] - 70} ${H[1] + 96} C${H[0] - 34} ${H[1] + 80} ${H[0] - 34} ${H[1] + 40} ${H[0] - 34} ${H[1] + 10} Z`} fill={c.hair} />
    ) : (
      <path d={`M${H[0] + 14} ${H[1] - 40} C${H[0] + 62} ${H[1] - 50} ${H[0] + 66} ${H[1] + 4} ${H[0] + 56} ${H[1] + 44} C${H[0] + 52} ${H[1] + 64} ${H[0] + 60} ${H[1] + 84} ${H[0] + 68} ${H[1] + 92} C${H[0] + 34} ${H[1] + 82} ${H[0] + 30} ${H[1] + 40} ${H[0] + 30} ${H[1] + 6} Z`} fill={c.hair} />
    );
  };
  const hairFront = () => {
    if (riky)
      return (
        <g fill={c.hair} stroke="#34343E" strokeWidth={2} strokeLinejoin="round">
          <path d={`M${H[0] - 31} ${H[1] + 2} C${H[0] - 38} ${H[1] - 30} ${H[0] - 24} ${H[1] - 58} ${H[0] - 2} ${H[1] - 58} C${H[0] + 26} ${H[1] - 62} ${H[0] + 40} ${H[1] - 30} ${H[0] + 31} ${H[1] + 2} C${H[0] + 26} ${H[1] - 14} ${H[0] + 18} ${H[1] - 20} ${H[0] + 8} ${H[1] - 16} C${H[0] - 4} ${H[1] - 26} ${H[0] - 20} ${H[1] - 18} ${H[0] - 26} ${H[1] - 8} Z`} />
          <path d={`M${H[0] - 30} ${H[1] - 30} l-14 -8 l12 -4 l-6 -14 l16 6 l2 -16 l12 12 l8 -16 l8 14 l14 -10 l0 16 l16 -2 l-8 14 l12 6 l-16 4 Z`} />
          <path d={`M${H[0] - 8} ${H[1] - 22} q10 10 4 22 q12 -10 6 -24 z`} />
        </g>
      );
    if (old)
      return <path d={`M${H[0] - 32} ${H[1] + 4} C${H[0] - 38} ${H[1] - 60} ${H[0] + 38} ${H[1] - 60} ${H[0] + 32} ${H[1] + 4} C${H[0] + 20} ${H[1] - 18} ${H[0] - 20} ${H[1] - 18} ${H[0] - 32} ${H[1] + 4} Z`} fill={c.hair} />;
    return (
      <g>
        <path
          d={
            side
              ? `M${H[0] - 30} ${H[1] + 14} C${H[0] - 40} ${H[1] - 50} ${H[0] + 6} ${H[1] - 68} ${H[0] + 30} ${H[1] - 16} C${H[0] + 12} ${H[1] - 24} ${H[0] - 2} ${H[1] - 14} ${H[0] - 6} ${H[1] + 2} C${H[0] - 14} ${H[1] - 2} ${H[0] - 18} ${H[1] + 6} ${H[0] - 30} ${H[1] + 14} Z`
              : `M${H[0] - 31} ${H[1] + 10} C${H[0] - 40} ${H[1] - 64} ${H[0] + 40} ${H[1] - 64} ${H[0] + 31} ${H[1] + 10} C${H[0] + 26} ${H[1] - 10} ${H[0] + 14} ${H[1] - 20} ${H[0] + 2} ${H[1] - 22} C${H[0] - 10} ${H[1] - 14} ${H[0] - 24} ${H[1] - 8} ${H[0] - 31} ${H[1] + 10} Z`
          }
          fill={c.hair}
        />
        {!side && <path d={`M${H[0] - 30} ${H[1] - 2} q-6 26 2 44 q2 -24 6 -40 z M${H[0] + 30} ${H[1] - 2} q6 26 -2 44 q-2 -24 -6 -40 z`} fill={c.hair} />}
        <ellipse cx={H[0] + (side ? -18 : 18)} cy={H[1] - 38} rx={8} ry={6} fill={c.acc} />
      </g>
    );
  };

  const clipId = `half-${kind}-${view}-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <ellipse cx={0} cy={18} rx={110} ry={14} fill="#000" opacity={0.4} />
      {under?.({L: AL.w, R: AR.w})}
      {hairBack()}
      {side ? (
        <>
          {arm(AR, true)}
          {leg(LR, true)}
          {leg(LL, false)}
        </>
      ) : (
        <>
          {leg(LL, false)}
          {leg(LR, false)}
        </>
      )}
      <Seg a={up(side ? 6 : 0, 230)} b={up(side ? 4 : 0, 176)} w1={11} w2={13} c={c.skinD} />
      {girl && !side && <path d={`M${shL} Q${up(0, 196)} ${shR} L${up(shW - 8, 150)} L${up(-shW + 8, 150)} Z`} fill={c.skin} />}
      {girl && !side && <Seg a={shL} b={up(-shW + 4, 140)} w1={15} w2={14} c={c.skin} />}
      {girl && !side && <Seg a={shR} b={up(shW - 4, 140)} w1={15} w2={14} c={c.skin} />}
      <path d={torso} fill={c.top} transform={girl && !side ? `translate(0,6)` : undefined} />
      {girl && !side && <path d={`M${up(-shW + 8, 180)} L${up(-18, 140)} M${up(shW - 8, 180)} L${up(18, 140)}`} stroke={c.top} strokeWidth={10} strokeLinecap="round" />}
      <clipPath id={clipId}>
        <rect x={side ? -200 : 14} y={-800} width={side ? 190 : 200} height={800} />
      </clipPath>
      <path d={torso} fill={c.topD} opacity={0.45} clipPath={`url(#${clipId})`} transform={girl && !side ? `translate(0,6)` : undefined} />
      <path d={shorts} fill={c.bot} />
      {girl && <path d={side ? `M${up(-30, 12)} L${pt([-30, hipY], thighA(LL), shortsH - 4)}` : `M${up(-hipW - 26, 12)} L${pt([LL.h[0] - 28, hipY], thighA(LL) * 0.7, shortsH - 4)} M${up(hipW + 26, 12)} L${pt([LR.h[0] + 28, hipY], thighA(LR) * 0.7, shortsH - 4)}`} stroke={c.botD} strokeWidth={9} />}
      <path d={`M${up(-hipW - 28 - (side ? 6 : 0), 14)} L${up(hipW + 28 + (side ? 8 : 0), 14)}`} stroke={c.botD} strokeWidth={7} opacity={0.8} />
      {side && <ellipse cx={H[0] - 12} cy={H[1] + 4} rx={7} ry={10} fill={c.skinD} />}
      <ellipse cx={H[0]} cy={H[1]} rx={side ? 30 : 31} ry={37} fill={c.skin} />
      {!side && (
        <>
          <ellipse cx={H[0] - 31} cy={H[1] + 4} rx={6} ry={9} fill={c.skinD} />
          <ellipse cx={H[0] + 31} cy={H[1] + 4} rx={6} ry={9} fill={c.skinD} />
        </>
      )}
      {face()}
      {hairFront()}
      {side ? (
        arm(AL, false)
      ) : (
        <>
          {arm(AL, false)}
          {arm(AR, false)}
        </>
      )}
      {hold?.({L: AL.w, R: AR.w})}
    </g>
  );
};
