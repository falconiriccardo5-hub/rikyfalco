import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "./fonts";
import { Woman, W_COLORS } from "./character/Woman";

const DOUBLE_BICEPS = { upper: 92, fore: 86 };

export const WomanSheet: React.FC = () => {
  const cells = [
    { label: "Fronte", el: <Woman view="front" face="smile" /> },
    {
      label: "Preoccupata",
      el: (
        <Woman view="front" face="worried" armR={{ upper: 16, fore: -150 }} dumbbellR dumbbellScale={0.7} dumbbellColor={W_COLORS.pink} />
      ),
    },
    {
      label: "Lato (curl)",
      el: <Woman view="side" face="smile" armR={{ upper: 4, fore: -125 }} armL={{ upper: 4, fore: -125 }} dumbbellR dumbbellL />,
    },
    {
      label: "Fantasia",
      el: <Woman view="front" face="flex" bulk={1} armL={DOUBLE_BICEPS} armR={DOUBLE_BICEPS} />,
    },
    { label: "Settimana 1", el: <Woman view="front" face="smile" tone={0} /> },
    { label: "Settimana 16", el: <Woman view="front" face="proud" tone={1} /> },
  ];
  return (
    <AbsoluteFill style={{ background: "#F6F4EF", padding: "40px 40px 20px" }}>
      <div style={{ fontFamily, fontWeight: 800, fontSize: 64, textAlign: "center", color: "#111" }}>Model sheet · Lei</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
          flex: 1,
          minHeight: 0,
          gap: 10,
          marginTop: 10,
        }}
      >
        {cells.map((c) => (
          <div key={c.label} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0, padding: "20px 90px 0" }}>{c.el}</div>
            <div style={{ fontFamily, fontWeight: 600, fontSize: 32, textAlign: "center", color: "#111", opacity: 0.7 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
