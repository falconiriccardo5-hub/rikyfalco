import React from "react";

export type WomanView = "front" | "side";
export type WomanFace = "smile" | "worried" | "talk" | "shock" | "flex" | "proud";

export type ArmPose = {
  /** Upper arm angle from straight down, degrees. Front: positive = away from body. Side: positive = forward. */
  readonly upper: number;
  /** Elbow flexion relative to the upper arm, degrees (negative bends the forearm up/inward). */
  readonly fore: number;
};

export type WomanProps = {
  readonly view: WomanView;
  /** Screen-left arm (front) / far arm (side) */
  readonly armL?: ArmPose;
  /** Screen-right arm (front) / near arm (side) */
  readonly armR?: ArmPose;
  readonly dumbbellL?: boolean;
  readonly dumbbellR?: boolean;
  /** Size multiplier of the dumbbell plates (1 = normal, 0.7 = small pink one) */
  readonly dumbbellScale?: number;
  readonly dumbbellColor?: string;
  /** 0..1 caricature bodybuilder transformation */
  readonly bulk?: number;
  /** 0..1 realistic toning (weeks of training) */
  readonly tone?: number;
  readonly face?: WomanFace;
  readonly talk?: number;
  readonly blink?: boolean;
  /** Ponytail swing in degrees */
  readonly swing?: number;
  readonly lean?: number;
};

export const W_COLORS = {
  line: "#111111",
  skin: "#FFFFFF",
  skinShade: "#ECECEC",
  hair: "#5A3420",
  hairShade: "#7A4A30",
  top: "#FF6B6B",
  topShade: "#E24E57",
  leggings: "#23232B",
  leggingsShade: "#3A3A46",
  shoe: "#FFFFFF",
  accent: "#FF6B6B",
  blush: "#FFB3B3",
  dumbbell: "#2A2A2A",
  dumbbellLight: "#6E6E6E",
  pink: "#FF8FB8",
};

const C = W_COLORS;
const LW = 4.5;
const UPPER = 92;
const FORE = 86;
const deg = (d: number) => (d * Math.PI) / 180;
type Pt = { x: number; y: number };

const Limb: React.FC<{ from: Pt; to: Pt; width: number; color?: string }> = ({
  from,
  to,
  width,
  color = C.skin,
}) => (
  <>
    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={C.line} strokeWidth={width + LW * 2} strokeLinecap="round" />
    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
  </>
);

/** Arm geometry in the 400x800 viewBox. s = -1 screen-left, +1 screen-right (front view). */
export const womanArm = (view: WomanView, s: -1 | 1, pose: ArmPose, shoulder: Pt) => {
  const dirX = view === "side" ? 1 : s;
  const u = { x: dirX * Math.sin(deg(pose.upper)), y: Math.cos(deg(pose.upper)) };
  // side view: negative `fore` bends the forearm forward/up (like a curl)
  const fa = view === "side" ? pose.upper - pose.fore : pose.upper + pose.fore;
  const f = { x: dirX * Math.sin(deg(fa)), y: Math.cos(deg(fa)) };
  const elbow = { x: shoulder.x + u.x * UPPER, y: shoulder.y + u.y * UPPER };
  const hand = { x: elbow.x + f.x * FORE, y: elbow.y + f.y * FORE };
  return { elbow, hand };
};

export const womanShoulder = (view: WomanView, s: -1 | 1, bulk = 0, tone = 0): Pt =>
  view === "side"
    ? { x: s === 1 ? 206 : 196, y: 286 - bulk * 10 }
    : { x: 200 + s * (56 + 46 * bulk + 5 * tone), y: 286 - bulk * 10 };

