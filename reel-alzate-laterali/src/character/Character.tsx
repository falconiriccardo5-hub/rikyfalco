import React from "react";

export type View = "front" | "side" | "back";

export type CharacterProps = {
  readonly view: View;
  /** Arm elevation in degrees: 0 = arms down, 90 = arms horizontal */
  readonly armAngle?: number;
  /** Override for the arm on screen-left (front) / far arm (side) */
  readonly armAngleL?: number;
  /** Override for the arm on screen-right (front) / near arm (side) */
  readonly armAngleR?: number;
  /** Plane of elevation in degrees: 0 = frontal plane, 30 = scapular plane */
  readonly armPlane?: number;
  /** 0..1 how much the shoulders are shrugged (wrong execution) */
  readonly shrug?: number;
  /** Torso lean in degrees (positive = leaning back) */
  readonly lean?: number;
  readonly dumbbells?: boolean;
  readonly mouth?: "smile" | "talk" | "open" | "pain";
  /** 0..1 open amount when mouth = talk */
  readonly talk?: number;
  readonly blink?: boolean;
  /** 0..1 red highlight on the shoulder (rotator cuff) */
  readonly shoulderAlert?: number;
  readonly hairColor?: string;
};

export const COLORS = {
  line: "#111111",
  skin: "#FFFFFF",
  skinShade: "#ECECEC",
  shirt: "#141414",
  shirtFold: "#3A3A3A",
  denim: "#4F78AE",
  denimShade: "#3E6396",
  denimStitch: "#9DBBE0",
  shoe: "#FFFFFF",
  sole: "#E9E9E9",
  dumbbell: "#2A2A2A",
  dumbbellLight: "#6E6E6E",
  paper: "#F6F4EF",
};

const C = COLORS;
const LW = 4.5;
const UPPER = 98;
const FORE = 90;

const deg = (d: number) => (d * Math.PI) / 180;

type Pt = { x: number; y: number };

/**
 * Projects the 3D arm direction onto the screen for a given view.
 * side: -1 = arm that appears on screen-left in front view, +1 = screen-right
 */
const projectArm = (
  theta: number,
  plane: number,
  view: View,
  side: -1 | 1,
): Pt => {
  const lateral = Math.sin(deg(theta)) * Math.cos(deg(plane));
  const forward = Math.sin(deg(theta)) * Math.sin(deg(plane));
  const down = Math.cos(deg(theta));
  if (view === "side") return { x: forward, y: down };
  return { x: side * lateral, y: down };
};

const armGeometry = (shoulder: Pt, dir: Pt, bendSign: number) => {
  const elbow = { x: shoulder.x + dir.x * UPPER, y: shoulder.y + dir.y * UPPER };
  const bend = deg(8 * bendSign);
  const fx = dir.x * Math.cos(bend) - dir.y * Math.sin(bend);
  const fy = dir.x * Math.sin(bend) + dir.y * Math.cos(bend);
  const hand = { x: elbow.x + fx * FORE, y: elbow.y + fy * FORE };
  return { elbow, hand };
};

const shoulderPos = (view: View, side: -1 | 1, shrug: number): Pt => {
  const y = 276 - shrug * 18;
  if (view === "side") return { x: side === 1 ? 204 : 196, y };
  return { x: 200 + side * 60, y };
};

/** Shoulder and hand positions in the 400x800 character viewBox (before lean). */
export const armPoints = (
  view: View,
  side: -1 | 1,
  angle: number,
  plane = 30,
  shrug = 0,
) => {
  const shoulder = shoulderPos(view, side, shrug);
  const { hand, elbow } = armGeometry(
    shoulder,
    projectArm(angle, plane, view, side),
    view === "side" ? -1 : -side,
  );
  return { shoulder, elbow, hand };
};

const Limb: React.FC<{ from: Pt; to: Pt; width: number; color?: string }> = ({
  from,
  to,
  width,
  color = C.skin,
}) => (
  <>
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={C.line}
      strokeWidth={width + LW * 2}
      strokeLinecap="round"
    />
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  </>
);

const hexPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 })
    .map((_, i) => {
      const a = deg(60 * i);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    })
    .join(" ");

/* ---------------- arm ---------------- */

