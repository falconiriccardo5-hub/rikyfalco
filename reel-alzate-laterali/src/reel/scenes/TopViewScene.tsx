import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../../fonts";
import { clamp } from "../anim";
import { Captions } from "../Captions";
import { Sfx, VoiceTrack } from "../audio";
import { TIMING } from "../timing";
import { Backdrop, Camera, GREEN, INK, RED, ViewChip } from "../ui";

const T = TIMING.top;
const CAPTIONS = T.captions;

const CX = 540;
const CY = 960;
const SH = 128;
const ARM = 330;

const deg = (d: number) => (d * Math.PI) / 180;

const TopArm: React.FC<{ side: -1 | 1; phi: number }> = ({ side, phi }) => {
  const sx = CX + side * SH;
  const dir = { x: side * Math.cos(deg(phi)), y: Math.sin(deg(phi)) };
  const hand = { x: sx + dir.x * ARM, y: CY + dir.y * ARM };
  const nrm = { x: -dir.y, y: dir.x };
  const bar = (k: number) => ({ x: hand.x + nrm.x * k, y: hand.y + nrm.y * k });
  const b1 = bar(-46);
  const b2 = bar(46);
  const sleeveEnd = { x: sx + dir.x * 90, y: CY + dir.y * 90 };
  const plate = (p: { x: number; y: number }) => {
    const a = Math.atan2(nrm.y, nrm.x);
    return (
      <rect
        x={p.x - 16}
        y={p.y - 34}
        width={32}
        height={68}
        rx={7}
        fill="#2A2A2A"
        stroke={INK}
        strokeWidth={6}
        transform={`rotate(${(a * 180) / Math.PI + 90} ${p.x} ${p.y})`}
      />
    );
  };
  return (
    <g>
      <line x1={sx} y1={CY} x2={hand.x} y2={hand.y} stroke={INK} strokeWidth={40} strokeLinecap="round" />
      <line x1={sx} y1={CY} x2={hand.x} y2={hand.y} stroke="#fff" strokeWidth={28} strokeLinecap="round" />
      <line x1={sx} y1={CY} x2={sleeveEnd.x} y2={sleeveEnd.y} stroke={INK} strokeWidth={70} strokeLinecap="round" />
      <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke={INK} strokeWidth={16} strokeLinecap="round" />
      <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke="#6E6E6E" strokeWidth={8} strokeLinecap="round" />
      {plate(b1)}
      {plate(b2)}
      <circle cx={hand.x} cy={hand.y} r={20} fill="#fff" stroke={INK} strokeWidth={6} />
    </g>
  );
};