const Dumbbell: React.FC<{ at: Pt; view: WomanView; scale: number; color: string; angle?: number }> = ({
  at,
  view,
  scale,
  color,
  angle = 0,
}) => {
  if (view === "side") {
    return (
      <g transform={`rotate(${angle} ${at.x} ${at.y})`}>
        <Limb from={{ x: at.x - 30 * scale, y: at.y }} to={{ x: at.x + 30 * scale, y: at.y }} width={5} color={C.dumbbellLight} />
        {[-1, 1].map((k) => (
          <rect
            key={k}
            x={at.x + k * 28 * scale - 9 * scale}
            y={at.y - 20 * scale}
            width={18 * scale}
            height={40 * scale}
            rx={5}
            fill={color}
            stroke={C.line}
            strokeWidth={LW}
          />
        ))}
      </g>
    );
  }
  const r = 20 * scale;
  const pts = Array.from({ length: 6 })
    .map((_, i) => `${at.x + r * Math.cos(deg(60 * i))},${at.y + 3 + r * Math.sin(deg(60 * i))}`)
    .join(" ");
  return (
    <g>
      <polygon points={pts} fill={color} stroke={C.line} strokeWidth={LW} strokeLinejoin="round" />
      <circle cx={at.x} cy={at.y + 3} r={7 * scale} fill="#ffffff" opacity={0.35} />
    </g>
  );
};

const Arm: React.FC<{
  view: WomanView;
  s: -1 | 1;
  pose: ArmPose;
  shoulder: Pt;
  bulk: number;
  tone: number;
  far?: boolean;
  dumbbell: boolean;
  dScale: number;
  dColor: string;
}> = ({ view, s, pose, shoulder, bulk, tone, far, dumbbell, dScale, dColor }) => {
  const { elbow, hand } = womanArm(view, s, pose, shoulder);
  const wU = 15 + tone * 7 + bulk * 46;
  const wF = 14 + tone * 4 + bulk * 30;
  const skin = far ? C.skinShade : C.skin;
  // biceps bulge for the caricature
  const mid = { x: (shoulder.x + elbow.x) / 2, y: (shoulder.y + elbow.y) / 2 };
  const ang = (Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x) * 180) / Math.PI;
  const flexed = Math.abs(pose.fore) > 60;
  return (
    <g>
      {/* outlines first, then fills: seamless elbow */}
      <line x1={elbow.x} y1={elbow.y} x2={hand.x} y2={hand.y} stroke={C.line} strokeWidth={wF + LW * 2} strokeLinecap="round" />
      <line x1={shoulder.x} y1={shoulder.y} x2={elbow.x} y2={elbow.y} stroke={C.line} strokeWidth={wU + LW * 2} strokeLinecap="round" />
      <line x1={elbow.x} y1={elbow.y} x2={hand.x} y2={hand.y} stroke={skin} strokeWidth={wF} strokeLinecap="round" />
      <line x1={shoulder.x} y1={shoulder.y} x2={elbow.x} y2={elbow.y} stroke={skin} strokeWidth={wU} strokeLinecap="round" />
      {bulk > 0.15
        ? (() => {
            // biceps peak: pushed toward the forearm side of the upper arm
            const ux = (elbow.x - shoulder.x) / UPPER;
            const uy = (elbow.y - shoulder.y) / UPPER;
            const fx = hand.x - elbow.x;
            const fy = hand.y - elbow.y;
            const side = Math.sign(-uy * fx + ux * fy) || 1;
            const nx = -uy * side;
            const ny = ux * side;
            const peak = wU * (flexed ? 0.42 : 0.18);
            const cx = mid.x + nx * peak;
            const cy = mid.y + ny * peak;
            return (
              <g opacity={Math.min(1, (bulk - 0.15) * 3)}>
                <ellipse cx={cx} cy={cy} rx={UPPER * 0.42} ry={wU * 0.55} transform={`rotate(${ang} ${cx} ${cy})`} fill={skin} stroke={C.line} strokeWidth={LW} />
                <path
                  d={`M ${hand.x * 0.4 + elbow.x * 0.6} ${hand.y * 0.4 + elbow.y * 0.6} q 8 -10 0 -18 q -6 -8 4 -16`}
                  stroke={C.line}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            );
          })()
        : null}
      {/* deltoid cap (caricature only) */}
      {bulk > 0.05 ? (
        <>
          <circle cx={shoulder.x} cy={shoulder.y} r={(wU + LW * 2) / 2 + bulk * 2} fill={C.line} />
          <circle cx={shoulder.x} cy={shoulder.y} r={wU / 2 + bulk * 2} fill={skin} />
        </>
      ) : null}
      {tone > 0.2 && bulk < 0.1 ? (
        <path
          d={`M ${(shoulder.x * 0.7 + elbow.x * 0.3)} ${(shoulder.y * 0.7 + elbow.y * 0.3)} L ${(shoulder.x * 0.35 + elbow.x * 0.65)} ${(shoulder.y * 0.35 + elbow.y * 0.65)}`}
          stroke={C.line}
          strokeWidth={2.5}
          opacity={Math.min(1, tone * 1.3)}
          strokeLinecap="round"
          transform={`translate(${s * 3} 0)`}
        />
      ) : null}
      {dumbbell && view === "side" ? <Dumbbell at={hand} view={view} scale={dScale} color={dColor} /> : null}
      <circle cx={hand.x} cy={hand.y} r={10 + bulk * 8} fill={skin} stroke={C.line} strokeWidth={LW} />
      {dumbbell && view !== "side" ? <Dumbbell at={hand} view={view} scale={dScale} color={dColor} /> : null}
    </g>
  );
};

