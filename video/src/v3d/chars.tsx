/** Personaggi 3D "clay" fedeli ai riferimenti (refs/01 Riccardo, refs/02 ragazza allenata).
 *  Origine ai piedi, y in alto, personaggio rivolto verso +z. Rig: anche → busto → testa, braccia e gambe a 2 segmenti. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Kettlebell} from './studio';

export type Arm = {sx: number; sz: number; ex: number; sy?: number};
export type Leg = {tx: number; kx: number; fx: number};
export type Pose = {
  x: number;
  z: number;
  ry: number;
  hipY: number;
  hipZ: number;
  spine: number; // inclinazione busto (+ in avanti)
  lumbar: number; // flessione lombare extra (schiena che si arrotonda)
  pelvis: number;
  headX: number;
  headY: number;
  armL: Arm;
  armR: Arm;
  legL: Leg;
  legR: Leg;
  mouth: number; // 0..1 apertura (lip-sync)
  smile: number; // -1 broncio .. 1 sorriso
  blink: number; // 0 aperti .. 1 chiusi
};

export const REST_ARM: Arm = {sx: 0, sz: 0.12, ex: -0.15};
export const basePose = (hipY = 0.72): Pose => ({
  x: 0,
  z: 0,
  ry: 0,
  hipY,
  hipZ: 0,
  spine: 0,
  lumbar: 0,
  pelvis: 0,
  headX: 0,
  headY: 0,
  armL: REST_ARM,
  armR: REST_ARM,
  legL: {tx: 0, kx: 0, fx: 0},
  legR: {tx: 0, kx: 0, fx: 0},
  mouth: 0,
  smile: 0.7,
  blink: 0,
});

const Mat: React.FC<{c: string; r?: number; t?: number; e?: string}> = ({c, r = 0.55, t, e}) => (
  <meshStandardMaterial color={c} roughness={r} transparent={t !== undefined} opacity={t ?? 1} emissive={e ?? '#000'} emissiveIntensity={e ? 0.6 : 0} depthWrite={t === undefined} />
);

/** cilindro "a capsula" lungo -y, dalla posizione 0 a -len */
const Limb: React.FC<{len: number; r0: number; r1?: number; c: string; y0?: number}> = ({len, r0, r1, c, y0 = 0}) => (
  <group position={[0, y0, 0]}>
    <mesh castShadow position={[0, -len / 2, 0]}>
      <cylinderGeometry args={[r0, r1 ?? r0, len, 20]} />
      <Mat c={c} />
    </mesh>
    <mesh castShadow>
      <sphereGeometry args={[r0, 20, 14]} />
      <Mat c={c} />
    </mesh>
    <mesh castShadow position={[0, -len, 0]}>
      <sphereGeometry args={[r1 ?? r0, 20, 14]} />
      <Mat c={c} />
    </mesh>
  </group>
);

const up = new THREE.Vector3(0, 1, 0);
const Spike: React.FC<{p: [number, number, number]; d: [number, number, number]; r: number; h: number; c: string}> = ({p, d, r, h, c}) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...d).normalize()), [d]);
  const off = useMemo(() => new THREE.Vector3(...d).normalize().multiplyScalar(h / 2), [d, h]);
  return (
    <mesh castShadow position={[p[0] + off.x, p[1] + off.y, p[2] + off.z]} quaternion={q}>
      <coneGeometry args={[r, h, 16]} />
      <Mat c={c} r={0.45} />
    </mesh>
  );
};

const Ellip: React.FC<{p: [number, number, number]; s: [number, number, number]; c: string; rot?: [number, number, number]; r?: number; t?: number; e?: string}> = ({p, s, c, rot, r, t, e}) => (
  <mesh castShadow={t === undefined} position={p} scale={s} rotation={rot}>
    <sphereGeometry args={[1, 28, 20]} />
    <Mat c={c} r={r} t={t} e={e} />
  </mesh>
);

