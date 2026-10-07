import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Dumbbell} from '../ui';
import {C, E, FONT, OUT, mix, prog, shake, useT} from '../brand';
import {Riky} from '../Riky';
import {WallCalendar, Month} from '../Calendar';

export const S1_MONTHS: Month[] = [
  {name: 'GENNAIO', days: 31, off: 3, t0: 0.5, step: 0.05},
  {name: 'FEBBRAIO', days: 28, off: 0, t0: 1.55, step: 0.04},
  {name: 'MARZO', days: 31, off: 0, t0: 2.4, step: 0.05},
];
export const S1_FLIPS = [1.2, 2.0];

export const S1: React.FC = () => {
  const t = useT();
  const drop = prog(t, 0, 0.45, E.bounce);
  const calY = mix(-900, 0, drop);
  const calSk = shake(t, 0.4, 8, 0.25);
  const rIn = prog(t, 1.95, 2.45, E.back);
  const shrug = prog(t, 2.9, 3.2, E.back);
  const wob = Math.sin(t * 9) * 2;
  const q = prog(t, 3.1, 3.4, E.back);
  const qs = shake(t, 3.1, 10, 0.4);
  const blink = (t % 2.6) > 2.5 ? 1 : 0;
  const talk = t > 0.25 && t < 1.5 ? Math.abs(Math.sin(t * 14)) * 0.7 : 0;
  return (
    <AbsoluteFill>
      <Bg />
      <FullSvg>
        <circle cx={1450} cy={640} r={330} fill={C.blue} transform={`scale(${mix(0, 1, prog(t, 1.9, 2.5, E.back))})`} style={{transformOrigin: '1450px 640px'}} />
        <Dumbbell x={1730} y={250} s={0.9} rot={-24} />
        <Dumbbell x={1180} y={930} s={0.6} rot={18} color={C.ink} />
        <Riky
          x={1450}
          y={mix(1300, 1010, rIn)}
          scale={0.62}
          mouth={0}
          smile={mix(1, 0, shrug)}
          brow={shrug * 14}
          browTilt={-shrug * 6}
          lid={blink}
          look={mix(0, -10, shrug)}
          tilt={shrug * -6 + wob * 0.2}
          armL={{hand: [mix(273, 215, shrug), mix(822, 700, shrug)]}}
          armR={{hand: [mix(547, 605, shrug), mix(822, 700, shrug)]}}
          sy={1 + Math.sin(t * 3) * 0.004}
          bob={shrug * 4}
        />
        {q > 0 && (
          <text
            x={0}
            y={0}
            fontFamily={FONT}
            fontWeight={900}
            fontSize={190}
            fill={C.cream}
            stroke={C.ink}
            strokeWidth={10}
            paintOrder="stroke"
            textAnchor="middle"
            transform={`translate(${1610 + qs.x},${330 + qs.y}) rotate(12) scale(${q})`}
          >
            ?
          </text>
        )}
      </FullSvg>
      <div style={{position: 'absolute', left: 170 + calSk.x, top: 330 + calY + calSk.y, transform: 'rotate(-2deg)'}}>
        <WallCalendar months={S1_MONTHS} flips={S1_FLIPS} />
      </div>
    </AbsoluteFill>
  );
};
