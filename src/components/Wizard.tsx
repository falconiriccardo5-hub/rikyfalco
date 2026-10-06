import type React from 'react';
import { useState } from 'react';

// Mago in pixel-art. Se in /public metti un file "mascot.png" (es. il tuo sprite originale)
// verrà usato quello al posto del disegno SVG.
const MAP = [
  '...O..................',
  '..oOo.........k.......',
  '...o.........kPk......',
  '...g........kPhk......',
  '...g.......kPhhk......',
  '...g......kPhhhhk.....',
  '...g.....kPhhhhhk.....',
  '...g....kPhhhhhhhk....',
  '...g..kkkkkkkkkkkkkk..',
  '...g....kffffffffk....',
  '...g....kfeffffefk....',
  '...g....kffwwwwffk....',
  '...gs..kpkwwwwwwkpk...',
  '...gsskppPwwwwwwPppk..',
  '...g..kppPpwwwwpPpppk.',
  '...g..kpPPppwwppPPppk.',
  '...g.kppPppppppppPpppk',
  '...g.kpPpppppppppPpppk',
  '...g.kppPPppppppPPpppk',
  '...g..kkppppppppppkkk.',
  '...g....kkkkkkkkkk....',
];
const COLORS: Record<string, string> = {
  k: '#120a20', h: '#2a1a4d', P: '#6a3fc0', p: '#3d2373', f: '#0b0614', e: '#e9d5ff', w: '#b9b0d6',
  g: '#7a5a34', o: '#a78bfa', O: '#f5f0ff', s: '#d8b494',
};

function PixelWizard({ className }: { className?: string }) {
  const w = MAP[0].length, h = MAP.length;
  const rects: React.ReactElement[] = [];
  MAP.forEach((row, y) => [...row].forEach((ch, x) => {
    if (COLORS[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={COLORS[ch]} />);
  }));
  return (
    <svg className={className} viewBox={`-1 -1 ${w + 2} ${h + 2}`} shapeRendering="crispEdges" aria-hidden="true">{rects}</svg>
  );
}

export default function Wizard({ className }: { className?: string }) {
  const [fallback, setFallback] = useState(false);
  if (fallback) return <PixelWizard className={className} />;
  return <img className={className} src="/mascot.png" alt="" aria-hidden="true" onError={() => setFallback(true)} />;
}