/** volto: occhi neri lucidi, bocca sorriso / aperta */
const Face: React.FC<{R: number; mouth: number; smile: number; blink: number; girl?: boolean}> = ({R, mouth, smile, blink, girl}) => {
  const ex = girl ? 0.108 : 0.105;
  const ey = 0.02;
  const ez = Math.sqrt(R * R - ex * ex - ey * ey) * 0.93;
  const eyeS: [number, number, number] = [girl ? 0.046 : 0.043, (girl ? 0.062 : 0.058) * (1 - 0.9 * blink), 0.03];
  const my = -0.12;
  const mz = Math.sqrt(R * R - my * my) * 0.93 + 0.004;
  const open = mouth > 0.06;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * ex, ey, ez]}>
          <Ellip p={[0, 0, 0]} s={eyeS} c="#121214" r={0.15} />
          {blink < 0.5 && <Ellip p={[0.014, 0.022, 0.022]} s={[0.012, 0.014, 0.008]} c="#FFFFFF" r={0.2} />}
          {girl && blink < 0.5 && <Spike p={[s * 0.035, 0.045, 0.0]} d={[s * 1, 0.6, 0.2]} r={0.008} h={0.03} c="#121214" />}
        </group>
      ))}
      {open ? (
        <group position={[0, my, mz]}>
          <Ellip p={[0, 0, 0]} s={[0.05 + 0.01 * mouth, 0.018 + 0.05 * mouth, 0.02]} c="#5A1E25" r={0.4} />
          <Ellip p={[0, -0.012 - 0.02 * mouth, 0.008]} s={[0.03, 0.012 + 0.012 * mouth, 0.012]} c="#E0707A" r={0.5} />
        </group>
      ) : (
        <mesh position={[0, my + (smile >= 0 ? 0.012 : -0.022), mz]} rotation={[0, 0, smile >= 0 ? Math.PI : 0]} scale={[1, Math.max(0.35, Math.abs(smile)), 1]}>
          <torusGeometry args={[0.058, 0.012, 10, 24, Math.PI]} />
          <Mat c="#5A1E25" r={0.4} />
        </mesh>
      )}
    </group>
  );
};

type Look = {skin: string; hair: string; top: string; bottom: string; bottomD: string; sole: string; accent: string; girl?: boolean};
const RIKY: Look = {skin: '#F8E6D8', hair: '#151619', top: '#141416', bottom: '#6D3BD2', bottomD: '#5A2EB6', sole: '#2A2A30', accent: '#2A2A30'};
const GIRL: Look = {skin: '#F3D3BF', hair: '#2A211F', top: '#EE6A55', bottom: '#1F6E73', bottomD: '#174F55', sole: '#FFFFFF', accent: '#7A45E0', girl: true};

const Shoe: React.FC<{L: Look}> = ({L}) => (
  <group position={[0, -0.03, 0.05]}>
    <Ellip p={[0, 0.025, 0]} s={[0.075, 0.055, 0.14]} c="#FAFAFA" r={0.5} />
    <mesh castShadow position={[0, -0.02, 0]}>
      <boxGeometry args={[0.15, 0.03, 0.28]} />
      <Mat c={L.girl ? '#FAFAFA' : L.sole} r={0.6} />
    </mesh>
    {L.girl && (
      <>
        <mesh position={[0, -0.002, 0]}>
          <boxGeometry args={[0.152, 0.012, 0.282]} />
          <Mat c="#EE6A55" />
        </mesh>
        <Ellip p={[0.072, 0.03, -0.01]} s={[0.006, 0.02, 0.08]} c={L.accent} rot={[0.3, 0, 0]} />
        <Ellip p={[-0.072, 0.03, -0.01]} s={[0.006, 0.02, 0.08]} c={L.accent} rot={[0.3, 0, 0]} />
      </>
    )}
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, 0.07 - i * 0.004, 0.03 + i * 0.03]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.07, 0.006, 0.01]} />
        <Mat c={L.girl ? L.accent : '#444'} />
      </mesh>
    ))}
  </group>
);

export type Extras = {goblet?: boolean; phone?: boolean; lumbarGlow?: number; legGlow?: number; brace?: number; bellColor?: string; bellScale?: number; chest?: number};

