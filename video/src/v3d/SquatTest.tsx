import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useVideoConfig} from 'remotion';
import {Studio, StudioLights, useStudioTex} from './studio';
import {Girl3D, basePose, squatPose, GOBLET_ARMS} from './chars';

const Cam: React.FC = () => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    camera.position.set(-6.5, 1.0, 0.0);
    camera.lookAt(0, 0.8, 0);
    // @ts-expect-error fov
    camera.fov = 30;
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
};

export const SquatTest: React.FC = () => {
  const {width, height} = useVideoConfig();
  const tex = useStudioTex();
  if (!tex) return null;
  const b = basePose();
  const cfg: [number, number, number][] = [
    [0, 0, 0],
    [0.5, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [1, 0, 1],
  ];
  return (
    <ThreeCanvas width={width} height={height} shadows style={{background: '#EADBC6'}}>
      <Cam />
      <StudioLights />
      <Studio tex={tex} />
      {cfg.map(([sq, hu, wk], i) => (
        <Girl3D key={i} p={{...squatPose({...b, x: 0, z: -2.0 + i * 1.0, ry: 0}, sq, hu, wk), ...GOBLET_ARMS}} x={{goblet: true, lumbarGlow: wk}} />
      ))}
    </ThreeCanvas>
  );
};
