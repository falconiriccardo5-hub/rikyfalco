import { useEffect, useRef } from 'react';
import { LAND_B64, LAND_H, LAND_W } from '../lib/landmask';

type P = [number, number, number, number]; // x, y, z, highlight (0..1)

function buildPoints(): P[] {
  const bytes = Uint8Array.from(atob(LAND_B64), (c) => c.charCodeAt(0));
  const isLand = (lat: number, lon: number) => {
    const x = Math.min(LAND_W - 1, Math.floor(((lon + 180) / 360) * LAND_W));
    const y = Math.min(LAND_H - 1, Math.floor(((90 - lat) / 180) * LAND_H));
    const i = y * LAND_W + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
  const pts: P[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let lat = -84; lat <= 84; lat += 1.7) {
    const step = 1.7 / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += step) {
      if (!isLand(lat, lon)) continue;
      const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
      pts.push([Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo), rnd() < 0.035 ? 0.4 + rnd() * 0.6 : 0]);
    }
  }
  return pts;
}

export default function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const pts = buildPoints();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, angle = -0.35, visible = true, last = performance.now();
    const tilt = -0.38;
    const ct = Math.cos(tilt), st = Math.sin(tilt);

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(canvas);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const dt = Math.min(64, t - last); last = t;
      if (!reduced) angle += dt * 0.00009;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const R = Math.min(w * 0.38, h * 0.4);
      const cx = w * 0.55, cy = h * 0.5;
      ctx.clearRect(0, 0, w, h);

      // alone esterno
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
      halo.addColorStop(0, 'rgba(139,92,246,0.45)'); halo.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

      // anello (metà posteriore)
      const ring = (front: boolean) => {
        ctx.save(); ctx.translate(cx, cy + R * 0.12); ctx.rotate(-0.16);
        ctx.strokeStyle = front ? 'rgba(221,214,254,0.55)' : 'rgba(196,181,253,0.25)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.ellipse(0, 0, R * 1.55, R * 0.3, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
        ctx.restore();
      };
      ring(false);

      // sfera
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, 'rgba(14,8,30,0.92)'); g.addColorStop(0.72, 'rgba(26,12,56,0.9)'); g.addColorStop(0.9, 'rgba(76,36,170,0.75)'); g.addColorStop(1, 'rgba(196,181,253,0.95)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      const ca = Math.cos(angle), sa = Math.sin(angle);
      const pulse = (Math.sin(t * 0.002) + 1) / 2;
      for (const [x0, y0, z0, hl] of pts) {
        const x = x0 * ca + z0 * sa;
        const z1 = -x0 * sa + z0 * ca;
        const y = y0 * ct - z1 * st;
        const z = y0 * st + z1 * ct;
        if (z <= 0.02) continue;
        const px = cx + x * R, py = cy + y * R;
        const light = 0.25 + 0.75 * Math.max(0, z * 0.8 + (-x * 0.25) + (-y * 0.2));
        if (hl) {
          const s = 2.2 + hl * 2.2 + pulse * hl * 1.5;
          ctx.fillStyle = `rgba(233,213,255,${0.25 * z})`; ctx.beginPath(); ctx.arc(px, py, s * 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(245,240,255,${0.9 * z})`; ctx.beginPath(); ctx.arc(px, py, s * 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
          const s = 1.15 + z * 0.75;
          ctx.fillStyle = `rgba(${185 + light * 60 | 0},${160 + light * 80 | 0},255,${0.3 + light * 0.7})`;
          ctx.fillRect(px - s / 2, py - s / 2, s, s);
        }
      }
      ring(true);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
