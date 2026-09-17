import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const ACCENT = '#ff7a3d';
const ACCENT_2 = '#4dd2ff';

/** Slowly drifting conic glow behind everything. */
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const rotate = interpolate(frame, [0, durationInFrames], [0, 70]);
  const breathe = 1 + 0.12 * Math.sin((frame / 30) * Math.PI);

  return (
    <AbsoluteFill style={{backgroundColor: '#070a12'}}>
      <AbsoluteFill
        style={{
          transform: `rotate(${rotate}deg) scale(${1.6 * breathe})`,
          background: `conic-gradient(from 0deg, ${ACCENT}22, ${ACCENT_2}33, #070a1200, ${ACCENT}22)`,
          filter: 'blur(90px)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(255,255,255,0.06), rgba(0,0,0,0.85) 70%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Particles that fly in from the edges and settle onto a ring. */
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const count = 48;

  return (
    <AbsoluteFill>
      {new Array(count).fill(true).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = 330;
        const targetX = width / 2 + Math.cos(angle) * radius;
        const targetY = height / 2 + Math.sin(angle) * radius;
        const startX = width / 2 + Math.cos(angle) * 1400;
        const startY = height / 2 + Math.sin(angle) * 1400;

        const p = spring({
          frame,
          fps,
          delay: (i % 12) * 1.5,
          config: {damping: 14, mass: 0.7},
        });

        const x = interpolate(p, [0, 1], [startX, targetX]);
        const y = interpolate(p, [0, 1], [startY, targetY]);
        const size = 3 + (i % 5);
        const opacity = interpolate(p, [0, 0.4, 1], [0, 1, 0.55]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: i % 3 === 0 ? ACCENT_2 : ACCENT,
              opacity,
              boxShadow: `0 0 ${size * 4}px ${i % 3 === 0 ? ACCENT_2 : ACCENT}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** The ring that draws itself around the title. */
const Ring: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const draw = spring({frame, fps, delay: 14, config: {damping: 20, mass: 1.2}});
  const circumference = 2 * Math.PI * 330;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <svg width={760} height={760} style={{transform: 'rotate(-90deg)'}}>
        <circle
          cx={380}
          cy={380}
          r={330}
          fill="none"
          stroke={ACCENT}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - draw)}
          opacity={0.8}
        />
      </svg>
    </AbsoluteFill>
  );
};

/** Title, revealed letter by letter. */
const Title: React.FC<{text: string; delay: number}> = ({text, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{display: 'flex'}}>
      {text.split('').map((char, i) => {
        const p = spring({
          frame,
          fps,
          delay: delay + i * 2.5,
          config: {damping: 13, mass: 0.5},
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px) scale(${interpolate(
                p,
                [0, 1],
                [0.7, 1],
              )})`,
              whiteSpace: 'pre',
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  // Gentle push-in for the whole scene, plus a fade-out at the very end.
  const zoom = interpolate(frame, [0, durationInFrames], [1.08, 1]);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames - 1],
    [1, 0],
    {extrapolateLeft: 'clamp'},
  );

  const lineWidth = spring({frame, fps, delay: 62, config: {damping: 18}});
  const subtitle = spring({frame, fps, delay: 72, config: {damping: 18}});

  return (
    <AbsoluteFill style={{opacity: fadeOut}}>
      <Background />
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <Particles />
        <Ring />
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            fontFamily:
              'Helvetica, "Helvetica Neue", Arial, system-ui, sans-serif',
            color: 'white',
          }}
        >
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              letterSpacing: 6,
              textShadow: `0 0 60px ${ACCENT}66`,
            }}
          >
            <Title text="RIKY FALCO" delay={26} />
          </div>

          <div
            style={{
              width: interpolate(lineWidth, [0, 1], [0, 420]),
              height: 3,
              marginTop: 18,
              borderRadius: 3,
              background: `linear-gradient(90deg, transparent, ${ACCENT_2}, transparent)`,
            }}
          />

          <div
            style={{
              marginTop: 26,
              fontSize: 30,
              letterSpacing: 14,
              opacity: subtitle * 0.85,
              transform: `translateY(${interpolate(subtitle, [0, 1], [24, 0])}px)`,
            }}
          >
            MOTION · CODE · DESIGN
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