/* ---------------- face ---------------- */

const Eye: React.FC<{ x: number; y: number; blink: boolean; outer: -1 | 1; wide?: boolean }> = ({
  x,
  y,
  blink,
  outer,
  wide,
}) =>
  blink ? (
    <path d={`M ${x - 10} ${y + 2} Q ${x} ${y + 9} ${x + 10} ${y + 2}`} stroke={C.line} strokeWidth={4.5} fill="none" strokeLinecap="round" />
  ) : (
    <g>
      <ellipse cx={x} cy={y} rx={wide ? 11 : 10} ry={wide ? 15 : 13.5} fill={C.line} />
      <circle cx={x + 3.5} cy={y - 5} r={3.4} fill="#fff" />
      {/* lashes */}
      <path
        d={`M ${x + outer * 8} ${y - 10} l ${outer * 7} -6 M ${x + outer * 10} ${y - 4} l ${outer * 8} -2`}
        stroke={C.line}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );

const Brows: React.FC<{ face: WomanFace; xs: number[]; y: number }> = ({ face, xs, y }) => (
  <>
    {xs.map((x, i) => {
      const s = i === 0 ? -1 : 1; // -1 left brow
      let d = `M ${x - 11} ${y + 2} Q ${x} ${y - 7} ${x + 11} ${y + 1}`;
      // x - s*11 is the inner end of the brow
      if (face === "worried") d = `M ${x - s * 11} ${y - 8} Q ${x} ${y - 6} ${x + s * 11} ${y + 3}`;
      if (face === "flex") d = `M ${x - s * 11} ${y + 4} L ${x + s * 11} ${y - 7}`;
      if (face === "shock") d = `M ${x - 11} ${y - 4} Q ${x} ${y - 14} ${x + 11} ${y - 5}`;
      return <path key={x} d={d} stroke={C.line} strokeWidth={3.6} fill="none" strokeLinecap="round" />;
    })}
  </>
);

