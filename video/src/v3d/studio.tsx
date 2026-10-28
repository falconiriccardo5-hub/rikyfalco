/** Studio RF Coaching in 3D (riferimento: refs/05-studio-rf-coaching.webp). Unità: metri, y in alto, parete di fondo a z = -3. */
import React from 'react';
import * as THREE from 'three';
import {canvasTex, useTextures} from './tex';

export const STUDIO_TEX = ['studio/window.jpg', 'studio/sign.jpg', 'studio/clock.jpg', 'studio/mirror.jpg'];
export const useStudioTex = () => useTextures(STUDIO_TEX);

export const S = {
  wall: '#EADBC6',
  teal: '#1F6B76',
  wood: '#B98149',
  woodD: '#8E5E33',
  navy: '#1E2633',
  floor: '#2A2D33',
  coral: '#EE6A55',
  blueBench: '#22407A',
  purple: '#6D3BD2',
};

const M: React.FC<{c: string; r?: number; m?: number; e?: string; ei?: number}> = ({c, r = 0.7, m = 0, e, ei = 0}) => (
  <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={ei} />
);

const Box: React.FC<{p: [number, number, number]; s: [number, number, number]; c: string; r?: number; rot?: [number, number, number]; cast?: boolean}> = ({p, s, c, r, rot, cast = true}) => (
  <mesh position={p} rotation={rot} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
    <M c={c} r={r} />
  </mesh>
);

const floorTex = () =>
  canvasTex(
    'floor',
    512,
    512,
    (g) => {
      g.fillStyle = '#2B2E34';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 4000; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      g.strokeStyle = '#1E2025';
      g.lineWidth = 6;
      g.strokeRect(0, 0, 512, 512);
      g.beginPath();
      g.moveTo(256, 0);
      g.lineTo(256, 512);
      g.moveTo(0, 256);
      g.lineTo(512, 256);
      g.stroke();
    },
    [6, 6],
  );

const Dumbbell: React.FC<{p: [number, number, number]; cap: string; s?: number}> = ({p, cap, s = 1}) => (
  <group position={p} rotation={[0, 0, Math.PI / 2]} scale={s}>
    <mesh castShadow>
      <cylinderGeometry args={[0.016, 0.016, 0.3, 12]} />
      <M c="#9AA0A8" m={0.6} r={0.35} />
    </mesh>
    {[-0.12, 0.12].map((y) => (
      <group key={y} position={[0, y, 0]}>
        <mesh castShadow rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 6]} />
          <M c="#1B1D21" r={0.55} />
        </mesh>
        <mesh position={[0, y > 0 ? 0.041 : -0.041, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.006, 20]} />
          <M c={cap} r={0.4} />
        </mesh>
      </group>
    ))}
  </group>
);

export const Kettlebell: React.FC<{p: [number, number, number]; c: string; s?: number; rot?: [number, number, number]}> = ({p, c, s = 1, rot}) => (
  <group position={p} scale={s} rotation={rot}>
    <mesh castShadow position={[0, 0.11, 0]} scale={[1, 0.92, 1]}>
      <sphereGeometry args={[0.12, 32, 24]} />
      <M c={c} r={0.4} />
    </mesh>
    <mesh castShadow position={[0, 0.25, 0]}>
      <torusGeometry args={[0.065, 0.018, 12, 32, Math.PI]} />
      <M c={c} r={0.4} />
    </mesh>
    <mesh position={[0, 0.0, 0]}>
      <cylinderGeometry args={[0.07, 0.08, 0.02, 24]} />
      <M c={c} r={0.4} />
    </mesh>
  </group>
);

