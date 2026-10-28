import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const Test3D: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} shadows camera={{position: [0, 1.6, 6], fov: 40}} style={{background: '#EDE3D3'}}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2B2E33" />
      </mesh>
      <mesh position={[0, 1 + Math.sin(f / 10) * 0.2, 0]} castShadow>
        <sphereGeometry args={[0.6, 48, 48]} />
        <meshStandardMaterial color="#6D3BD2" roughness={0.5} />
      </mesh>
    </ThreeCanvas>
  );
};