const Body: React.FC<{p: Pose; L: Look; x?: Extras}> = ({p, L, x = {}}) => {
  const TH = 0.32;
  const SH = 0.3;
  const R = L.girl ? 0.29 : 0.3;
  const legX = L.girl ? 0.095 : 0.1;
  const arm = (s: 1 | -1, a: Arm) => (
    <group position={[s * (L.girl ? 0.18 : 0.2), 0.34, 0]} rotation={[a.sx, a.sy ?? 0, s * a.sz]}>
      {L.girl ? (
        <Ellip p={[0, -0.02, 0]} s={[0.075, 0.08, 0.075]} c={L.skin} />
      ) : (
        <mesh castShadow position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.078, 0.085, 0.15, 20]} />
          <Mat c={L.top} />
        </mesh>
      )}
      <Limb len={0.2} r0={L.girl ? 0.052 : 0.045} r1={0.042} c={L.skin} y0={-0.04} />
      <group position={[0, -0.24, 0]} rotation={[a.ex, 0, 0]}>
        <Limb len={0.19} r0={0.042} r1={0.038} c={L.skin} />
        {L.girl && s === 1 && (
          <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.043, 0.014, 10, 24]} />
            <Mat c={L.accent} r={0.4} />
          </mesh>
        )}
        <Ellip p={[0, -0.235, 0.005]} s={[0.05, 0.058, 0.05]} c={L.skin} />
        {x.phone && s === -1 && (
          <group position={[0.0, -0.27, 0.04]} rotation={[-0.2, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.085, 0.16, 0.012]} />
              <Mat c="#1B1B20" r={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.007]}>
              <planeGeometry args={[0.075, 0.145]} />
              <meshBasicMaterial color="#8E6CF0" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
  const leg = (s: 1 | -1, l: Leg) => (
    <group position={[s * legX, 0, 0]} rotation={[l.tx, 0, 0]}>
      {/* coscia: pantaloncino + pelle */}
      <mesh castShadow position={[0, L.girl ? -0.06 : -0.1, 0]}>
        <cylinderGeometry args={[L.girl ? 0.095 : 0.1, L.girl ? 0.088 : 0.095, L.girl ? 0.13 : 0.2, 22]} />
        <Mat c={L.bottom} />
      </mesh>
      {L.girl ? (
        <mesh position={[s * 0.07, -0.06, 0]}>
          <boxGeometry args={[0.035, 0.13, 0.12]} />
          <Mat c={L.bottomD} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.103, 0.103, 0.035, 22]} />
          <Mat c={L.bottomD} />
        </mesh>
      )}
      <Limb len={TH - (L.girl ? 0.12 : 0.2)} r0={L.girl ? 0.078 : 0.06} r1={L.girl ? 0.06 : 0.055} c={L.skin} y0={L.girl ? -0.12 : -0.2} />
      {x.legGlow ? <Ellip p={[0, -0.16, 0.0]} s={[0.12, 0.2, 0.12]} c="#9B6CFF" e="#6D3BD2" r={0.3} t={0.2 + 0.35 * x.legGlow} /> : null}
      <group position={[0, -TH, 0]} rotation={[l.kx, 0, 0]}>
        <Limb len={SH} r0={0.055} r1={0.045} c={L.skin} />
        {L.girl && <Ellip p={[0, -0.1, -0.03]} s={[0.058, 0.09, 0.055]} c={L.skin} />}
        <group position={[0, -SH, 0]} rotation={[l.fx, 0, 0]}>
          <Shoe L={L} />
        </group>
      </group>
    </group>
  );
  const glowLegs = x.legGlow ?? 0;
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]}>
      <group position={[0, p.hipY, p.hipZ]}>
        {/* bacino / pantaloncini */}
        <group rotation={[p.pelvis, 0, 0]}>
          <mesh castShadow position={[0, 0.03, 0]} scale={[1, 1, 0.68]}>
            <cylinderGeometry args={[L.girl ? 0.18 : 0.2, L.girl ? 0.2 : 0.21, L.girl ? 0.18 : 0.22, 28]} />
            <Mat c={L.bottom} />
          </mesh>
          {!L.girl && (
            <mesh position={[0, 0.13, 0]} scale={[1, 1, 0.68]}>
              <cylinderGeometry args={[0.2, 0.2, 0.03, 28]} />
              <Mat c={L.bottomD} />
            </mesh>
          )}
          {L.girl && <Ellip p={[0, 0.0, -0.08]} s={[0.17, 0.11, 0.1]} c={L.bottom} />}
        </group>
        {leg(1, p.legL)}
        {leg(-1, p.legR)}
        {glowLegs > 0 && null}
        {/* busto */}
        <group position={[0, 0.1, 0]} rotation={[p.spine, 0, 0]}>
          <group rotation={[p.lumbar, 0, 0]}>
            <mesh castShadow position={[0, 0.2, 0]} scale={[1 + 0.06 * (x.chest ?? 0), 1, 0.64 * (1 + 0.12 * (x.chest ?? 0))]}>
              <cylinderGeometry args={[L.girl ? 0.17 : 0.2, L.girl ? 0.155 : 0.19, 0.42, 28]} />
              <Mat c={L.top} />
            </mesh>
            {[-1, 1].map((s) => (
              <Ellip key={s} p={[s * (L.girl ? 0.15 : 0.17), 0.37, 0]} s={[0.09, 0.07, 0.09]} c={L.girl ? L.skin : L.top} />
            ))}
            {L.girl && (
              <>
                <Ellip p={[0, 0.27, 0.035]} s={[0.15, 0.085, 0.085]} c={L.top} />
                <Ellip p={[0, 0.41, 0.0]} s={[0.12, 0.04, 0.09]} c={L.skin} />
              </>
            )}
            {x.lumbarGlow ? <Ellip p={[0, 0.05, -0.08]} s={[0.13 + 0.04 * x.lumbarGlow, 0.11 + 0.03 * x.lumbarGlow, 0.09]} c="#FF4545" e="#FF2020" r={0.3} t={0.25 + 0.4 * x.lumbarGlow} /> : null}
            {x.brace ? (
              <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.66, 1]}>
                <torusGeometry args={[0.215, 0.022 * x.brace, 12, 40]} />
                <meshStandardMaterial color="#8C5CF5" emissive="#6D3BD2" emissiveIntensity={0.8} />
              </mesh>
            ) : null}
            {arm(1, p.armL)}
            {arm(-1, p.armR)}
            {x.goblet && <Kettlebell p={[0, 0.06 - 0.05 * ((x.bellScale ?? 1) - 1), 0.24 + 0.06 * ((x.bellScale ?? 1) - 1)]} c={x.bellColor ?? '#1F7A80'} s={0.95 * (x.bellScale ?? 1)} rot={[0, 0, 0]} />}
            {/* collo + testa */}
            <mesh castShadow position={[0, 0.46, 0]}>
              <cylinderGeometry args={[0.055, 0.06, 0.09, 16]} />
              <Mat c={L.skin} />
            </mesh>
            <group position={[0, 0.5, 0]} rotation={[p.headX, p.headY, 0]}>
              <group position={[0, R * 0.92, 0]}>
                <mesh castShadow scale={[1, 0.96, 0.93]}>
                  <sphereGeometry args={[R, 48, 36]} />
                  <Mat c={L.skin} r={0.6} />
                </mesh>
                {[-1, 1].map((s) => (
                  <Ellip key={s} p={[s * R * 0.97, 0.0, 0.0]} s={[0.035, 0.06, 0.045]} c={L.skin} />
                ))}
                <Face R={R * 0.94} mouth={p.mouth} smile={p.smile} blink={p.blink} girl={L.girl} />
                {L.girl ? <GirlHair R={R} c={L.hair} acc={L.accent} /> : <RikyHair R={R} c={L.hair} />}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const RikyHair: React.FC<{R: number; c: string}> = ({R, c}) => (
  <group>
    <mesh castShadow position={[0, 0.03, -0.02]} rotation={[-0.55, 0, 0]}>
      <sphereGeometry args={[R * 1.06, 40, 30, 0, Math.PI * 2, 0, 1.72]} />
      <Mat c={c} r={0.45} />
    </mesh>
    <Ellip p={[0, -0.02, -0.12]} s={[R * 1.02, R * 0.85, R * 0.9]} c={c} r={0.45} />
    {/* frangia a ciuffi */}
    {[
      [-0.17, 0.17, 0.2, -0.6, -0.5, 0.6],
      [-0.08, 0.2, 0.23, -0.25, -0.6, 0.7],
      [0.02, 0.21, 0.24, 0.05, -0.6, 0.75],
      [0.11, 0.2, 0.22, 0.35, -0.55, 0.7],
      [0.19, 0.16, 0.18, 0.7, -0.45, 0.55],
    ].map(([x, y, z, dx, dy, dz], i) => (
      <Spike key={'f' + i} p={[x, y, z]} d={[dx, dy, dz]} r={0.07} h={0.16} c={c} />
    ))}
    {/* punte in alto */}
    {[
      [-0.12, 0.27, 0.0, -0.5, 1, -0.2],
      [0.0, 0.3, -0.02, 0.1, 1, -0.4],
      [0.12, 0.27, 0.0, 0.6, 1, -0.2],
      [-0.06, 0.26, 0.1, -0.3, 1, 0.5],
      [0.07, 0.26, 0.1, 0.4, 1, 0.6],
      [-0.24, 0.12, -0.05, -1, 0.4, -0.1],
      [0.24, 0.12, -0.05, 1, 0.4, -0.1],
    ].map(([x, y, z, dx, dy, dz], i) => (
      <Spike key={'t' + i} p={[x, y, z]} d={[dx, dy, dz]} r={0.075} h={0.15} c={c} />
    ))}
  </group>
);

