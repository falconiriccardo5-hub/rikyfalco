import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SWRegister } from "@/components/sw-register";
export const metadata: Metadata = {
  title: { default: "Riccardo Falconi — Coaching", template: "%s · RF Coaching" },
  description: "Coaching management system",
  applicationName: "RF Coaching",
  appleWebApp: { capable: true, title: "RF Coaching", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#07070b", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="ambient">{children}<SWRegister /></body>
    </html>
  );
}