const Arm: React.FC<{
  shoulder: Pt;
  dir: Pt;
  bendSign: number;
  view: View;
  dumbbells: boolean;
  far?: boolean;
}> = ({ shoulder, dir, bendSign, view, dumbbells, far }) => {
  const len = Math.hypot(dir.x, dir.y);
  // unit direction used for sleeve orientation (fallback: pointing at camera)
  const u = len > 0.05 ? { x: dir.x / len, y: dir.y / len } : { x: 0, y: 1 };
  const n = { x: -u.y, y: u.x };
  const { elbow, hand } = armGeometry(shoulder, dir, bendSign);

  // oversized sleeve with a rounded shoulder cap
  const outSign = n.x * (shoulder.x - 200) + n.y * (shoulder.y - 400) >= 0 ? 1 : -1;
  const no = { x: n.x * outSign, y: n.y * outSign };
  const sl = Math.max(len, 0.4) * 60;
  const s1 = { x: shoulder.x + u.x * sl, y: shoulder.y + u.y * sl };
  const at = (b: Pt, k: number, j: number) => `${b.x + no.x * k + u.x * j},${b.y + no.y * k + u.y * j}`;
  const sleeve = `M ${at(shoulder, -22, 16)} Q ${at(shoulder, -4, -26)} ${at(shoulder, 24, -2)} L ${at(s1, 25, 0)} Q ${at(s1, 0, 5)} ${at(s1, -22, 0)} Z`;

  const skin = far ? C.skinShade : C.skin;

  const dumbbell = !dumbbells ? null : view === "side" ? (
    <g>
      <Limb
        from={{ x: hand.x - 36, y: hand.y }}
        to={{ x: hand.x + 36, y: hand.y }}
        width={6}
        color={C.dumbbellLight}
      />
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={hand.x + s * 33 - 10}
          y={hand.y - 22}
          width={20}
          height={44}
          rx={5}
          fill={C.dumbbell}
          stroke={C.line}
          strokeWidth={LW}
        />
      ))}
    </g>
  ) : (
    <g>
      <polygon
        points={hexPoints(hand.x, hand.y + 3, 22)}
        fill={C.dumbbell}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <circle cx={hand.x} cy={hand.y + 3} r={8} fill={C.dumbbellLight} />
    </g>
  );

  return (
    <g>
      <Limb from={elbow} to={hand} width={15} color={skin} />
      <Limb from={shoulder} to={elbow} width={16} color={skin} />
      <path
        d={sleeve}
        fill={C.shirt}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      {view === "side" ? dumbbell : null}
      <circle cx={hand.x} cy={hand.y} r={11} fill={skin} stroke={C.line} strokeWidth={LW} />
      {view !== "side" ? dumbbell : null}
    </g>
  );
};

/* ---------------- face parts ---------------- */

const Eye: React.FC<{ x: number; y: number; blink: boolean }> = ({ x, y, blink }) =>
  blink ? (
    <path
      d={`M ${x - 11} ${y + 2} Q ${x} ${y + 9} ${x + 11} ${y + 2}`}
      stroke={C.line}
      strokeWidth={4.5}
      fill="none"
      strokeLinecap="round"
    />
  ) : (
    <g>
      <ellipse cx={x} cy={y} rx={10.5} ry={14.5} fill={C.line} />
      <circle cx={x + 3.5} cy={y - 5} r={3.6} fill="#fff" />
    </g>
  );

const mouthPath = (
  mouth: CharacterProps["mouth"],
  talk: number,
  cx: number,
  y: number,
  w: number,
) => {
  if (mouth === "pain")
    return `M ${cx - w} ${y + 6} Q ${cx - w / 2} ${y - 2} ${cx} ${y + 4} Q ${cx + w / 2} ${y + 10} ${cx + w} ${y + 2}`;
  if (mouth === "open" || mouth === "talk") {
    const o = mouth === "open" ? 1 : talk;
    return `M ${cx - w} ${y} Q ${cx} ${y + 4 + o * 18} ${cx + w} ${y} Q ${cx} ${y + 2 + o * 4} ${cx - w} ${y} Z`;
  }
  return `M ${cx - w} ${y} Q ${cx + 2} ${y + 13} ${cx + w} ${y - 4}`;
};