const Mouth: React.FC<{ face: WomanFace; talk: number; cx: number; y: number; w: number }> = ({ face, talk, cx, y, w }) => {
  if (face === "worried")
    return <path d={`M ${cx - w} ${y + 4} q ${w / 2} -7 ${w} 0 q ${w / 2} 7 ${w} 0`} stroke={C.line} strokeWidth={4} fill="none" strokeLinecap="round" />;
  if (face === "shock") return <ellipse cx={cx} cy={y + 4} rx={w * 0.45} ry={w * 0.6} fill="#5B1F1F" stroke={C.line} strokeWidth={4} />;
  if (face === "flex")
    return (
      <g>
        <path d={`M ${cx - w} ${y - 2} Q ${cx} ${y + 18} ${cx + w} ${y - 2} Z`} fill="#fff" stroke={C.line} strokeWidth={4} strokeLinejoin="round" />
        <path d={`M ${cx - w * 0.8} ${y + 2} L ${cx + w * 0.8} ${y + 2}`} stroke={C.line} strokeWidth={2} />
      </g>
    );
  if (face === "talk") {
    const o = talk;
    return (
      <path
        d={`M ${cx - w} ${y} Q ${cx} ${y + 4 + o * 16} ${cx + w} ${y} Q ${cx} ${y + 2 + o * 4} ${cx - w} ${y} Z`}
        fill="#5B1F1F"
        stroke={C.line}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    );
  }
  const big = face === "proud";
  return <path d={`M ${cx - w} ${y} Q ${cx} ${y + (big ? 16 : 11)} ${cx + w} ${y - 2}`} stroke={C.line} strokeWidth={4} fill="none" strokeLinecap="round" />;
};

const HEAD = "M 200 74 C 250 74 274 112 274 156 C 274 204 244 232 200 232 C 156 232 126 204 126 156 C 126 112 150 74 200 74 Z";

const HeadFront: React.FC<{ p: WomanProps }> = ({ p }) => {
  const face = p.face ?? "smile";
  const swing = p.swing ?? 0;
  return (
    <g>
      {/* high ponytail behind the head */}
      <g transform={`rotate(${swing} 236 84)`}>
        <path
          d="M 226 84 C 268 52 318 74 314 128 C 312 176 298 214 284 252 C 282 214 284 178 270 150 C 262 128 248 110 226 104 Z"
          fill={C.hair}
          stroke={C.line}
          strokeWidth={LW}
          strokeLinejoin="round"
        />
        <path d="M 288 96 C 300 130 298 170 288 210" stroke={C.hairShade} strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx={132} cy={168} rx={12} ry={16} fill={C.skin} stroke={C.line} strokeWidth={LW} />
      <ellipse cx={268} cy={168} rx={12} ry={16} fill={C.skin} stroke={C.line} strokeWidth={LW} />
      <path d={HEAD} fill={C.skin} stroke={C.line} strokeWidth={LW} />
      {/* hair cap pulled back with a side-swept fringe */}
      <path
        d="M 128 166 C 116 112 150 66 204 66 C 258 66 288 108 274 160 C 268 128 254 110 236 102 C 214 120 178 126 150 120 C 140 132 132 148 128 166 Z"
        fill={C.hair}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <path d="M 160 92 C 186 80 214 78 240 86 M 172 112 C 196 106 218 98 234 88" stroke={C.hairShade} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* hair tie */}
      <rect x={224} y={76} width={16} height={22} rx={6} fill={C.accent} stroke={C.line} strokeWidth={3.5} transform="rotate(-30 232 87)" />
      <Brows face={face} xs={[176, 224]} y={142} />
      <Eye x={176} y={168} blink={Boolean(p.blink)} outer={-1} wide={face === "shock"} />
      <Eye x={224} y={168} blink={Boolean(p.blink)} outer={1} wide={face === "shock"} />
      <circle cx={156} cy={192} r={11} fill={C.blush} opacity={0.6} />
      <circle cx={244} cy={192} r={11} fill={C.blush} opacity={0.6} />
      <Mouth face={face} talk={p.talk ?? 0} cx={202} y={200} w={15} />
    </g>
  );
};

