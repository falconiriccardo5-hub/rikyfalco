import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "./fonts";
import { Character, CharacterStyle } from "./character/Character";


const BG: Record<CharacterStyle, string> = {
  cartoon: "linear-gradient(160deg, #FFF4E6 0%, #FFE0CC 100%)",
  white: "linear-gradient(160deg, #1A2A6C 0%, #0B1233 100%)",
  sketch: "#F7F1E3",
};

const INK: Record<CharacterStyle, string> = {
  cartoon: "#1B1F2E",
  white: "#FFFFFF",
  sketch: "#2E2A26",
};

const Label: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <div
    style={{
      fontFamily,
      fontWeight: 600,
      fontSize: 34,
      color,
      opacity: 0.75,
      textAlign: "center",
      marginTop: 8,
    }}
  >
    {text}
  </div>
);

type SheetProps = {
  readonly variant: CharacterStyle;
};

export const CharacterSheet: React.FC<SheetProps> = ({ variant }) => {
  const ink = INK[variant];
  const cells = [
    { label: "Fronte", el: <Character view="front" variant={variant} mouth="smile" /> },
    { label: "Lato", el: <Character view="side" variant={variant} mouth="smile" /> },
    { label: "Retro", el: <Character view="back" variant={variant} /> },
    {
      label: "Alzata (piano scapolare)",
      el: <Character view="front" variant={variant} armAngle={85} mouth="talk" talk={0.6} />,
    },
  ];
  return (
    <AbsoluteFill style={{ background: BG[variant], padding: 60 }}>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 72,
          color: ink,
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
          color: ink,
          opacity: 0.6,
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        Model sheet – stile {variant}
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
            <Label text={c.label} color={ink} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const StyleCompare: React.FC = () => {
  const styles: { v: CharacterStyle; name: string }[] = [
    { v: "cartoon", name: "A · Cartoon flat" },
    { v: "white", name: "B · Omino bianco" },
    { v: "sketch", name: "C · Matita / sketch" },
  ];
  return (
    <AbsoluteFill style={{ flexDirection: "row" }}>
      {styles.map((s) => (
        <div
          key={s.v}
          style={{
            flex: 1,
            background: BG[s.v],
            display: "flex",
            flexDirection: "column",
            padding: "50px 40px",
          }}
        >
          <div
            style={{
              fontFamily,
              fontWeight: 800,
              fontSize: 54,
              color: INK[s.v],
              textAlign: "center",
            }}
          >
            {s.name}
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: 30 }}>
            <Character view="front" variant={s.v} armAngle={80} mouth="smile" />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