const Mouth: React.FC<{ props: CharacterProps; cx: number; y: number; w: number }> = ({
  props,
  cx,
  y,
  w,
}) => {
  const filled = props.mouth === "talk" || props.mouth === "open";
  return (
    <path
      d={mouthPath(props.mouth, props.talk ?? 0, cx, y, w)}
      stroke={C.line}
      strokeWidth={4}
      fill={filled ? "#5B1F1F" : "none"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

const Ear: React.FC<{ x: number; y: number; flip?: boolean }> = ({ x, y, flip }) => (
  <g>
    <ellipse cx={x} cy={y} rx={15} ry={19} fill={C.skin} stroke={C.line} strokeWidth={LW} />
    <path
      d={flip ? `M ${x + 5} ${y - 8} Q ${x - 6} ${y} ${x + 4} ${y + 9}` : `M ${x - 5} ${y - 8} Q ${x + 6} ${y} ${x - 4} ${y + 9}`}
      stroke={C.line}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

const HAIR_STRANDS = "#4A4A4A";

/* ---------------- heads ---------------- */

const HEAD = "M 200 72 C 252 72 276 110 276 156 C 276 206 244 236 200 236 C 156 236 124 206 124 156 C 124 110 148 72 200 72 Z";

const HeadFront: React.FC<{ props: CharacterProps; hair: string }> = ({ props, hair }) => (
  <g>
    <Ear x={126} y={170} />
    <Ear x={274} y={170} flip />
    <path d={HEAD} fill={C.skin} stroke={C.line} strokeWidth={LW} />
    {/* messy hair, fringe swept to the left */}
    <path
      d="M 134 186 C 116 152 114 124 122 104 L 100 110 C 110 90 122 78 138 70 L 126 52 C 148 50 160 48 172 52 C 186 34 208 28 228 32 L 236 14 C 246 28 252 34 258 42 L 282 38 C 278 52 280 62 284 72 L 300 82 C 290 92 286 104 280 120 L 278 140 C 272 116 262 100 248 94 C 236 100 222 102 210 96 C 198 114 178 124 156 122 C 150 136 140 160 134 186 Z"
      fill={hair}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path
      d="M 150 92 C 168 80 190 74 212 70 M 168 108 C 186 100 200 90 210 76 M 236 56 C 248 64 258 74 264 90 M 136 120 C 140 104 146 94 156 86"
      stroke={HAIR_STRANDS}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
    {/* brows */}
    <path
      d="M 164 146 Q 176 134 190 142 M 214 140 Q 228 132 240 144"
      stroke={C.line}
      strokeWidth={4}
      fill="none"
      strokeLinecap="round"
    />
    <Eye x={178} y={170} blink={Boolean(props.blink)} />
    <Eye x={226} y={170} blink={Boolean(props.blink)} />
    <Mouth props={props} cx={206} y={202} w={18} />
  </g>
);

const HeadBack: React.FC<{ hair: string }> = ({ hair }) => (
  <g>
    <Ear x={126} y={170} flip />
    <Ear x={274} y={170} />
    <path d={HEAD} fill={C.skin} stroke={C.line} strokeWidth={LW} />
    <path
      d="M 128 186 C 114 152 114 124 122 104 L 100 110 C 110 90 122 78 138 70 L 126 52 C 148 50 160 48 172 52 C 186 34 208 28 228 32 L 236 14 C 246 28 252 34 258 42 L 282 38 C 278 52 280 62 284 72 L 300 82 C 290 92 286 104 280 120 C 282 150 278 176 268 196 Q 250 204 236 198 Q 220 210 202 204 Q 184 210 168 200 Q 150 206 140 194 Z"
      fill={hair}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path
      d="M 160 100 C 180 120 190 150 186 180 M 214 92 C 226 120 230 150 222 184 M 250 100 C 258 126 260 150 252 178 M 142 130 C 150 150 154 168 150 188"
      stroke={HAIR_STRANDS}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

const HeadSide: React.FC<{ props: CharacterProps; hair: string }> = ({ props, hair }) => (
  <g>
    <path
      d="M 196 72 C 248 72 276 108 278 150 C 286 160 284 170 278 176 C 274 210 246 236 204 236 C 160 236 128 206 128 158 C 128 110 150 72 196 72 Z"
      fill={C.skin}
      stroke={C.line}
      strokeWidth={LW}
    />
    <path
      d="M 132 196 C 116 168 114 128 130 100 L 110 96 C 124 82 138 74 152 70 L 146 50 C 166 50 178 50 188 54 C 204 36 226 32 246 38 L 256 22 C 262 36 266 44 270 54 L 292 58 C 284 70 282 80 282 92 C 270 88 258 92 248 102 C 236 98 222 104 214 116 C 202 122 196 136 196 152 C 184 144 170 150 166 166 C 160 184 150 194 132 196 Z"
      fill={hair}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path
      d="M 150 96 C 172 82 200 72 228 66 M 140 130 C 150 112 164 100 182 92 M 154 170 C 160 150 168 136 180 126"
      stroke={HAIR_STRANDS}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
    <Ear x={188} y={174} />
    <path d="M 232 140 Q 244 132 256 140" stroke={C.line} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Eye x={244} y={166} blink={Boolean(props.blink)} />
    <Mouth props={props} cx={254} y={204} w={12} />
  </g>
);

/* ---------------- body ---------------- */

const Sneaker: React.FC<{ cx: number; front: boolean }> = ({ cx, front }) => (
  <g>
    <path
      d={`M ${cx - 32} 778 Q ${cx - 36} 748 ${cx - 14} 738 L ${cx + 14} 738 Q ${cx + 36} 748 ${cx + 32} 778 Z`}
      fill={C.shoe}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path d={`M ${cx - 33} 766 L ${cx + 33} 766`} stroke={C.line} strokeWidth={3} />
    {front ? (
      <>
        <path d={`M ${cx - 22} 766 Q ${cx} 752 ${cx + 22} 766`} stroke={C.line} strokeWidth={3} fill="none" />
        <path
          d={`M ${cx - 8} 744 L ${cx + 8} 750 M ${cx + 8} 744 L ${cx - 8} 750`}
          stroke={C.line}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </>
    ) : null}
  </g>
);

const Shorts: React.FC = () => (
  <g>
    <path
      d="M 138 452 L 262 452 L 276 596 L 210 600 L 200 520 L 190 600 L 124 596 Z"
      fill={C.denim}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    {/* rolled cuffs */}
    {[
      "M 122 588 L 192 592 L 192 614 L 120 610 Z",
      "M 208 592 L 278 588 L 280 610 L 208 614 Z",
    ].map((d) => (
      <path key={d} d={d} fill={C.denimShade} stroke={C.line} strokeWidth={LW} strokeLinejoin="round" />
    ))}
    <path
      d="M 200 462 L 200 520 M 154 466 Q 166 490 180 478 M 246 466 Q 234 490 220 478"
      stroke={C.denimStitch}
      strokeWidth={2.5}
      strokeDasharray="5 5"
      fill="none"
    />
  </g>
);

const TorsoFront: React.FC<{ view: View; shrug: number }> = ({ view, shrug }) => {
  const sy = 262 - shrug * 18;
  return (
    <g>
      {/* thin neck */}
      <Limb from={{ x: 200, y: 226 }} to={{ x: 200, y: sy + 4 }} width={18} />
      <Shorts />
      {/* oversized black tee */}
      <path
        d={`M 178 ${sy - 4} Q 200 ${sy + 6} 222 ${sy - 4} L 262 ${sy + 4} Q 276 ${sy + 12} 272 ${sy + 34} L 266 470 Q 232 482 200 474 Q 168 482 134 470 L 128 ${sy + 34} Q 124 ${sy + 12} 138 ${sy + 4} Z`}
        fill={C.shirt}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      {view === "front" ? (
        <path
          d={`M 180 ${sy - 2} Q 200 ${sy + 12} 220 ${sy - 2}`}
          stroke={C.shirtFold}
          strokeWidth={3}
          fill="none"
        />
      ) : null}
      <path
        d={
          view === "front"
            ? "M 160 400 Q 176 430 168 462 M 236 380 Q 246 420 240 460"
            : `M 166 ${sy + 40} Q 178 ${sy + 76} 190 ${sy + 92} M 234 ${sy + 40} Q 222 ${sy + 76} 210 ${sy + 92}`
        }
        stroke={C.shirtFold}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

const TorsoSide: React.FC<{ shrug: number }> = ({ shrug }) => {
  const sy = 262 - shrug * 18;
  return (
    <g>
      <Limb from={{ x: 202, y: 226 }} to={{ x: 202, y: sy + 4 }} width={18} />
      <path
        d="M 160 452 L 246 452 L 252 596 L 156 596 Z"
        fill={C.denim}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <path
        d="M 154 588 L 254 588 L 256 612 L 152 612 Z"
        fill={C.denimShade}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <path
        d={`M 176 ${sy} Q 202 ${sy - 8} 228 ${sy} Q 250 ${sy + 40} 248 470 Q 206 480 160 470 Q 156 ${sy + 40} 176 ${sy} Z`}
        fill={C.shirt}
        stroke={C.line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <path d="M 226 380 Q 236 420 230 462" stroke={C.shirtFold} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
};

export const Character: React.FC<CharacterProps> = (props) => {
  const {
    view,
    armAngle = 6,
    armAngleL,
    armAngleR,
    armPlane = 30,
    shrug = 0,
    lean = 0,
    dumbbells = true,
    shoulderAlert = 0,
    hairColor = "#111111",
  } = props;
  const shoulderY = 276 - shrug * 18;
  const angleFor = (s: -1 | 1) =>
    s === -1 ? (armAngleL ?? armAngle) : (armAngleR ?? armAngle);

  const alert = (x: number) =>
    shoulderAlert > 0 ? (
      <g key={x}>
        <circle cx={x} cy={shoulderY} r={40} fill="#FF2D2D" opacity={shoulderAlert * 0.25} />
        <circle cx={x} cy={shoulderY} r={24} fill="#FF2D2D" opacity={shoulderAlert * 0.55} />
      </g>
    ) : null;

  const body =
    view === "side" ? (
      <>
        <Arm
          shoulder={{ x: 196, y: shoulderY }}
          dir={projectArm(angleFor(-1), armPlane, view, -1)}
          bendSign={-1}
          view={view}
          dumbbells={dumbbells}
          far
        />
        <Limb from={{ x: 196, y: 604 }} to={{ x: 194, y: 740 }} width={15} color={C.skinShade} />
        <Limb from={{ x: 210, y: 604 }} to={{ x: 210, y: 740 }} width={15} />
        <SideShoe x={170} />
        <SideShoe x={186} />
        <TorsoSide shrug={shrug} />
        <HeadSide props={props} hair={hairColor} />
        {alert(204)}
        <Arm
          shoulder={{ x: 204, y: shoulderY }}
          dir={projectArm(angleFor(1), armPlane, view, 1)}
          bendSign={-1}
          view={view}
          dumbbells={dumbbells}
        />
      </>
    ) : (
      <>
        <Limb from={{ x: 166, y: 604 }} to={{ x: 166, y: 742 }} width={15} />
        <Limb from={{ x: 234, y: 604 }} to={{ x: 234, y: 742 }} width={15} />
        <Sneaker cx={164} front={view === "front"} />
        <Sneaker cx={236} front={view === "front"} />
        <TorsoFront view={view} shrug={shrug} />
        {view === "front" ? (
          <HeadFront props={props} hair={hairColor} />
        ) : (
          <HeadBack hair={hairColor} />
        )}
        {[-1, 1].map((s) => (
          <Arm
            key={s}
            shoulder={{ x: 200 + s * 60, y: shoulderY }}
            dir={projectArm(angleFor(s as -1 | 1), armPlane, view, s as -1 | 1)}
            bendSign={-s}
            view={view}
            dumbbells={dumbbells}
          />
        ))}
        {alert(140)}
        {alert(260)}
      </>
    );

  return (
    <svg viewBox="0 0 400 800" width="100%" height="100%" style={{ overflow: "visible" }}>
      <ellipse cx={200} cy={780} rx={120} ry={13} fill="#000" opacity={0.1} />
      <g transform={`rotate(${-lean} 200 770)`}>{body}</g>
    </svg>
  );
};

const SideShoe: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <path
      d={`M ${x} 742 L ${x + 42} 740 Q ${x + 58} 746 ${x + 70} 756 Q ${x + 92} 760 ${x + 92} 778 L ${x - 4} 778 Q ${x - 8} 758 ${x} 742 Z`}
      fill={C.shoe}
      stroke={C.line}
      strokeWidth={LW}
      strokeLinejoin="round"
    />
    <path d={`M ${x - 6} 766 L ${x + 92} 766`} stroke={C.line} strokeWidth={3} />
    <path d={`M ${x + 66} 766 Q ${x + 74} 756 ${x + 88} 766`} stroke={C.line} strokeWidth={2.5} fill="none" />
    <path
      d={`M ${x + 44} 746 L ${x + 52} 752 M ${x + 52} 744 L ${x + 58} 752`}
      stroke={C.line}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  </g>
);
