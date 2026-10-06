"use client";

import { useEffect, useRef } from "react";

/**
 * Pianeta viola animato — componente per header/hero.
 *
 * Uso:
 *   <PurplePlanet className="h-[420px] w-[420px]" />
 *
 * Props opzionali per personalizzare velocità, inclinazione, anello e fluttuazione.
 */

// Punti delle terre emerse (lat, lon ×10, int16) generati da Natural Earth 50m.
const DOTS_B64 =
  "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ZABw/WQAf/1kAI/9ZAB3/2QAhv9kAJX/ZACk/2QAtP9kAMP/ZADS/2QA4f9kAPH/ZAAAAGQADwBkAB8AZAAuAGQAPQBkAEwAZABcAGQAawBkAHoAZACJAGQAmQBkAKgAZAC3AGQAxgBkANYAZADlAGQA9ABkAAMBZAATAWQAIgFkADEBZABAAWQAUAFkAF8BZABuAWQAfQFkAI0BZACcAWQAqwFkALoBZADKAWQA2QFkAOgBZAD3AWQA+wJkAAoDZADgA2QAHQRkANQEcwCm/HMAtfxzADD9cwBn/3MAdv9zAIX/cwCV/3MApP9zALP/cwDD/3MA0v9zAOH/cwDx/3MAAABzAA8AcwAeAHMALgBzAD0AcwBMAHMAXABzAGsAcwB6AHMAigBzAJkAcwCoAHMAuABzAMcAcwDWAHMA5gBzAPUAcwAEAXMAFAFzACMBcwAyAXMAQgFzAFEBcwBgAXMAcAFzAH8BcwCOAXMAnQFzAK0BcwD5AXMA/gJzAA0DcwAcA3MA5ANzABIEcwAhBHMAMARzAEAEcwDJBIIAl/yCAKb8ggC2/IIAXv+CAG3/ggB9/4IAjP+CAJz/ggCr/4IAuv+CAMr/ggDZ/4IA6f+CAPj/ggAIAIIAFwCCACcAggA2AIIARgCCAFUAggBkAIIAdACCAIMAggCTAIIAogCCALIAggDBAIIA0QCCAOAAggDvAIIA/wCCAA4BggAeAYIALQGCAD0BggBMAYIAXAGCAGsBggB7AYIAigGCAJkBggCpAYIAuAGCAO0CggD9AoIADAOCABwDggDlA4IA9AOCAAMEggATBIIAIgSCADIEggBBBIIAvQSRAHT8kQCE/JEAk/yRAKP8kQCy/JEAXf+RAGz/kQB8/5EAi/+RAJv/kQCq/5EAuv+RAMn/kQDZ/5EA6P+RAPj/kQAIAJEAFwCRACcAkQA2AJEARgCRAFUAkQBlAJEAdACRAIQAkQCTAJEAowCRALIAkQDCAJEA0QCRAOEAkQDwAJEAAAGRAA8BkQAfAZEALgGRAD4BkQBNAZEAXQGRAGwBkQB8AZEAiwGRAJsBkQC6AZEAygGRANkBkQDpAZEA8AKRAAADkQAPA5EAHwORANkDkQDpA5EA+AORAAgEkQAXBJEAJwSRADYEoAA2/KAARfygAGX8oAB0/KAAhPygAGP/oABz/6AAg/+gAJL/oACi/6AAsv+gAMH/oADR/6AA4f+gAPD/oAAAAKAAEACgAB8AoAAvAKAAPwCgAE4AoABeAKAAbgCgAH0AoACNAKAAnQCgAKwAoAC8AKAAywCgANsAoADrAKAA+gCgAAoBoAAaAaAAKQGgADkBoABJAaAAWAGgAGgBoAB4AaAAhwGgALYBoADGAaAA1gGgAOUBoAD1AaAABQKgAOACoADvAqAA/wKgAA8DoAAeA6AAuwOgANoDoADqA6AA+QOgAAkEoAAZBKAAKASgADgEoAC1BK8AFfyvACX8rwA1/K8ARPyvAFT8rwBk/K8AdPyvAIT8rwBq/68Aef+vAIn/rwCZ/68Aqf+vALn/rwDI/68A2P+vAOj/rwD4/68ACACvABcArwAnAK8ANwCvAEcArwBWAK8AZgCvAHYArwCGAK8AlgCvAKUArwC1AK8AxQCvANUArwDlAK8A9ACvAAQBrwAUAa8AJAGvADQBrwBDAa8AUwGvAGMBrwBzAa8AggGvALIBrwDCAa8A0QGvAOEBrwDxAa8AAQKvABECrwAgAq8A3gKvAO4CrwD9Aq8ADQOvAB0DrwAtA68APQOvALsDrwDLA68A2gOvAOoDrwD6A68ACgSvABoErwApBK8AuAS+APX7vgAF/L4AFPy+ACT8vgA0/L4AdPy+AIT8vgCU/L4AM/2+AEP9vgBh/74Acf++AIH/vgCQ/74AoP++ALD/vgDA/74A0P++AOD/vgDw/74AAAC+ABAAvgAgAL4AMAC+AEAAvgBQAL4AYAC+AHAAvgB/AL4AjwC+AJ8AvgCvAL4AvwC+AM8AvgDfAL4A7wC+AP8AvgAPAb4AHwG+AC8BvgA/Ab4ATwG+AF4BvgBuAb4AngG+AK4BvgC+Ab4AzgG+AN4BvgDuAb4A/gG+AA4CvgAeAr4ALgK+AD0CvgDdAr4A7QK+AP0CvgANA74AHAO+ACwDvgA8A74ATAO+ALwDvgDMA74A3AO+AOwDvgD7A74ACwS+ABsEvgBLBM0A4/vNAPP7zQAD/M0AE/zNACP8zQAz/M0AhPzNAJT8zQAE/c0AFP3NAGf/zQB3/80Ah//NAJf/zQCn/80At//NAMf/zQDX/80A5//NAPf/zQAIAM0AGADNACgAzQA4AM0ASADNAFgAzQBoAM0AeADNAIgAzQCYAM0AqADNALgAzQDIAM0A2ADNAOgAzQD5AM0ACQHNABkBzQApAc0AOQHNAEkBzQBZAc0AaQHNAJkBzQCpAc0AuQHNAMoBzQDaAc0A6gHNAPoBzQAKAs0AGgLNACoCzQA6As0A2wLNAOsCzQD7As0ACwPNABsDzQArA80AOwPNAEsDzQBbA80ArAPNALwDzQDMA80A3APNAOwDzQD8A80ADATNABwEzQBMBNwA4vvcAPL73AAC/NwAE/zcACP83AC1/NwA5fzcAPb83ABe/9wAbv/cAH7/3ACO/9wAn//cAK//3AC//9wAz//cAOD/3ADw/9wAAADcABAA3AAgANwAMQDcAEEA3ABRANwAYQDcAHIA3ACCANwAkgDcAKIA3ACyANwAwwDcANMA3ADjANwA8wDcAAMB3AAUAdwAJAHcADQB3ABEAdwAVQHcAGUB3ACVAdwApgHcALYB3ADGAdwA1gHcAOYB3AD3AdwABwLcABcC3AAnAtwAOALcAEgC3AC5AtwAygLcANoC3ADqAtwA+gLcAAoD3AAbA9wAKwPcADsD3ABLA9wAWwPcAGwD3AB8A9wAnAPcAK0D3AC9A9wAzQPcAN0D3ADtA9wA/gPcAA4E3AAeBNwALgTcAD4E3ABPBNwAXwTrAOD76wDw++sAAfzrABH86wAh/OsAZP/rAHT/6wCF/+sAlf/rAKX/6wC2/+sAxv/rANb/6wDn/+sA9//rAAgA6wAYAOsAKADrADkA6wBJAOsAWQDrAGoA6wB6AOsAigDrAJsA6wCrAOsAvADrAMwA6wDcAOsA7QDrAP0A6wANAesAHgHrAC4B6wA+AesATwHrAF8B6wCQAesAoQHrALEB6wDBAesA0gHrAOIB6wDyAesAAwLrABMC6wAkAusANALrAEQC6wC3AusAxwLrANgC6wDoAusA+ALrAAkD6wAZA+sAKQPrADoD6wBKA+sAWgPrAGsD6wB7A+sAjAPrAJwD6wCsA+sAvQPrAM0D6wDdA+sA7gPrAP4D6wAOBOsAHwTrAC8E6wBABOsAUATrAGAE6wBxBOsAgQTrALIE+gCg+/oA0vv6AOP7+gDz+/oABPz6ABT8+gAl/PoAc//6AIT/+gCU//oApf/6ALX/+gDG//oA1//6AOf/+gD4//oACAD6ABkA+gApAPoAOgD6AEsA+gBbAPoAbAD6AHwA+gCNAPoAngD6AK4A+gC/APoAzwD6AOAA+gDxAPoAAQH6ABIB+gAiAfoAMwH6AEQB+gBUAfoAdQH6AIYB+gCWAfoApwH6ALgB+gDIAfoA2QH6AOkB+gD6AfoALAL6AKAC+gCwAvoAwQL6ANIC+gDiAvoA8wL6AAMD+gAUA/oAJQP6ADUD+gBGA/oAVgP6AGcD+gB4A/oAiAP6AJkD+gCpA/oAugP6AMsD+gDbA/oA7AP6APwD+gANBPoAHQT6AC4E+gA/BPoATwT6AGAE+gBwBPoAgQT6AJIE+gCiBAkBoPsJAcL7CQHT+wkB5PsJAfX7CQEF/AkBFvwJASf8CQHP/AkBgf8JAZL/CQGj/wkBs/8JAcT/CQHV/wkB5v8JAff/CQEIAAkBGAAJASkACQE6AAkBSwAJAVwACQFsAAkBfQAJAY4ACQGfAAkBsAAJAcEACQHRAAkB4gAJAfMACQEEAQkBFQEJASUBCQE2AQkBRwEJAXoBCQGKAQkBmwEJAawBCQG9AQkBzgEJAd8BCQHvAQkBQwIJAVQCCQFlAgkBdgIJAYcCCQGYAgkBqAIJAbkCCQHKAgkB2wIJAewCCQH9AgkBDQMJAR4DCQEvAwkBQAMJAVEDCQFhAwkBcgMJAYMDCQGUAwkBpQMJAbYDCQHGAwkB1wMJAegDCQH5AwkBCgQJARoECQErBAkBPAQJAU0ECQFeBAkBbwQJAX8ECQGQBAkBoQQYAZH7GAG0+xgBxfsYAdb7GAHn+xgB+PsYAQn8GAEa/BgBK/wYAcX8GAHW/BgBkf8YAaL/GAGz/xgBxP8YAdX/GAHm/xgB9/8YAQkAGAEaABgBKwAYATwAGAFNABgBXgAYAW8AGAGAABgBkQAYAaIAGAGzABgBxAAYAdUAGAHmABgB9wAYAQgBGAEaARgBKwEYATwBGAFNARgBbwEYAYABGAGRARgBogEYAbMBGAHEARgB1QEYAeYBGAEIAhgBGQIYASsCGAE8AhgBTQIYAV4CGAFvAhgBgAIYAZECGAGiAhgBswIYAcQCGAHVAhgB5gIYAfcCGAEIAxgBGQMYASoDGAE7AxgBTQMYAV4DGAFvAxgBgAMYAZEDGAGiAxgBswMYAcQDGAHVAxgB5gMYAfcDGAEIBBgBGQQYASoEGAE7BBgBTAQYAV4EGAFvBBgBgAQYAZEEGAGiBBgBswQnAYD7JwGR+ycBovsnAbT7JwHF+ycB1vsnAej7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";

