import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

/** Precarica texture da public/ (da usare FUORI da <ThreeCanvas>), bloccando il render finché sono pronte. */
export const useTextures = (paths: string[]) => {
  const key = paths.join('|');
  const [tex, setTex] = useState<Record<string, THREE.Texture> | null>(() => (paths.every((p) => cache.has(p)) ? Object.fromEntries(paths.map((p) => [p, cache.get(p)!])) : null));
  const [handle] = useState(() => (tex ? null : delayRender('textures ' + key)));
  useEffect(() => {
    if (tex) return;
    Promise.all(
      paths.map(
        (p) =>
          new Promise<[string, THREE.Texture]>((res, rej) => {
            if (cache.has(p)) return res([p, cache.get(p)!]);
            new THREE.TextureLoader().load(
              staticFile(p),
              (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                t.anisotropy = 4;
                cache.set(p, t);
                res([p, t]);
              },
              undefined,
              (e) => rej(e),
            );
          }),
      ),
    ).then((all) => {
      setTex(Object.fromEntries(all));
      if (handle !== null) continueRender(handle);
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return tex;
};

/** Texture generata su canvas (memo per chiave). */
const ccache = new Map<string, THREE.CanvasTexture>();
export const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const hit = ccache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  ccache.set(key, t);
  return t;
};