const GirlHair: React.FC<{R: number; c: string; acc: string}> = ({R, c, acc}) => (
  <group>
    <mesh castShadow position={[0, 0.03, -0.02]} rotation={[-0.5, 0, 0]}>
      <sphereGeometry args={[R * 1.06, 40, 30, 0, Math.PI * 2, 0, 1.7]} />
      <Mat c={c} r={0.45} />
    </mesh>
    <Ellip p={[0, -0.02, -0.12]} s={[R * 1.0, R * 0.86, R * 0.9]} c={c} r={0.45} />
    {/* frangia laterale + ciocche */}
    <Ellip p={[-0.1, 0.16, 0.2]} s={[0.13, 0.08, 0.07]} c={c} rot={[0.5, 0.2, 0.5]} />
    <Ellip p={[0.06, 0.19, 0.21]} s={[0.12, 0.07, 0.07]} c={c} rot={[0.6, -0.2, -0.35]} />
    <Ellip p={[0.17, 0.12, 0.17]} s={[0.07, 0.09, 0.06]} c={c} rot={[0.4, -0.3, -0.6]} />
    {[-1, 1].map((s) => (
      <Ellip key={s} p={[s * 0.255, -0.06, 0.0]} s={[0.035, 0.15, 0.05]} c={c} rot={[0.15, 0, s * -0.1]} />
    ))}
    {/* coda alta con elastico viola */}
    <mesh position={[0, 0.26, -0.18]} rotation={[0.9, 0, 0]}>
      <torusGeometry args={[0.055, 0.022, 12, 28]} />
      <Mat c={acc} r={0.4} />
    </mesh>
    <Ellip p={[0, 0.28, -0.3]} s={[0.1, 0.11, 0.12]} c={c} />
    <Ellip p={[0, 0.14, -0.38]} s={[0.085, 0.16, 0.09]} c={c} rot={[-0.3, 0, 0]} />
    <Ellip p={[0, -0.04, -0.38]} s={[0.06, 0.13, 0.065]} c={c} rot={[0.2, 0, 0]} />
    <Spike p={[0, -0.14, -0.36]} d={[0, -1, 0.15]} r={0.05} h={0.12} c={c} />
  </group>
);

