import React from "react";

export type CharacterStyle = "cartoon" | "white" | "sketch";
export type View = "front" | "side" | "back";

export type CharacterProps = {
  readonly view: View;
  readonly variant?: CharacterStyle;
  /** Arm elevation in degrees: 0 = arms down, 90 = arms horizontal */
  readonly armAngle?: number;
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
  /** Pencil wobble seed for sketch style */
  readonly seed?: number;
  /** Highlight shoulder (rotator cuff) in red */
  readonly shoulderAlert?: number;
};

type Palette = {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  shirt: string;
  shirtShade: string;
  shorts: string;
  shoe: string;
  shoeAccent: string;
  line: string;
  lineW: number;
  eye: string;
  blush: string;
  dumbbell: string;
  dumbbellLight: string;
};

export const PALETTES: Record<CharacterStyle, Palette> = {
  cartoon: {
    skin: "#F7C9A3",
    skinShade: "#E9AE84",
    hair: "#7A4A2B",
    hairShade: "#5C3520",
    shirt: "#FF5A36",
    shirtShade: "#E2421F",
    shorts: "#1F2A44",
    shoe: "#FFFFFF",
    shoeAccent: "#FF5A36",
    line: "#1B1F2E",
    lineW: 5,
    eye: "#1B1F2E",
    blush: "#FF8C7A",
    dumbbell: "#2C3142",
    dumbbellLight: "#596079",
  },
  white: {
    skin: "#FFFFFF",
    skinShade: "#DDE3EE",
    hair: "#FFFFFF",
    hairShade: "#DDE3EE",
    shirt: "#FFFFFF",
    shirtShade: "#DDE3EE",
    shorts: "#F1F4F9",
    shoe: "#FFFFFF",
    shoeAccent: "#DDE3EE",
    line: "#B9C3D6",
    lineW: 2,
    eye: "#16204A",
    blush: "transparent",
    dumbbell: "#16204A",
    dumbbellLight: "#3B4A86",
  },
  sketch: {
    skin: "#F6DCC4",
    skinShade: "#EBC4A3",
    hair: "#8A5A3B",
    hairShade: "#6E432A",
    shirt: "#A9D2EE",
    shirtShade: "#86BCE0",
    shorts: "#4E5A70",
    shoe: "#FBF7EE",
    shoeAccent: "#A9D2EE",
    line: "#2E2A26",
    lineW: 3.5,
    eye: "#2E2A26",
    blush: "#F2A49A",
    dumbbell: "#3D3A36",
    dumbbellLight: "#6B665F",
  },
};

const UPPER = 100;
const FORE = 92;

const deg = (d: number) => (d * Math.PI) / 180;

type Pt = { x: number; y: number };

