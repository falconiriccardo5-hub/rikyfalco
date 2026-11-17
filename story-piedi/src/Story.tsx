import React from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  interpolate,
  OffthreadVideo,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ArchDiagram } from "./ArchDiagram";
import { fontFamily } from "./fonts";
import {
  Card,
  clamp,
  Footprint,
  GREEN,
  HANDLE,
  Highlighted,
  INK,
  RED,
  Sfx,
  useInOut,
  YELLOW,
} from "./ui";

/* ---------------- timeline (30 fps) ---------------- */
export const T = {
  hook: [0, 105],
  arch: [105, 235],
  chain: [235, 345],
  work: [345, 450],
  cta: [450, 600],
} as const;
export const STORY_FRAMES = T.cta[1];
const VIDEO_FRAMES = 438; // slowed clip length

/* ---------------- background footage ---------------- */

const Footage: React.FC = () => {
  const frame = useCurrentFrame();
  const inCta = frame >= T.cta[0];
  const blur = interpolate(frame, [T.cta[0], T.cta[0] + 14], [0, 18], clamp);
  const dim = interpolate(frame, [T.cta[0], T.cta[0] + 14], [0, 0.35], clamp);
  // slow push-in on the foot during the explanation
  const zoom = interpolate(frame, [0, T.work[1]], [1.0, 1.12]);
  const video = <OffthreadVideo src={staticFile("piede.mp4")} muted />;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 62%", filter: `blur(${blur}px)` }}>
        {inCta || frame >= VIDEO_FRAMES ? <Freeze frame={VIDEO_FRAMES - 2}>{video}</Freeze> : video}
      </AbsoluteFill>
      {/* legibility gradients */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <AbsoluteFill style={{ background: `rgba(17,17,17,${dim})` }} />
    </AbsoluteFill>
  );
};

/* ---------------- bottom caption (house style) ---------------- */