const HairFromAbove: React.FC = () => {
  const spikes = 14;
  const pts = Array.from({ length: spikes * 2 }).map((_, i) => {
    const a = (Math.PI * i) / spikes + 0.2;
    const r = i % 2 === 0 ? 96 + (i % 4) * 4 : 74;
    return `${CX + r * Math.cos(a)},${CY - 6 + r * Math.sin(a)}`;
  });
  return (
    <g>
      {[-1, 1].map((sd) => (
        <ellipse key={sd} cx={CX + sd * 84} cy={CY + 4} rx={14} ry={22} fill="#fff" stroke={INK} strokeWidth={6} />
      ))}
      <polygon points={pts.join(" ")} fill={INK} stroke="#fff" strokeWidth={10} strokeLinejoin="round" paintOrder="stroke" />
      <polygon points={pts.join(" ")} fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${CX - 40} ${CY - 30} Q ${CX} ${CY - 60} ${CX + 44} ${CY - 20} M ${CX - 50} ${CY + 10} Q ${CX - 10} ${CY - 20} ${CX + 30} ${CY + 20}`} stroke="#4A4A4A" strokeWidth={5} fill="none" strokeLinecap="round" />
    </g>
  );
};

export const TopViewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rot = spring({ frame: frame - 62, fps, config: { damping: 16, stiffness: 70 } });
  const phi = 30 * rot;
  const intro = spring({ frame, fps, config: { damping: 14 } });
  const redOpacity = interpolate(frame, [6, 18], [0, 1], clamp);
  const greenOpacity = interpolate(frame, [80, 95], [0, 1], clamp);
  const badge = spring({ frame: frame - 100, fps, config: { damping: 10 } });
  const zoom = interpolate(frame, [0, 150], [1.0, 1.06]);

  const arcR = 230;
  const arcPath = (side: -1 | 1) => {
    const sx = CX + side * SH;
    const end = phi;
    const pts = Array.from({ length: 16 }).map((_, i) => {
      const a = deg((end * i) / 15);
      return `${i === 0 ? "M" : "L"} ${sx + side * arcR * Math.cos(a)} ${CY + arcR * Math.sin(a)}`;
    });
    return pts.join(" ");
  };

  return (
    <AbsoluteFill>
      <Camera zoom={zoom * (0.85 + intro * 0.15)}>
        <Backdrop tint="blue" floorY={4000} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {/* frontal plane */}
          <g opacity={redOpacity}>
            <line x1={20} x2={1060} y1={CY} y2={CY} stroke={RED} strokeWidth={7} strokeDasharray="24 14" />
            <text x={90} y={CY - 26} fill={RED} style={{ fontFamily, fontWeight: 800, fontSize: 38 }}>
              PIANO FRONTALE
            </text>
          </g>
          {/* scapular plane */}
          <g opacity={greenOpacity}>
            {([-1, 1] as const).map((s) => {
              const sx = CX + s * SH;
              return (
                <line
                  key={s}
                  x1={sx}
                  y1={CY}
                  x2={sx + s * Math.cos(deg(30)) * 560}
                  y2={CY + Math.sin(deg(30)) * 560}
                  stroke={GREEN}
                  strokeWidth={7}
                  strokeDasharray="24 14"
                />
              );
            })}
          </g>
          {([-1, 1] as const).map((s) => (
            <TopArm key={s} side={s} phi={phi} />
          ))}
          {/* shoulders / shirt from above */}
          <ellipse cx={CX} cy={CY} rx={175} ry={72} fill={INK} />
          <path d={`M ${CX - 120} ${CY + 30} Q ${CX} ${CY + 60} ${CX + 120} ${CY + 30}`} stroke="#3A3A3A" strokeWidth={5} fill="none" />
          {/* nose tip shows where "front" is */}
          <ellipse cx={CX} cy={CY + 88} rx={12} ry={14} fill="#fff" stroke={INK} strokeWidth={5} />
          <HairFromAbove />
          {/* angle arcs */}
          {phi > 1
            ? ([-1, 1] as const).map((s) => (
                <path key={s} d={arcPath(s)} stroke={GREEN} strokeWidth={8} fill="none" strokeLinecap="round" />
              ))
            : null}
          {phi > 1 ? (
            <text
              x={CX + SH + 150}
              y={CY + 190}
              fill={GREEN}
              style={{ fontFamily, fontWeight: 800, fontSize: 72 }}
            >
              {Math.round(phi)}°
            </text>
          ) : null}
          {/* front indicator */}
          <g opacity={interpolate(frame, [10, 25], [0, 1], clamp)}>
            <path d={`M ${CX} ${CY + 140} L ${CX} ${CY + 260} M ${CX - 26} ${CY + 232} L ${CX} ${CY + 262} L ${CX + 26} ${CY + 232}`} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x={CX} y={CY + 320} textAnchor="middle" fill={INK} style={{ fontFamily, fontWeight: 800, fontSize: 40 }}>
              DAVANTI
            </text>
          </g>
        </svg>
      </Camera>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${badge})`,
        }}
      >
        <div
          style={{
            background: GREEN,
            color: "#fff",
            fontFamily,
            fontWeight: 800,
            fontSize: 64,
            padding: "12px 36px",
            borderRadius: 22,
            border: `6px solid ${INK}`,
            transform: "rotate(-2deg)",
          }}
        >
          PIANO SCAPOLARE
        </div>
      </div>
      <ViewChip label="VISTA DALL'ALTO" />
      <Captions captions={CAPTIONS} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.45} />
      <Sfx name="chip" at={4} volume={0.4} />
      <Sfx name="drop" at={6} volume={0.3} />
      <Sfx name="rise" at={62} volume={0.5} />
      <Sfx name="badge" at={100} volume={0.5} />
    </AbsoluteFill>
  );
};