/**
 * Projects the 3D arm direction onto the 2D screen for a given view.
 * side: -1 = character's right arm, +1 = character's left arm
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
  if (view === "front") return { x: side * lateral, y: down };
  if (view === "back") return { x: -side * lateral, y: down };
  // side view: character faces screen-right
  return { x: forward, y: down };
};

const Limb: React.FC<{
  from: Pt;
  to: Pt;
  width: number;
  color: string;
  p: Palette;
}> = ({ from, to, width, color, p }) => (
  <>
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={p.line}
      strokeWidth={width + p.lineW * 2}
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

const hexPoints = (cx: number, cy: number, r: number, rot = 0) =>
  Array.from({ length: 6 })
    .map((_, i) => {
      const a = deg(60 * i + rot);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    })
    .join(" ");

const Arm: React.FC<{
  shoulder: Pt;
  dir: Pt;
  side: -1 | 1;
  view: View;
  p: Palette;
  dumbbells: boolean;
  far?: boolean;
}> = ({ shoulder, dir, side, view, p, dumbbells, far }) => {
  const elbow = {
    x: shoulder.x + dir.x * UPPER,
    y: shoulder.y + dir.y * UPPER,
  };
  // slight elbow bend, bending toward the body midline / forward
  const bend = deg(view === "side" ? -10 : 10 * side * (view === "back" ? -1 : 1));
  const fx = dir.x * Math.cos(bend) - dir.y * Math.sin(bend);
  const fy = dir.x * Math.sin(bend) + dir.y * Math.cos(bend);
  const hand = { x: elbow.x + fx * FORE, y: elbow.y + fy * FORE };
  const sleeveEnd = {
    x: shoulder.x + dir.x * UPPER * 0.48,
    y: shoulder.y + dir.y * UPPER * 0.48,
  };
  const skin = far ? p.skinShade : p.skin;
  const shirt = far ? p.shirtShade : p.shirt;

  const dumbbell = !dumbbells ? null : view === "side" ? (
    <g>
      <line
        x1={hand.x - 38}
        y1={hand.y}
        x2={hand.x + 38}
        y2={hand.y}
        stroke={p.line}
        strokeWidth={10 + p.lineW}
        strokeLinecap="round"
      />
      <line
        x1={hand.x - 38}
        y1={hand.y}
        x2={hand.x + 38}
        y2={hand.y}
        stroke={p.dumbbellLight}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={hand.x + s * 34 - 11}
          y={hand.y - 24}
          width={22}
          height={48}
          rx={5}
          fill={p.dumbbell}
          stroke={p.line}
          strokeWidth={p.lineW}
        />
      ))}
    </g>
  ) : (
    <g>
      <polygon
        points={hexPoints(hand.x, hand.y + 2, 24, 0)}
        fill={p.dumbbell}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      <circle cx={hand.x} cy={hand.y + 2} r={9} fill={p.dumbbellLight} />
    </g>
  );

  return (
    <g>
      <Limb from={elbow} to={hand} width={24} color={skin} p={p} />
      <Limb from={shoulder} to={elbow} width={29} color={skin} p={p} />
      <Limb from={shoulder} to={sleeveEnd} width={40} color={shirt} p={p} />
      {view === "side" ? dumbbell : null}
      <circle
        cx={hand.x}
        cy={hand.y}
        r={15}
        fill={skin}
        stroke={p.line}
        strokeWidth={p.lineW}
      />
      {view !== "side" ? dumbbell : null}
    </g>
  );
};

/* ---------------- heads ---------------- */

const Eyes: React.FC<{ xs: number[]; y: number; p: Palette; blink: boolean }> = ({
  xs,
  y,
  p,
  blink,
}) => (
  <>
    {xs.map((x) =>
      blink ? (
        <path
          key={x}
          d={`M ${x - 8} ${y} Q ${x} ${y + 5} ${x + 8} ${y}`}
          stroke={p.eye}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={7.5} ry={10} fill={p.eye} />
          <circle cx={x + 2.5} cy={y - 3.5} r={2.8} fill="#fff" />
        </g>
      ),
    )}
  </>
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
    return `M ${cx - w} ${y} Q ${cx} ${y + 4 + o * 16} ${cx + w} ${y} Q ${cx} ${y + 2 + o * 4} ${cx - w} ${y} Z`;
  }
  return `M ${cx - w} ${y} Q ${cx} ${y + 14} ${cx + w} ${y}`;
};

