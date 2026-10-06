import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Riccardo Falconi — Coaching", short_name: "RF Coaching", start_url: "/dashboard", display: "standalone",
    background_color: "#07070b", theme_color: "#07070b", lang: "it",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
