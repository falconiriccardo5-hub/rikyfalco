import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 120%, #7c3aed 0%, #2e1065 45%, #07070b 75%)", color: "white", fontSize: 512 * 0.36, fontWeight: 600, letterSpacing: -512 * 0.02 }}>
        RF
      </div>
    ),
    size,
  );
}