const Plant: React.FC<{p: [number, number, number]}> = ({p}) => (
  <group position={p}>
    <mesh castShadow position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.24, 0.2, 0.5, 32]} />
      <M c="#F2EEE6" r={0.6} />
    </mesh>
    {Array.from({length: 11}).map((_, i) => {
      const a = (i / 11) * Math.PI * 2;
      const tilt = 0.5 + (i % 3) * 0.25;
      return (
        <group key={i} position={[0, 0.5, 0]} rotation={[0, a, 0]}>
          <mesh castShadow position={[0.0, 0.45 + (i % 4) * 0.12, 0.28]} rotation={[tilt, 0, 0]} scale={[0.16, 0.55, 0.04]}>
            <sphereGeometry args={[1, 16, 12]} />
            <M c={i % 2 ? '#3E8E3A' : '#4FA545'} r={0.6} />
          </mesh>
        </group>
      );
    })}
  </group>
);

const Bench: React.FC<{p: [number, number, number]; rotY?: number}> = ({p, rotY = 0}) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <Box p={[0, 0.45, 0]} s={[0.36, 0.09, 0.62]} c={S.blueBench} r={0.5} />
    <Box p={[0, 0.72, -0.48]} s={[0.36, 0.09, 0.68]} c={S.blueBench} r={0.5} rot={[-1.0, 0, 0]} />
    <Box p={[0, 0.22, 0]} s={[0.08, 0.4, 0.08]} c="#1A1D22" />
    <Box p={[0, 0.03, 0.3]} s={[0.5, 0.06, 0.08]} c="#1A1D22" />
    <Box p={[0, 0.03, -0.55]} s={[0.5, 0.06, 0.08]} c="#1A1D22" />
    <Box p={[0, 0.2, -0.45]} s={[0.07, 0.36, 0.07]} c="#1A1D22" rot={[0.3, 0, 0]} />
  </group>
);