const Caption: React.FC<{ text: string; from: number; to: number; y?: number }> = ({ text, from, to, y = 1420 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const local = frame - from;
  const words = text.split(" ");
  const enter = spring({ frame: local, fps, config: { damping: 14, stiffness: 180 } });
  const exit = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 70,
        right: 70,
        display: "flex",
        justifyContent: "center",
        opacity: exit * Math.min(1, enter * 1.5),
        transform: `translateY(${(1 - enter) * 40}px) scale(${0.9 + enter * 0.1})`,
      }}
    >
      <div
        style={{
          background: INK,
          borderRadius: 28,
          padding: "22px 34px",
          boxShadow: "0 12px 0 rgba(0,0,0,0.25)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 16,
          rowGap: 4,
          maxWidth: 940,
        }}
      >
        {words.map((w, i) => {
          const s = spring({ frame: local - i * 2.2, fps, config: { damping: 12, stiffness: 220 } });
          const letters = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
          const key = letters.length > 1 && letters === letters.toUpperCase();
          return (
            <span
              key={i}
              style={{
                fontFamily,
                fontWeight: 800,
                fontSize: 54,
                lineHeight: 1.2,
                color: key ? YELLOW : "#fff",
                opacity: s,
                display: "inline-block",
                transform: `translateY(${(1 - s) * 18}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- 1. hook ---------------- */

const Hook: React.FC = () => {
  const { s, out, frame, fps } = useInOut(4, T.hook[1]);
  const s2 = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const chip = spring({ frame: frame - 34, fps, config: { damping: 15 } });
  return (
    <div style={{ position: "absolute", top: 250, left: 60, right: 60, textAlign: "center", opacity: out }}>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.02,
          color: "#fff",
          letterSpacing: -2,
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
          transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`,
        }}
      >
        ALLENI TUTTO...
        <br />
        TRANNE I PIEDI?
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 24,
          fontFamily,
          fontWeight: 800,
          fontSize: 48,
          color: INK,
          background: YELLOW,
          padding: "6px 24px",
          borderRadius: 14,
          transform: `translateY(${(1 - s2) * 30}px) rotate(-2deg)`,
          opacity: s2,
        }}
      >
        sono le tue fondamenta
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 34 }}>
        {["26 ossa", "33 articolazioni", "100+ muscoli e legamenti"].map((t, i) => {
          const c = spring({ frame: frame - 34 - i * 6, fps, config: { damping: 13, stiffness: 170 } });
          return (
            <div
              key={t}
              style={{
                fontFamily,
                fontWeight: 800,
                fontSize: 30,
                color: "#fff",
                background: "rgba(17,17,17,0.85)",
                border: "3px solid rgba(255,255,255,0.25)",
                borderRadius: 999,
                padding: "10px 22px",
                opacity: chip > 0 ? c : 0,
                transform: `scale(${c})`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- 2. arch model ---------------- */

const Arch: React.FC = () => {
  const frame = useCurrentFrame() - T.arch[0];
  return (
    <Card top={250} delay={T.arch[0] + 2} end={T.arch[1]}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <Highlighted text="Il piede è una MOLLA" size={52} />
      </div>
      <ArchDiagram frame={frame} start={22} />
    </Card>
  );
};

/* ---------------- 3. chain reaction ---------------- */

const CHAIN = [
  { part: "Schiena", issue: "lombalgia e rigidità" },
  { part: "Anca", issue: "bacino che compensa" },
  { part: "Ginocchio", issue: "cede verso l'interno" },
  { part: "Caviglia", issue: "instabile, distorsioni" },
  { part: "Piede", issue: "l'arco cede" },
];

const Chain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base = T.chain[0] + 10;
  // reveal from the bottom (the foot) up to the back
  const order = (i: number) => CHAIN.length - 1 - i;
  const lineP = interpolate(frame, [base, base + 12 * CHAIN.length], [0, 1], clamp);
  return (
    <Card top={250} delay={T.chain[0] + 2} end={T.chain[1]} padding="26px 34px 30px">
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <Highlighted text="Il problema SALE" size={52} />
      </div>
      <div style={{ position: "relative" }}>
        {/* rising red line */}
        <div
          style={{
            position: "absolute",
            left: 27,
            bottom: 30,
            width: 8,
            height: `${lineP * 82}%`,
            background: RED,
            borderRadius: 4,
          }}
        />
        {CHAIN.map((c, i) => {
          const s = spring({ frame: frame - base - order(i) * 12, fps, config: { damping: 12, stiffness: 190 } });
          const isFoot = i === CHAIN.length - 1;
          return (
            <div
              key={c.part}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                height: 74,
                opacity: s,
                transform: `translateX(${(1 - s) * -60}px)`,
              }}
            >
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  background: isFoot ? YELLOW : RED,
                  border: `5px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                  fontFamily,
                  fontWeight: 800,
                  fontSize: 34,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {isFoot ? <Footprint size={38} /> : "!"}
              </div>
              <div style={{ fontFamily, fontWeight: 800, fontSize: 42, color: INK, width: 250 }}>{c.part}</div>
              <div style={{ fontFamily, fontWeight: 600, fontSize: 31, color: "#555" }}>{c.issue}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ---------------- 4. what we train ---------------- */

const WORK = ["Equilibrio e PROPRIOCEZIONE", "Forza dell'ARCO plantare", "Stabilità della CAVIGLIA"];

const Work: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { out } = useInOut(T.work[0], T.work[1]);
  const head = spring({ frame: frame - T.work[0] - 2, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <div style={{ position: "absolute", top: 250, left: 70, right: 70, opacity: out }}>
      <div
        style={{
          display: "inline-block",
          fontFamily,
          fontWeight: 800,
          fontSize: 40,
          color: INK,
          background: YELLOW,
          borderRadius: 14,
          padding: "6px 22px",
          transform: `scale(${head}) rotate(-2deg)`,
          marginBottom: 18,
        }}
      >
        Per questo, nei miei percorsi:
      </div>
      {WORK.map((w, i) => {
        const s = spring({ frame: frame - T.work[0] - 12 - i * 10, fps, config: { damping: 11, stiffness: 200 } });
        return (
          <div
            key={w}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              background: "#fff",
              border: `6px solid ${INK}`,
              borderRadius: 26,
              padding: "16px 24px",
              marginBottom: 16,
              boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
              transform: `translateX(${(1 - s) * 120}px) rotate(${(1 - s) * 4}deg)`,
              opacity: Math.min(1, s * 1.4),
            }}
          >
            <svg width={56} height={56} viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
              <circle cx={42} cy={42} r={38} fill={GREEN} />
              <path d="M 24 44 L 37 57 L 61 29" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Highlighted text={w} size={44} />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- 5. call to action ---------------- */

const CLICK = T.cta[0] + 78;
const BTN = { x: 540, y: 1030 };

const Cursor: React.FC = () => (
  <svg width={70} height={84} viewBox="0 0 70 84">
    <path d="M 6 4 L 6 64 L 22 50 L 34 78 L 46 72 L 34 46 L 56 46 Z" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
  </svg>
);

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = T.cta[0];
  const card = spring({ frame: frame - t0 - 4, fps, config: { damping: 12, stiffness: 140 } });
  const btn = spring({ frame: frame - t0 - 24, fps, config: { damping: 10, stiffness: 180 } });
  const sent = frame >= CLICK;
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 5], [1, 0.92, 1], clamp);
  const pulse = sent ? 1 : 1 + 0.035 * Math.sin((frame - t0) * 0.35) * Math.min(1, btn);
  const cursorT = interpolate(frame, [t0 + 46, CLICK - 2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cursorOut = interpolate(frame, [CLICK + 18, CLICK + 32], [0, 1], clamp);
  const cursor = {
    x: interpolate(cursorT, [0, 1], [960, BTN.x + 120]) + cursorOut * 500,
    y: interpolate(cursorT, [0, 1], [1600, BTN.y + 20]),
  };
  const arrow = spring({ frame: frame - CLICK - 12, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 70,
          right: 70,
          background: "#fff",
          border: `7px solid ${INK}`,
          borderRadius: 40,
          padding: "40px 40px 46px",
          textAlign: "center",
          boxShadow: "0 16px 0 rgba(0,0,0,0.3)",
          transform: `scale(${card}) rotate(${(1 - card) * -6}deg)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: YELLOW,
              border: `6px solid ${INK}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Footprint size={78} />
          </div>
        </div>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 62, lineHeight: 1.05, color: INK, marginTop: 14 }}>
          Valutazione
          <br />
          PIEDE + POSTURA
        </div>
        <div style={{ fontFamily, fontWeight: 600, fontSize: 34, color: "#444", marginTop: 16, lineHeight: 1.3 }}>
          Capiamo da dove nasce il fastidio e costruiamo il tuo allenamento partendo dalla base.
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            marginTop: 30,
            background: sent ? "#E9ECEF" : "#0095F6",
            color: sent ? INK : "#fff",
            fontFamily,
            fontWeight: 800,
            fontSize: 44,
            borderRadius: 20,
            padding: "18px 44px",
            transform: `scale(${btn * press * pulse})`,
          }}
        >
          {sent ? "Messaggio inviato" : "Scrivimi “PIEDI” in DM"}
          {sent ? (
            <svg width={40} height={40} viewBox="0 0 38 38">
              <path d="M 6 20 L 15 29 L 32 9" stroke={GREEN} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width={44} height={44} viewBox="0 0 48 48">
              <path d="M 4 22 L 44 4 L 30 44 L 22 28 Z" fill="none" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
              <path d="M 22 28 L 44 4" stroke="#fff" strokeWidth={5} />
            </svg>
          )}
        </div>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 36, color: INK, marginTop: 26 }}>{HANDLE}</div>
      </div>

      {/* posti limitati sticker */}
      <div
        style={{
          position: "absolute",
          top: 250,
          right: 50,
          fontFamily,
          fontWeight: 800,
          fontSize: 32,
          color: "#fff",
          background: RED,
          border: `5px solid ${INK}`,
          borderRadius: 16,
          padding: "8px 18px",
          transform: `scale(${spring({ frame: frame - t0 - 36, fps, config: { damping: 8, stiffness: 220 } })}) rotate(8deg)`,
        }}
      >
        POSTI LIMITATI
      </div>

      {/* reply hint after the tap */}
      <div
        style={{
          position: "absolute",
          top: 1440,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: arrow,
          transform: `translateY(${(1 - arrow) * 30}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontFamily,
            fontWeight: 800,
            fontSize: 44,
            color: INK,
            background: YELLOW,
            borderRadius: 16,
            padding: "10px 26px",
            transform: "rotate(-2deg)",
          }}
        >
          Rispondi a questa storia
        </div>
        <svg width={90} height={110} viewBox="0 0 90 110" style={{ display: "block", margin: "8px auto 0" }}>
          <path
            d={`M 45 6 L 45 ${70 + Math.sin(frame * 0.3) * 8}`}
            stroke="#fff"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray="16 12"
          />
          <path
            d={`M 20 ${66 + Math.sin(frame * 0.3) * 8} L 45 ${96 + Math.sin(frame * 0.3) * 8} L 70 ${66 + Math.sin(frame * 0.3) * 8}`}
            stroke="#fff"
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {sent ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 36 }).map((_, i) => {
            const t = (frame - CLICK) / fps;
            const a = random(`a${i}`) * Math.PI * 2;
            const v = 500 + random(`v${i}`) * 700;
            const x = BTN.x + Math.cos(a) * v * t;
            const y = BTN.y + Math.sin(a) * v * t + 900 * t * t;
            const colors = [YELLOW, "#0095F6", RED, GREEN, INK];
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={18}
                height={10}
                fill={colors[i % colors.length]}
                transform={`rotate(${frame * 12 + i * 40} ${x + 9} ${y + 5})`}
                opacity={interpolate(t, [0.8, 1.4], [1, 0], clamp)}
              />
            );
          })}
        </svg>
      ) : null}
      {cursorOut < 1 && frame > t0 + 44 ? (
        <div style={{ position: "absolute", left: cursor.x, top: cursor.y, transform: `scale(${press})` }}>
          <Cursor />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------------- story ---------------- */

const inRange = (f: number, r: readonly [number, number]) => f >= r[0] && f < r[1];

export const Story: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Footage />
      {inRange(frame, T.hook) ? <Hook /> : null}
      {inRange(frame, T.arch) ? <Arch /> : null}
      {inRange(frame, T.chain) ? <Chain /> : null}
      {inRange(frame, T.work) ? <Work /> : null}
      {frame >= T.cta[0] ? <Cta /> : null}

      <Caption from={40} to={T.hook[1]} text="Ogni passo, squat e corsa PARTE da qui" />
      <Caption from={T.arch[0] + 30} to={T.arch[1]} text="Se l'arco CEDE, il peso non viene più ASSORBITO" />
      <Caption from={T.chain[0] + 50} to={T.chain[1]} text="...e il conto lo pagano GINOCCHIA, ANCHE e SCHIENA" />
      <Caption from={T.work[0] + 40} to={T.work[1]} text="Piede FORTE = movimento più EFFICIENTE e meno DOLORE" />

      {/* sound design */}
      <Sfx name="riser" at={0} volume={0.25} />
      <Sfx name="pop" at={4} volume={0.55} />
      <Sfx name="swish" at={16} volume={0.35} />
      {[34, 40, 46].map((f) => (
        <Sfx key={f} name="tick" at={f} volume={0.35} />
      ))}
      <Sfx name="whoosh" at={T.arch[0]} volume={0.45} />
      <Sfx name="card" at={T.arch[0] + 2} volume={0.4} />
      <Sfx name="thud" at={T.arch[0] + 30} volume={0.5} />
      <Sfx name="error" at={T.arch[0] + 46} volume={0.3} />
      <Sfx name="whoosh" at={T.chain[0]} volume={0.45} />
      {CHAIN.map((_, i) => (
        <Sfx key={i} name="pop2" at={T.chain[0] + 10 + i * 12} volume={0.35} />
      ))}
      <Sfx name="whoosh" at={T.work[0]} volume={0.45} />
      {WORK.map((_, i) => (
        <Sfx key={i} name="good" at={T.work[0] + 14 + i * 10} volume={0.35} />
      ))}
      <Sfx name="rise" at={T.cta[0] - 10} volume={0.4} />
      <Sfx name="card" at={T.cta[0] + 4} volume={0.45} />
      <Sfx name="badge" at={T.cta[0] + 36} volume={0.4} />
      <Sfx name="click" at={CLICK} volume={0.7} />
      <Sfx name="celebrate" at={CLICK + 2} volume={0.5} />
    </AbsoluteFill>
  );
};
