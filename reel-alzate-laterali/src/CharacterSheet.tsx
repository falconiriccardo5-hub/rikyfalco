import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "./fonts";
import { COLORS, Character } from "./character/Character";

const INK = COLORS.line;

export const CharacterSheet: React.FC = () => {
  const cells = [
    { label: "Fronte", el: <Character view="front" mouth="smile" /> },
    { label: "Lato", el: <Character view="side" mouth="smile" /> },
    { label: "Retro", el: <Character view="back" /> },
    {
      label: "Alzata laterale",
      el: <Character view="front" armAngle={85} mouth="talk" talk={0.6} />,
    },
  ];
  return (
    <AbsoluteFill style={{ background: COLORS.paper, padding: 60 }}>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 72,
          color: INK,
          textAlign: "center",
          marginTop: 40,
        }}
      >
        Coach Riky
      </div>
      <div
        style={{
          fontFamily,
          fontWeight: 600,
          fontSize: 36,
          color: INK,
          opacity: 0.55,
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        Model sheet
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: 0,
          flex: 1,
          gap: 30,
        }}
      >
        {cells.map((c) => (
          <div key={c.label} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0, padding: "10px 40px" }}>{c.el}</div>
            <div
              style={{
                fontFamily,
                fontWeight: 600,
                fontSize: 34,
                color: INK,
                opacity: 0.7,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const CharacterHero: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.paper, padding: "120px 140px" }}>
    <Character view="front" mouth="smile" dumbbells={false} />
  </AbsoluteFill>
);