const Rack: React.FC<{p: [number, number, number]}> = ({p}) => {
  const top = ['#6D3BD2', '#6D3BD2', '#2E7FD1', '#2E7FD1', '#E7C437', '#E7C437', '#333', '#333'];
  const bot = ['#2FA36B', '#2FA36B', '#E7C437', '#E7C437', '#E5484D', '#E5484D'];
  return (
    <group position={p}>
      <Box p={[0, 0.62, 0]} s={[1.55, 0.04, 0.34]} c={S.navy} />
      <Box p={[0, 0.3, 0]} s={[1.55, 0.04, 0.38]} c={S.navy} />
      {[-0.76, 0.76].map((x) => (
        <Box key={x} p={[x, 0.33, 0]} s={[0.05, 0.66, 0.36]} c={S.navy} />
      ))}
      {top.map((c, i) => (
        <group key={'t' + i} position={[-0.66 + i * 0.19, 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Dumbbell p={[0, 0, 0]} cap={c} s={0.62} />
        </group>
      ))}
      {bot.map((c, i) => (
        <group key={'b' + i} position={[-0.6 + i * 0.24, 0.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Dumbbell p={[0, 0, 0]} cap={c} s={0.82} />
        </group>
      ))}
    </group>
  );
};

const MatCrate: React.FC<{p: [number, number, number]}> = ({p}) => (
  <group position={p}>
    <Box p={[0, 0.14, 0]} s={[0.5, 0.28, 0.32]} c={S.wood} r={0.6} />
    {[
      [-0.11, '#7A9A5A'],
      [0.11, S.purple],
    ].map(([x, c]) => (
      <mesh key={x as number} castShadow position={[x as number, 0.55, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.75, 24]} />
        <M c={c as string} r={0.8} />
      </mesh>
    ))}
  </group>
);

export const Studio: React.FC<{tex: Record<string, THREE.Texture> | null}> = ({tex}) => {
  const win = tex?.['studio/window.jpg'];
  const sign = tex?.['studio/sign.jpg'];
  const clock = tex?.['studio/clock.jpg'];
  const ft = floorTex();
  return (
    <group>
      {/* pavimento */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial map={ft} roughness={0.9} />
      </mesh>
      {/* parete di fondo */}
      <mesh position={[0, 2.25, -3]} receiveShadow>
        <planeGeometry args={[14, 4.5]} />
        <M c={S.wall} r={0.95} />
      </mesh>
      {/* parete destra (con specchio) */}
      <mesh position={[3.6, 2.25, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 4.5]} />
        <M c={S.wall} r={0.95} />
      </mesh>
      {/* zoccolo petrolio + battiscopa legno */}
      <Box p={[0, 0.35, -2.98]} s={[14, 0.7, 0.04]} c={S.teal} r={0.8} cast={false} />
      <Box p={[0, 0.72, -2.96]} s={[14, 0.05, 0.06]} c={S.wood} cast={false} />
      <Box p={[0, 0.04, -2.95]} s={[14, 0.08, 0.06]} c={S.wood} cast={false} />
      <Box p={[3.58, 0.35, 0]} s={[0.04, 0.7, 12]} c={S.teal} r={0.8} cast={false} />
      <Box p={[3.56, 0.72, 0]} s={[0.06, 0.05, 12]} c={S.wood} cast={false} />
      {/* finestra */}
      <group position={[-2.0, 2.15, -2.97]}>
        <Box p={[0, 0, -0.01]} s={[2.25, 1.75, 0.06]} c="#2C2F36" cast={false} />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[2.1, 1.6]} />
          {win ? <meshBasicMaterial map={win} toneMapped={false} /> : <meshBasicMaterial color="#BFE0F7" />}
        </mesh>
        <Box p={[0, -0.9, 0.06]} s={[2.4, 0.06, 0.16]} c="#2C2F36" />
      </group>
      {/* quadro RF COACHING */}
      <group position={[0.45, 2.45, -2.96]}>
        <Box p={[0, 0, 0]} s={[1.32, 0.72, 0.05]} c={S.wood} />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.22, 0.62]} />
          {sign ? <meshStandardMaterial map={sign} roughness={0.8} /> : <M c="#F2E8DA" />}
        </mesh>
      </group>
      {/* orologio */}
      <group position={[1.65, 2.6, -2.96]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 48]} />
          <M c={S.wood} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <circleGeometry args={[0.27, 48]} />
          {clock ? <meshStandardMaterial map={clock} roughness={0.8} /> : <M c="#F4EEE6" />}
        </mesh>
      </group>
      {/* listelli in legno verticali */}
      {Array.from({length: 7}).map((_, i) => (
        <Box key={i} p={[2.55 + i * 0.09, 2.0, -2.94]} s={[0.06, 4.0, 0.06]} c={i % 2 ? S.wood : S.woodD} />
      ))}
      {/* rastrelliera, kettlebell, tappetini, pianta */}
      <Rack p={[0.45, 0, -2.6]} />
      <Kettlebell p={[1.55, 0, -2.55]} c="#E7C437" s={1.1} />
      <Kettlebell p={[1.88, 0, -2.6]} c="#1F7A80" s={1.1} />
      <MatCrate p={[-0.7, 0, -2.7]} />
      <Plant p={[-3.2, 0, -2.5]} />
      {/* specchio sulla parete destra */}
      <group position={[3.56, 1.75, -1.0]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 0, 0]} s={[1.4, 2.3, 0.04]} c="#1E2025" />
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[1.3, 2.2]} />
          {tex?.['studio/mirror.jpg'] ? <meshBasicMaterial map={tex['studio/mirror.jpg']} toneMapped={false} /> : <meshStandardMaterial color="#B9C9D6" metalness={0.6} roughness={0.12} />}
        </mesh>
      </group>
      <Bench p={[2.85, 0, 0.2]} rotY={-0.25} />
      {/* tappetino corallo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.012, 0.6]} receiveShadow>
        <planeGeometry args={[1.0, 1.9]} />
        <M c={S.coral} r={0.85} />
      </mesh>
    </group>
  );
};

/** Luci dello studio: luce morbida dalla finestra + riempimento. */
export const StudioLights: React.FC = () => (
  <>
    <hemisphereLight args={['#FFF6EA', '#3A3530', 0.9]} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[-3.5, 6, 3.5]} intensity={2.0} color="#FFF3E2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0004} shadow-radius={4} />
    <pointLight position={[2, 3, 3]} intensity={6} distance={12} color="#FFE9D6" />
  </>
);
export {THREE};
