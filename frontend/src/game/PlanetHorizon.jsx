/**
 * Earth seen from a climbing rocket, drawn as pixel art on a small canvas
 * that is stretched to fill the screen (image-rendering: pixelated).
 *
 * Over `duration` ms the planet shrinks from an almost flat horizon at the
 * bottom edge to a clearly curved world with a glowing atmosphere.
 * Continents and clouds come from a fixed noise pattern, so it looks the same every time.
 */
import { useEffect, useRef } from 'react';

const W = 192; // canvas resolution: one canvas pixel = one big screen "pixel"
const H = 108;

const COLORS = {
  ocean: [47, 127, 216],
  oceanDeep: [30, 92, 178],
  land: [63, 174, 85],
  landDark: [46, 138, 68],
  cloud: [244, 249, 255],
  glow: [127, 212, 255],
};

// Small deterministic value noise
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y) {
  return smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.1, y * 2.1) * 0.3 + smoothNoise(x * 4.3, y * 4.3) * 0.1;
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function drawPlanet(ctx, image, t) {
  const e = easeInOut(t);
  const radius = lerp(900, 120, e);             // huge (flat horizon) → small (curved)
  const top = lerp(H - 6, H - 40, e);           // how far the planet reaches up the screen
  const cx = W / 2;
  const cy = top + radius;
  const spin = t * 0.35;                        // the surface drifts slowly
  const glowSize = 5;
  const data = image.data;

  for (let py = 0; py < H; py += 1) {
    for (let px = 0; px < W; px += 1) {
      const i = (py * W + px) * 4;
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius + glowSize) {
        data[i + 3] = 0;
        continue;
      }

      let color;
      let alpha = 255;

      if (dist > radius) {
        // Atmosphere: bright right at the edge, fading outward in hard pixel steps
        const k = 1 - (dist - radius) / glowSize;
        color = COLORS.glow;
        alpha = Math.round(Math.ceil(k * 3) / 3 * 200);
      } else {
        const nx = dx / radius;
        const ny = dy / radius;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lon = Math.atan2(nx, nz) + spin;
        // The horizon faces the camera, so the top of the disc shows oceans and land, not a pole
        const lat = Math.asin(Math.max(-1, Math.min(1, ny))) * 0.6;

        const landValue = fbm(lon * 2.4 + 10, lat * 2.4 + 3);
        const cloudValue = fbm(lon * 3.2 + spin * 2 + 40, lat * 5 + 7);

        if (cloudValue > 0.72) color = COLORS.cloud;
        else if (landValue > 0.56) color = landValue > 0.64 ? COLORS.landDark : COLORS.land;
        else color = landValue < 0.38 ? COLORS.oceanDeep : COLORS.ocean;

        // Darker toward the edge of the disc, and a thin bright rim of atmosphere
        const shade = 0.55 + 0.45 * nz;
        const rim = radius - dist < 1.5 ? 0.5 : 0;
        color = color.map((c, n) => Math.min(255, c * shade + COLORS.glow[n] * rim));
      }

      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function PlanetHorizon({ duration, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    const image = ctx.createImageData(W, H);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      drawPlanet(ctx, image, 0.7);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      drawPlanet(ctx, image, t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  return <canvas ref={canvasRef} className={className} width={W} height={H} aria-hidden="true" />;
}