const HeadSide: React.FC<{ p: WomanProps }> = ({ p }) => {
  const face = p.face ?? "smile";
  const swing = p.swing ?? 0;
  return (
    <g>
      <g transform={`rotate(${swing} 150 96)`}>
        <path
          d="M 160 96 C 112 70 70 104 80 160 C 88 204 108 236 126 268 C 122 228 120 192 132 166 C 140 146 152 130 168 120 Z"
          fill={C.hair}
          stroke={C.line}
          strokeWidth={LW}
          strokeLinejoin="round"
        />
        <path d="M 100 110 C 92 146 100 186 114 220" stroke={C.hairShade} strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
      <path
        d="M 196 74 C 246 74 272 108 274 150 C 282 160 280 170 274 176 C 270 208 244 232 204 232 C 162 232 132 204 132 158 C 132 110 152 74 196 74 Z"
        fill={C.skin}
        stroke={C.line}
        strokeWidth={LW}
      />
      <path
        d="M 136 176 C 122 120 150 68 204 68 C 248 68 276 100 276 136 C 262 116 244 108 226 112 C 212 104 196 108 188 120 C 176 132 172 150 176 168 C 160 160 146 166 136 176 Z"
        fill={C.hair}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <rect x={146} y={86} width={16} height={22} rx={6} fill={C.accent} stroke={C.line} strokeWidth={3.5} transform="rotate(20 154 97)" />
      <ellipse cx={190} cy={176} rx={11} ry={15} fill={C.skin} stroke={C.line} strokeWidth={LW} />
      <Brows face={face} xs={[244]} y={140} />
      <Eye x={244} y={166} blink={Boolean(p.blink)} outer={1} />
      <circle cx={236} cy={192} r={10} fill={C.blush} opacity={0.6} />
      <Mouth face={face} talk={p.talk ?? 0} cx={256} y={204} w={10} />
    </g>
  );
};

/* ---------------- body ---------------- */

const Sneaker: React.FC<{ cx: number }> = ({ cx }) => (
  <g>
    <path
      d={`M ${cx - 28} 778 Q ${cx - 32} 750 ${cx - 12} 740 L ${cx + 12} 740 Q ${cx + 32} 750 ${cx + 28} 778 Z`}
      fill={C.shoe}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path d={`M ${cx - 29} 766 L ${cx + 29} 766`} stroke={C.accent} strokeWidth={5} />
  </g>
);

const SideSneaker: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <path
      d={`M ${x} 744 L ${x + 38} 742 Q ${x + 54} 748 ${x + 64} 756 Q ${x + 84} 760 ${x + 84} 778 L ${x - 4} 778 Q ${x - 8} 760 ${x} 744 Z`}
      fill={C.shoe}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path d={`M ${x - 6} 768 L ${x + 84} 768`} stroke={C.accent} strokeWidth={5} />
  </g>
);