const HeadFront: React.FC<{ p: Palette; props: CharacterProps }> = ({
  p,
  props,
}) => {
  const closed = props.mouth === "talk" || props.mouth === "open";
  return (
    <g>
      {/* ears */}
      {[136, 264].map((x) => (
        <ellipse
          key={x}
          cx={x}
          cy={152}
          rx={11}
          ry={17}
          fill={p.skin}
          stroke={p.line}
          strokeWidth={p.lineW}
        />
      ))}
      {/* face */}
      <path
        d="M 140 120 Q 140 70 200 70 Q 260 70 260 120 L 260 160 Q 258 212 200 214 Q 142 212 140 160 Z"
        fill={p.skin}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      {/* hair: short, slightly spiky */}
      <path
        d="M 134 146 Q 126 104 146 82 L 140 60 L 166 70 L 170 40 L 194 60 L 206 30 L 222 58 L 244 40 L 246 70 L 268 64 L 258 88 Q 274 108 266 146 Q 258 118 246 108 Q 232 120 212 110 Q 196 122 178 112 Q 158 120 146 112 Q 138 124 134 146 Z"
        fill={p.hair}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      <path
        d="M 172 74 L 182 62 M 210 64 L 216 52 M 236 72 L 242 62"
        stroke={p.hairShade}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* brows */}
      <path
        d="M 164 130 Q 176 123 188 128 M 212 128 Q 224 123 236 130"
        stroke={p.hairShade === "#DDE3EE" ? p.eye : p.hairShade}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <Eyes xs={[176, 224]} y={152} p={p} blink={Boolean(props.blink)} />
      {/* nose */}
      <path
        d="M 198 162 Q 204 172 196 176"
        stroke={p.skinShade === "#DDE3EE" ? p.line : p.skinShade}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      {/* blush */}
      <circle cx={158} cy={176} r={11} fill={p.blush} opacity={0.35} />
      <circle cx={242} cy={176} r={11} fill={p.blush} opacity={0.35} />
      {/* mouth */}
      <path
        d={mouthPath(props.mouth, props.talk ?? 0, 200, 188, 16)}
        stroke={p.eye}
        strokeWidth={4.5}
        fill={closed ? "#7A2E2E" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

const HeadBack: React.FC<{ p: Palette }> = ({ p }) => (
  <g>
    {[136, 264].map((x) => (
      <ellipse
        key={x}
        cx={x}
        cy={152}
        rx={11}
        ry={17}
        fill={p.skin}
        stroke={p.line}
        strokeWidth={p.lineW}
      />
    ))}
    <path
      d="M 140 120 Q 140 70 200 70 Q 260 70 260 120 L 260 160 Q 258 212 200 214 Q 142 212 140 160 Z"
      fill={p.skin}
      stroke={p.line}
      strokeWidth={p.lineW}
    />
    <path
      d="M 136 160 Q 124 104 146 82 L 140 60 L 166 70 L 170 40 L 194 60 L 206 30 L 222 58 L 244 40 L 246 70 L 268 64 L 258 88 Q 276 110 264 160 Q 258 190 236 196 Q 220 186 200 192 Q 180 186 164 196 Q 142 190 136 160 Z"
      fill={p.hair}
      stroke={p.line}
      strokeWidth={p.lineW}
      strokeLinejoin="round"
    />
    <path
      d="M 180 120 L 186 106 M 214 128 L 220 112 M 200 160 L 204 146 M 236 150 L 242 136 M 162 150 L 166 136"
      stroke={p.hairShade}
      strokeWidth={4}
      strokeLinecap="round"
    />
  </g>
);

const HeadSide: React.FC<{ p: Palette; props: CharacterProps }> = ({
  p,
  props,
}) => {
  const closed = props.mouth === "talk" || props.mouth === "open";
  return (
    <g>
      <path
        d="M 146 124 Q 146 70 202 70 Q 252 70 258 118 L 262 134 Q 276 150 262 158 Q 262 200 230 212 Q 200 220 176 206 Q 150 190 146 160 Z"
        fill={p.skin}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      {/* hair from the side */}
      <path
        d="M 140 168 Q 128 110 150 84 L 138 70 L 166 70 L 160 44 L 188 60 L 196 32 L 216 58 L 236 40 L 240 70 L 262 66 L 254 92 Q 262 104 262 116 Q 244 106 228 112 Q 212 104 200 118 Q 190 132 192 150 Q 176 140 168 158 Q 160 172 140 168 Z"
        fill={p.hair}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      <path
        d="M 168 80 L 176 66 M 204 70 L 210 56 M 158 120 L 164 106"
        stroke={p.hairShade}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* ear */}
      <ellipse
        cx={182}
        cy={158}
        rx={11}
        ry={17}
        fill={p.skin}
        stroke={p.line}
        strokeWidth={p.lineW}
      />
      <path
        d="M 228 128 Q 238 122 250 126"
        stroke={p.hairShade === "#DDE3EE" ? p.eye : p.hairShade}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <Eyes xs={[238]} y={150} p={p} blink={Boolean(props.blink)} />
      <circle cx={232} cy={178} r={10} fill={p.blush} opacity={0.35} />
      <path
        d={mouthPath(props.mouth, props.talk ?? 0, 248, 190, 10)}
        stroke={p.eye}
        strokeWidth={4.5}
        fill={closed ? "#7A2E2E" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

/* ---------------- body ---------------- */

const Legs: React.FC<{ p: Palette; view: View }> = ({ p, view }) => {
  if (view === "side") {
    return (
      <g>
        <Limb from={{ x: 194, y: 520 }} to={{ x: 190, y: 742 }} width={34} color={p.skinShade} p={p} />
        <Limb from={{ x: 206, y: 520 }} to={{ x: 206, y: 742 }} width={34} color={p.skin} p={p} />
        {[0, 1].map((i) => (
          <path
            key={i}
            d={`M ${178 + i * 12} 742 L ${222 + i * 12} 742 Q ${252 + i * 12} 750 ${254 + i * 12} 772 L ${176 + i * 12} 772 Q ${170 + i * 12} 756 ${178 + i * 12} 742 Z`}
            fill={i === 0 ? p.shoeAccent : p.shoe}
            stroke={p.line}
            strokeWidth={p.lineW}
            strokeLinejoin="round"
          />
        ))}
      </g>
    );
  }
  return (
    <g>
      <Limb from={{ x: 176, y: 520 }} to={{ x: 172, y: 742 }} width={34} color={p.skin} p={p} />
      <Limb from={{ x: 224, y: 520 }} to={{ x: 228, y: 742 }} width={34} color={p.skin} p={p} />
      {[-1, 1].map((s) => {
        const cx = 200 + s * 30;
        return (
          <g key={s}>
            <path
              d={`M ${cx - 24} 772 Q ${cx - 26} 742 ${cx} 738 Q ${cx + 26} 742 ${cx + 24} 772 Z`}
              fill={p.shoe}
              stroke={p.line}
              strokeWidth={p.lineW}
              strokeLinejoin="round"
            />
            <path
              d={`M ${cx - 22} 762 L ${cx + 22} 762`}
              stroke={p.shoeAccent}
              strokeWidth={6}
            />
          </g>
        );
      })}
    </g>
  );
};

const TorsoFront: React.FC<{ p: Palette; view: View; shrug: number }> = ({
  p,
  view,
  shrug,
}) => {
  const sy = 240 - shrug * 16;
  return (
    <g>
      {/* neck */}
      <rect x={182} y={196} width={36} height={52} rx={10} fill={p.skinShade} stroke={p.line} strokeWidth={p.lineW} />
      {/* traps when shrugging */}
      <path
        d={`M 150 ${sy + 4} Q 175 ${226 - shrug * 26} 186 ${222 - shrug * 6} L 214 ${222 - shrug * 6} Q 225 ${226 - shrug * 26} 250 ${sy + 4} Z`}
        fill={view === "back" ? p.shirt : p.shirt}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      <path
        d={`M 136 ${sy + 2} Q 200 ${sy - 10} 264 ${sy + 2} Q 280 ${sy + 14} 276 ${sy + 34} Q 262 350 248 448 L 152 448 Q 138 350 124 ${sy + 34} Q 120 ${sy + 14} 136 ${sy + 2} Z`}
        fill={p.shirt}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
      {view === "front" ? (
        <>
          <path
            d={`M 180 ${sy - 4} Q 200 ${sy + 22} 220 ${sy - 4}`}
            fill={p.skinShade}
            stroke={p.line}
            strokeWidth={p.lineW}
            strokeLinejoin="round"
          />
          {/* small chest logo */}
          <path d="M 222 300 l 10 -10 l 10 10 l -10 10 z" fill="#fff" opacity={p.shirt === "#FFFFFF" ? 0 : 0.9} />
        </>
      ) : (
        <>
          {/* shoulder blades hint */}
          <path
            d={`M 160 ${sy + 40} Q 172 ${sy + 80} 186 ${sy + 96} M 240 ${sy + 40} Q 228 ${sy + 80} 214 ${sy + 96}`}
            stroke={p.shirtShade}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {/* shorts */}
      <path
        d="M 150 440 L 250 440 L 262 540 L 208 540 L 200 486 L 192 540 L 138 540 Z"
        fill={p.shorts}
        stroke={p.line}
        strokeWidth={p.lineW}
        strokeLinejoin="round"
      />
    </g>
  );
};

const TorsoSide: React.FC<{ p: Palette; shrug: number }> = ({ p, shrug }) => (
  <g>
    <rect x={184} y={196} width={34} height={52} rx={10} fill={p.skinShade} stroke={p.line} strokeWidth={p.lineW} />
    <path
      d={`M 170 ${240 - shrug * 14} Q 200 ${226 - shrug * 14} 232 ${240 - shrug * 10} Q 252 300 242 360 Q 236 410 234 448 L 168 448 Q 160 380 164 320 Q 160 270 170 ${240 - shrug * 14} Z`}
      fill={p.shirt}
      stroke={p.line}
      strokeWidth={p.lineW}
      strokeLinejoin="round"
    />
    <path
      d="M 166 440 L 236 440 L 240 540 L 164 540 Z"
      fill={p.shorts}
      stroke={p.line}
      strokeWidth={p.lineW}
      strokeLinejoin="round"
    />
  </g>
);

export const Character: React.FC<CharacterProps> = (props) => {
  const {
    view,
    variant = "cartoon",
    armAngle = 8,
    armPlane = 30,
    shrug = 0,
    lean = 0,
    dumbbells = true,
    seed = 1,
    shoulderAlert = 0,
  } = props;
  const p = PALETTES[variant];
  const shoulderY = 262 - shrug * 16;

  const filterId = `pencil-${seed}`;

  const body =
    view === "side" ? (
      <>
        <Arm
          shoulder={{ x: 196, y: shoulderY }}
          dir={projectArm(armAngle, armPlane, view, -1)}
          side={-1}
          view={view}
          p={p}
          dumbbells={dumbbells}
          far
        />
        <Legs p={p} view={view} />
        <TorsoSide p={p} shrug={shrug} />
        <HeadSide p={p} props={props} />
        {shoulderAlert > 0 ? (
          <circle cx={202} cy={shoulderY} r={34} fill="#FF2D2D" opacity={shoulderAlert * 0.55} />
        ) : null}
        <Arm
          shoulder={{ x: 202, y: shoulderY }}
          dir={projectArm(armAngle, armPlane, view, 1)}
          side={1}
          view={view}
          p={p}
          dumbbells={dumbbells}
        />
      </>
    ) : (
      <>
        <Legs p={p} view={view} />
        {[-1, 1].map((s) => (
          <Arm
            key={s}
            shoulder={{ x: 200 + s * 66, y: shoulderY }}
            dir={projectArm(
              armAngle,
              armPlane,
              view,
              (view === "front" ? s : -s) as -1 | 1,
            )}
            side={(view === "front" ? s : -s) as -1 | 1}
            view={view}
            p={p}
            dumbbells={dumbbells}
          />
        ))}
        <TorsoFront p={p} view={view} shrug={shrug} />
        {view === "front" ? <HeadFront p={p} props={props} /> : <HeadBack p={p} />}
        {shoulderAlert > 0
          ? [-1, 1].map((s) => (
              <circle
                key={s}
                cx={200 + s * 66}
                cy={shoulderY}
                r={34}
                fill="#FF2D2D"
                opacity={shoulderAlert * 0.55}
              />
            ))
          : null}
      </>
    );

  return (
    <svg viewBox="0 0 400 800" width="100%" height="100%" style={{ overflow: "visible" }}>
      {variant === "sketch" ? (
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={3} seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale={7} />
          </filter>
        </defs>
      ) : null}
      {/* ground shadow */}
      <ellipse cx={200} cy={776} rx={110} ry={14} fill="#000" opacity={variant === "white" ? 0.25 : 0.12} />
      <g
        transform={`rotate(${-lean} 200 760)`}
        filter={variant === "sketch" ? `url(#${filterId})` : undefined}
      >
        {body}
      </g>
    </svg>
  );
};