export const Riky3D: React.FC<{p: Pose; x?: Extras}> = ({p, x}) => <Body p={p} L={RIKY} x={x} />;
export const Girl3D: React.FC<{p: Pose; x?: Extras}> = ({p, x}) => <Body p={p} L={GIRL} x={x} />;

/* ------------------------------------------------------------------ pose helper */
const TH = 0.32;
const SHN = 0.3;
/** angolo (rotazione attorno a x) per un osso che a riposo punta verso -y e deve puntare lungo (dy, dz) */
const ang = (dy: number, dz: number) => Math.atan2(-dz, -dy);

/** IK della gamba nel piano y-z: anca (hy,hz) → caviglia (ay,az), ginocchio in avanti (+z) */
export const legIK = (hy: number, hz: number, ay: number, az: number, footWorld = 0): Leg => {
  const vz = az - hz;
  const vy = ay - hy;
  let d = Math.hypot(vz, vy);
  d = Math.min(Math.max(d, 0.05), TH + SHN - 0.0005);
  const uz = vz / d;
  const uy = vy / d;
  const a = (TH * TH - SHN * SHN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, TH * TH - a * a));
  // perpendicolare con componente z positiva
  let nz = uy;
  let ny = -uz;
  if (nz < 0) {
    nz = -nz;
    ny = -ny;
  }
  const kz = hz + a * uz + h * nz;
  const ky = hy + a * uy + h * ny;
  const thA = ang(ky - hy, kz - hz);
  const shA = ang(ay - ky, az - kz);
  return {tx: thA, kx: shA - thA, fx: footWorld - shA};
};

/** squat (goblet): sq 0..1 profondità; heelUp talloni sollevati; wink bacino che si arrotonda */
export const squatPose = (base: Pose, sq: number, heelUp = 0, wink = 0): Pose => {
  const ay = 0.1 + heelUp * 0.07;
  const az = heelUp * 0.03;
  const hipY = base.hipY - 0.36 * sq + heelUp * 0.02;
  const hipZ = -0.22 * sq + heelUp * 0.07;
  const footW = Math.asin(Math.min(1, (heelUp * 0.07) / 0.2));
  const leg = legIK(hipY, hipZ, ay, az, footW);
  return {
    ...base,
    hipY,
    hipZ,
    spine: 0.08 + 0.32 * sq + 0.45 * heelUp * sq,
    lumbar: 0.4 * wink,
    pelvis: -0.4 * wink,
    headX: -0.3 * sq,
    legL: leg,
    legR: leg,
  };
};

/** braccia per tenere il kettlebell al petto (goblet) */
export const GOBLET_ARMS = {armL: {sx: -0.55, sz: 0.25, ex: -1.75} as Arm, armR: {sx: -0.55, sz: 0.25, ex: -1.75} as Arm};