interface DotsBuffer {
  data: Float32Array;
}

function decodeDots(b64: string): DotsBuffer {
  const bin = atob(b64);
  const n = bin.length / 4;
  const out = new Float32Array(n * 3);
  const buf = new DataView(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) buf.setUint8(i, bin.charCodeAt(i));
  for (let k = 0; k < n; k++) {
    const lat = (buf.getInt16(k * 4, true) / 10) * (Math.PI / 180);
    const lon = (buf.getInt16(k * 4 + 2, true) / 10) * (Math.PI / 180);
    out[k * 3] = lat;
    out[k * 3 + 1] = lon;
    // ~5% dei punti sono "città" viola che pulsano
    out[k * 3 + 2] = Math.random() < 0.05 ? Math.random() * 6.283 : -1;
  }
  return { data: out };
}

function makeSprite(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  stops.forEach((s) => grd.addColorStop(s[0], s[1]));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

export interface PurplePlanetProps {
  /** Classe CSS applicata al contenitore (definisce la dimensione, es. "h-96 w-96"). */
  className?: string;
  /** Velocità di rotazione. 1 = default. */
  speed?: number;
  /** Inclinazione dell'asse in gradi. */
  tilt?: number;
  /** Mostra l'anello orbitale con satellite. */
  orbit?: boolean;
  /** Leggero movimento su/giù. */
  float?: boolean;
}

export default function PurplePlanet({
  className,
  speed = 1,
  tilt = 24,
  orbit = true,
  float = true,
}: PurplePlanetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DOTS = decodeDots(DOTS_B64).data;
    const DOT_WHITE = makeSprite(32, [
      [0, "rgba(245,238,255,1)"],
      [0.45, "rgba(220,200,255,0.9)"],
      [1, "rgba(200,170,255,0)"],
    ]);
    const DOT_GLOW = makeSprite(64, [
      [0, "rgba(255,245,255,1)"],
      [0.12, "rgba(214,160,255,1)"],
      [0.35, "rgba(150,70,255,0.55)"],
      [1, "rgba(120,40,255,0)"],
    ]);

    const tiltRad = tilt * (Math.PI / 180);
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rot = -1.45; // parte centrata su Europa/Asia
    let last = performance.now();
    let w = 0,
      h = 0,
      dpr = 1;
    let rafId = 0;

    function resize() {
      if (!container || !canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    function orbitParams(cx: number, cy: number, R: number, t: number) {
      return {
        cx,
        cy: cy + R * 0.18,
        rx: R * 1.32,
        ry: R * 0.2,
        ang: -0.12,
        sat: (t * 0.35 * speed) % 6.283,
        R,
      };
    }

    function drawOrbit(
      o: ReturnType<typeof orbitParams>,
      front: boolean
    ) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(o.cx, o.cy);
      ctx.rotate(o.ang);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = Math.max(1, o.R * 0.006);
      ctx.strokeStyle = front
        ? "rgba(225,205,255,0.6)"
        : "rgba(200,170,255,0.25)";
      ctx.beginPath();
      if (front) ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI);
      else ctx.ellipse(0, 0, o.rx, o.ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      const a = o.sat;
      const sin = Math.sin(a);
      if (sin > 0 === front) {
        const sx = Math.cos(a) * o.rx;
        const sy = sin * o.ry;
        const g = o.R * 0.11 * (front ? 1 : 0.7);
        ctx.globalAlpha = front ? 1 : 0.5;
        ctx.drawImage(DOT_GLOW, sx - g, sy - g, g * 2, g * 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function frame(now: number) {
      if (!ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) rot += dt * 0.12 * speed;
      const t = now / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const R = Math.min(w, h) * 0.34;
      const cx = w / 2;
      const cy = h / 2 + (float && !reduced ? Math.sin(t * 0.8) * R * 0.03 : 0);
      const breathe = 0.9 + 0.1 * Math.sin(t * 1.3);

      // alone esterno (atmosfera)
      ctx.globalCompositeOperation = "lighter";
      const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.45);
      atm.addColorStop(0, `rgba(150,70,255,${0.55 * breathe})`);
      atm.addColorStop(0.18, `rgba(125,45,255,${0.32 * breathe})`);
      atm.addColorStop(0.5, "rgba(90,20,200,0.10)");
      atm.addColorStop(1, "rgba(60,0,160,0)");
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.45, 0, 6.283);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const orb = orbit ? orbitParams(cx, cy, R, t) : null;
      if (orb) drawOrbit(orb, false);

      // corpo del pianeta
      const body = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R);
      body.addColorStop(0, "#0c0717");
      body.addColorStop(0.7, "#07040e");
      body.addColorStop(1, "#1a0838");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 6.283);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 6.283);
      ctx.clip();

      const haze = ctx.createRadialGradient(cx, cy + R * 0.35, 0, cx, cy + R * 0.35, R * 1.1);
      haze.addColorStop(0, "rgba(120,50,255,0.10)");
      haze.addColorStop(1, "rgba(120,50,255,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      const ct = Math.cos(tiltRad);
      const st = Math.sin(tiltRad);
      const ds = Math.max(1.2, R * 0.0105);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < DOTS.length; i += 3) {
        const lat = DOTS[i];
        const lon = DOTS[i + 1] + rot;
        const ph = DOTS[i + 2];
        const cl = Math.cos(lat);
        const x = cl * Math.sin(lon);
        const y = Math.sin(lat);
        const z = cl * Math.cos(lon);
        const y2 = y * ct - z * st;
        const z2 = y * st + z * ct;
        if (z2 < 0.02) continue;
        const sx = cx + x * R;
        const sy = cy - y2 * R;
        const fade = Math.pow(z2, 0.6);
        if (ph >= 0) {
          const p = 0.55 + 0.45 * Math.sin(t * 2.2 + ph);
          const gs = ds * (3 + 2 * p) * (0.5 + 0.5 * fade);
          ctx.globalAlpha = fade * (0.6 + 0.4 * p);
          ctx.drawImage(DOT_GLOW, sx - gs, sy - gs, gs * 2, gs * 2);
        } else {
          const s = ds * (0.55 + 0.45 * fade);
          ctx.globalAlpha = 0.18 + 0.72 * fade;
          ctx.drawImage(DOT_WHITE, sx - s, sy - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;

      const rim = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
      rim.addColorStop(0, "rgba(120,40,255,0)");
      rim.addColorStop(0.6, "rgba(120,40,255,0.06)");
      rim.addColorStop(0.88, "rgba(140,60,255,0.45)");
      rim.addColorStop(1, "rgba(215,170,255,0.95)");
      ctx.fillStyle = rim;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      const key = ctx.createRadialGradient(
        cx - R * 0.55,
        cy - R * 0.75,
        0,
        cx - R * 0.55,
        cy - R * 0.75,
        R * 1.1
      );
      key.addColorStop(0, "rgba(190,130,255,0.22)");
      key.addColorStop(1, "rgba(190,130,255,0)");
      ctx.fillStyle = key;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();

      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = Math.max(1, R * 0.008);
      ctx.strokeStyle = `rgba(230,200,255,${0.55 * breathe})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R - ctx.lineWidth / 2, 0, 6.283);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      if (orb) drawOrbit(orb, true);

      rafId = requestAnimationFrame(frame);
    }

    resize();
    rafId = requestAnimationFrame(frame);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(container);
    } else {
      window.addEventListener("resize", resize);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
  }, [speed, tilt, orbit, float]);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
