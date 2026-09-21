"use client";

import { useEffect, useRef } from "react";

// Recreation of the "blerry.app" animated ribbon-stripe gradient
// (21st.dev community gradients, "Ribbon Field" style), re-tinted to our
// own brand green scale (@talentos/ui-tokens color.css) instead of the
// original Indigo/Ink/Vermilion preset. Angle/wave mechanics match exactly;
// the static (wave = 0) cross-section is the authoritative CSS
// linear-gradient stop table.
const ANGLE_DEG = 38;
const WAVE = 14;
const BACKDROP = "#003A44"; // --tui-green-900

// One period of the ribbon, expressed as CSS linear-gradient stop
// percentages — this is the ground truth: at wave = 0 the canvas render
// below reduces exactly to `linear-gradient(38deg, ...)` with these stops.
const STOPS: [number, string][] = [
  [0, "#003A44"], // --tui-green-900
  [3, "#003A44"],
  [35.5, "#003A44"],
  [41.5, "#4894A5"], // --tui-green-500
  [62.5, "#4894A5"],
  [68.98, "#0B5F6E"], // --tui-green-700
  [96.52, "#0B5F6E"],
  [100, "#0B5F6E"],
];

const GRAIN_SVG =
  "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.210'/></svg>\")";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const STOP_RGB = STOPS.map(([p, hex]) => [p, hexToRgb(hex)] as const);

function sampleStop(percent: number): [number, number, number] {
  const p = Math.min(100, Math.max(0, percent));
  for (let i = 0; i < STOP_RGB.length - 1; i++) {
    const [p0, c0] = STOP_RGB[i]!;
    const [p1, c1] = STOP_RGB[i + 1]!;
    if (p >= p0 && p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
      return [
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
      ];
    }
  }
  return STOP_RGB[STOP_RGB.length - 1]![1];
}

export function RibbonGradient({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const angleRad = (ANGLE_DEG * Math.PI) / 180;
    const dir = [Math.cos(angleRad), Math.sin(angleRad)];
    const perp = [-Math.sin(angleRad), Math.cos(angleRad)];

    let width = 0;
    let height = 0;
    let image: ImageData | null = null;

    function resize() {
      if (!canvas || !container) return;
      width = Math.max(1, Math.round(container.clientWidth));
      height = Math.max(1, Math.round(container.clientHeight));
      canvas.width = width;
      canvas.height = height;
      image = ctx!.createImageData(width, height);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let raf = 0;
    const start = performance.now();

    function render(now: number) {
      if (!ctx || !image) {
        raf = requestAnimationFrame(render);
        return;
      }

      const t = (now - start) / 1000;
      const ph = t * 1.0;
      const waveClock = 20.75 + ph * 1.2;

      // Gradient-line extent along `angle` and `perp`, matching how the
      // CSS `linear-gradient(angle, ...)` spec sizes its line to the box.
      const corners = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
      ];
      let p0 = Infinity;
      let p1 = -Infinity;
      let q0 = Infinity;
      let q1 = -Infinity;
      for (const [cx, cy] of corners) {
        const along = cx * dir[0]! + cy * dir[1]!;
        const cross = cx * perp[0]! + cy * perp[1]!;
        if (along < p0) p0 = along;
        if (along > p1) p1 = along;
        if (cross < q0) q0 = cross;
        if (cross > q1) q1 = cross;
      }
      const alongSpan = p1 - p0 || 1;
      const crossSpan = q1 - q0 || 1;

      const data = image.data;
      let i = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const along = x * dir[0]! + y * dir[1]!;
          const cross = x * perp[0]! + y * perp[1]!;
          const crossNorm = (cross - q0) / crossSpan;

          const waveOffset = reduceMotion
            ? 0
            : (WAVE / 100) *
              0.35 *
              Math.sin(crossNorm * 2.4 * 2 * Math.PI + waveClock);

          const alongBent = along + waveOffset * alongSpan;
          const percent = ((alongBent - p0) / alongSpan) * 100;

          const [r, g, b] = sampleStop(percent);
          data[i++] = r;
          data[i++] = g;
          data[i++] = b;
          data[i++] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={className} style={{ backgroundColor: BACKDROP }}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: GRAIN_SVG,
          backgroundSize: "120px 120px",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
