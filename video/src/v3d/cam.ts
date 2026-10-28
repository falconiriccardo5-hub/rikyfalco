import * as THREE from 'three';

export type CamSpec = {pos: [number, number, number]; look: [number, number, number]; fov: number};
export const mixCam = (a: CamSpec, b: CamSpec, p: number): CamSpec => ({
  pos: [0, 1, 2].map((i) => a.pos[i] + (b.pos[i] - a.pos[i]) * p) as [number, number, number],
  look: [0, 1, 2].map((i) => a.look[i] + (b.look[i] - a.look[i]) * p) as [number, number, number],
  fov: a.fov + (b.fov - a.fov) * p,
});

const tmp = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 100);
const v = new THREE.Vector3();
/** proiezione di un punto 3D in pixel dello schermo 1080×1920 */
export const project = (c: CamSpec, p: [number, number, number], W = 1080, H = 1920): [number, number] => {
  tmp.fov = c.fov;
  tmp.aspect = W / H;
  tmp.position.set(...c.pos);
  tmp.lookAt(...c.look);
  tmp.updateProjectionMatrix();
  tmp.updateMatrixWorld();
  v.set(...p).project(tmp);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
};