export const Woman: React.FC<WomanProps> = (p) => {
  const {
    view,
    armL = { upper: 12, fore: -6 },
    armR = { upper: 12, fore: -6 },
    dumbbellL = false,
    dumbbellR = false,
    dumbbellScale = 1,
    dumbbellColor = C.dumbbell,
    bulk = 0,
    tone = 0,
    lean = 0,
  } = p;
  const legW = 20 + tone * 3 + bulk * 34;
  const torsoScale = 1 + bulk * 0.75;
  const ns = { vectorEffect: "non-scaling-stroke" as const };

  const arm = (s: -1 | 1, far?: boolean) => (
    <Arm
      key={s}
      view={view}
      s={s}
      pose={s === -1 ? armL : armR}
      shoulder={womanShoulder(view, s, bulk, tone)}
      bulk={bulk}
      tone={tone}
      far={far}
      dumbbell={s === -1 ? dumbbellL : dumbbellR}
      dScale={dumbbellScale}
      dColor={dumbbellColor}
    />
  );

  const body =
    view === "side" ? (
      <>
        {arm(-1, true)}
        <Limb from={{ x: 194, y: 470 }} to={{ x: 190, y: 744 }} width={legW} color={C.leggingsShade} />
        <Limb from={{ x: 208, y: 470 }} to={{ x: 208, y: 744 }} width={legW} color={C.leggings} />
        <SideSneaker x={168} />
        <SideSneaker x={184} />
        <g transform={`translate(200 0) scale(${torsoScale} 1) translate(-200 0)`}>
          <Limb from={{ x: 202, y: 222 }} to={{ x: 202, y: 282 }} width={17 + bulk * 20} />
          <path d="M 168 440 L 238 440 Q 248 470 240 500 L 166 500 Q 158 470 168 440 Z" fill={C.leggings} stroke={C.line} strokeWidth={LW} {...ns} />
          <path
            d="M 180 270 Q 206 262 228 272 Q 250 300 244 340 Q 236 390 240 450 Q 204 460 166 450 Q 170 390 166 340 Q 162 296 180 270 Z"
            fill={C.top}
            stroke={C.line}
            strokeWidth={LW}
            strokeLinejoin="round"
            {...ns}
          />
        </g>
        <HeadSide p={p} />
        {arm(1)}
      </>
    ) : (
      <>
        <Limb from={{ x: 176, y: 470 }} to={{ x: 168 - bulk * 16, y: 744 }} width={legW} color={C.leggings} />
        <Limb from={{ x: 224, y: 470 }} to={{ x: 232 + bulk * 16, y: 744 }} width={legW} color={C.leggings} />
        {tone > 0.2 && bulk < 0.1
          ? [-1, 1].map((k) => (
              <path
                key={k}
                d={`M ${200 + k * 20} 540 q ${k * 6} 30 ${k * 2} 60`}
                stroke={C.leggingsShade}
                strokeWidth={3}
                fill="none"
                opacity={tone}
                strokeLinecap="round"
              />
            ))
          : null}
        <Sneaker cx={166 - bulk * 16} />
        <Sneaker cx={234 + bulk * 16} />
        <g transform={`translate(200 0) scale(${torsoScale} 1) translate(-200 0)`}>
          <Limb from={{ x: 200, y: 222 }} to={{ x: 200, y: 282 }} width={17 + bulk * 26} />
          {/* hips / leggings waistband */}
          <path d="M 146 440 L 254 440 Q 268 480 256 520 L 144 520 Q 132 480 146 440 Z" fill={C.leggings} stroke={C.line} strokeWidth={LW} {...ns} />
          <path d="M 144 452 L 256 452" stroke={C.leggingsShade} strokeWidth={4} {...ns} />
          {/* traps for the caricature */}
          {bulk > 0.1 ? (
            <path
              d={`M 150 292 Q 176 ${262 - bulk * 40} 196 254 L 204 254 Q 224 ${262 - bulk * 40} 250 292 Z`}
              fill={C.skin}
              stroke={C.line}
              strokeWidth={LW}
              {...ns}
            />
          ) : null}
          {/* tank top */}
          <path
            d="M 164 280 L 176 270 Q 200 296 224 270 L 236 280 Q 258 304 252 344 Q 244 396 252 450 Q 200 462 148 450 Q 156 396 148 344 Q 142 304 164 280 Z"
            fill={C.top}
            stroke={C.line}
            strokeWidth={LW}
            strokeLinejoin="round"
            {...ns}
          />
          <path d="M 176 270 L 172 290 M 224 270 L 228 290" stroke={C.topShade} strokeWidth={5} strokeLinecap="round" {...ns} />
          {bulk > 0.3 ? (
            <path d="M 178 360 L 222 360 M 180 392 L 220 392 M 200 330 L 200 440" stroke={C.topShade} strokeWidth={4} opacity={bulk} {...ns} />
          ) : null}
        </g>
        <HeadFront p={p} />
        {arm(-1)}
        {arm(1)}
      </>
    );

  return (
    <svg viewBox="0 0 400 800" width="100%" height="100%" style={{ overflow: "visible" }}>
      <ellipse cx={200} cy={780} rx={110 + bulk * 40} ry={13} fill="#000" opacity={0.1} />
      <g transform={`rotate(${-lean} 200 770)`}>{body}</g>
    </svg>
  );
};
