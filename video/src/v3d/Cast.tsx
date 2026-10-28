import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useVideoConfig} from 'remotion';
import {Studio, StudioLights, useStudioTex} from './studio';
import {Riky3D, Girl3D, basePose, squatPose, GOBLET_ARMS} from './chars';

const Cam: React.FC<{pos: [number, number, number]; look: [number, number, number]; fov: number}> = ({pos, look, fov}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    // @ts-expect-error fov
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, pos, look, fov]);
  return null;
};

export const Cast: React.FC<{view: number}> = ({view}) => {
  const {width, height} = useVideoConfig();
  const views: {pos: [number, number, number]; look: [number, number, number]; fov: number}[] = [
    {pos: [0, 1.4, 6.5], look: [0, 1.1, 0], fov: 40},
    {pos: [-4.2, 1.1, 0.6], look: [0, 0.9, 0.4], fov: 32},
    {pos: [0, 2.2, 9], look: [0, 1.6, -2], fov: 55},
  ];
  const v = views[view];
  const b = basePose();
  const tex = useStudioTex();
  if (!tex) return null;
  return (
    <ThreeCanvas width={width} height={height} shadows style={{background: '#EADBC6'}}>
      <Cam {...v} />
      <StudioLights />
      <Studio tex={tex} />
      <Riky3D p={{...b, x: 0.9, z: 0, ry: -0.3, mouth: 0.0}} />
      <Girl3D p={{...squatPose({...b, x: -0.6, z: 0.4, ry: 0.4}, 0.0), ...GOBLET_ARMS}} x={{goblet: true}} />
      <Girl3D p={{...squatPose({...b, x: -2.0, z: 0.0, ry: Math.PI / 2}, 0.9, 0, 0), ...GOBLET_ARMS}} x={{goblet: true}} />
    </ThreeCanvas>
  );
};
