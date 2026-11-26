import { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

function projectPoint(
  p: Point3D,
  angleY: number,
  tiltX: number,
  width: number,
  height: number,
  scale: number,
): ProjectedPoint {
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const rx = p.x * cosY - p.z * sinY;
  const rz = p.x * sinY + p.z * cosY;

  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const py = p.y - 2.3;
  const ry = py * cosX - rz * sinX;
  const finalZ = py * sinX + rz * cosX;

  const camDist = 15;
  const perspective = camDist / Math.max(camDist - finalZ, 1);

  return {
    x: width * 0.54 + rx * scale * perspective,
    y: height * 0.56 - ry * scale * perspective,
    depth: finalZ,
  };
}

interface BoxDrawOptions {
  cx?: number;
  cy: number;
  cz?: number;
  w: number;
  h: number;
  d: number;
  angleY: number;
  tiltX: number;
  width: number;
  height: number;
  scale: number;
  fillStyle: string;
  topFillStyle?: string;
  strokeStyle: string;
  lineWidth?: number;
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  {
    cx = 0,
    cy,
    cz = 0,
    w,
    h,
    d,
    angleY,
    tiltX,
    width,
    height,
    scale,
    fillStyle,
    topFillStyle,
    strokeStyle,
    lineWidth = 1.2,
  }: BoxDrawOptions,
) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  const vertices: Point3D[] = [
    { x: cx - hw, y: cy - hh, z: cz - hd },
    { x: cx + hw, y: cy - hh, z: cz - hd },
    { x: cx + hw, y: cy - hh, z: cz + hd },
    { x: cx - hw, y: cy - hh, z: cz + hd },
    { x: cx - hw, y: cy + hh, z: cz - hd },
    { x: cx + hw, y: cy + hh, z: cz - hd },
    { x: cx + hw, y: cy + hh, z: cz + hd },
    { x: cx - hw, y: cy + hh, z: cz + hd },
  ];

  const projected = vertices.map((v) => projectPoint(v, angleY, tiltX, width, height, scale));

  const faces: Array<{ indices: [number, number, number, number]; isTop: boolean }> = [
    { indices: [0, 1, 2, 3], isTop: false },
    { indices: [4, 5, 6, 7], isTop: true },
    { indices: [0, 1, 5, 4], isTop: false },
    { indices: [1, 2, 6, 5], isTop: false },
    { indices: [2, 3, 7, 6], isTop: false },
    { indices: [3, 0, 4, 7], isTop: false },
  ];

  const sortedFaces = faces
    .map((face) => ({
      ...face,
      avgDepth:
        face.indices.reduce((sum, idx) => sum + (projected[idx]?.depth ?? 0), 0) /
        face.indices.length,
    }))
    .sort((a, b) => a.avgDepth - b.avgDepth);

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  for (const face of sortedFaces) {
    ctx.fillStyle = face.isTop && topFillStyle ? topFillStyle : fillStyle;
    ctx.beginPath();
    face.indices.forEach((idx, i) => {
      const pt = projected[idx]!;
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function ArchitecturalShowcaseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    const startTime = performance.now();

    const syncSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = Math.max(parent.clientHeight, 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    const renderFrame = (now: number) => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth ?? 600;
      const height = Math.max(parent?.clientHeight ?? 600, 1);
      const scale = Math.min(width, height) * 0.086;

      ctx.clearRect(0, 0, width, height);

      const elapsed = prefersReducedMotion ? 10 : (now - startTime) / 1000;
      const angleY = 0.56 + Math.sin(elapsed * 0.28) * 0.16;
      const tiltX = 0.36;

      // Blueprint floor grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
      ctx.lineWidth = 1;
      for (let g = -6; g <= 6; g += 1) {
        const a = projectPoint({ x: g, y: 0, z: -6 }, angleY, tiltX, width, height, scale);
        const b = projectPoint({ x: g, y: 0, z: 6 }, angleY, tiltX, width, height, scale);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const c = projectPoint({ x: -6, y: 0, z: g }, angleY, tiltX, width, height, scale);
        const d = projectPoint({ x: 6, y: 0, z: g }, angleY, tiltX, width, height, scale);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      // 7-story stepped architectural tower with glowing core & wireframe shell
      const floorCount = 7;
      const cycle = prefersReducedMotion ? floorCount + 2 : (elapsed * 0.45) % (floorCount + 4);

      for (let i = 0; i < floorCount; i += 1) {
        const progress = prefersReducedMotion ? 1 : Math.max(0, Math.min(1, cycle - i * 0.55));
        const eased = 1 - Math.pow(1 - progress, 3);
        if (eased <= 0.03) continue;

        const isRoofSlab = i === floorCount - 1;
        const w = (isRoofSlab ? 2.6 : 3.2) * (0.9 + 0.1 * eased);
        const d = (isRoofSlab ? 2.2 : 2.7) * (0.9 + 0.1 * eased);
        const h = (isRoofSlab ? 0.22 : 0.68) * eased;
        const centerY = isRoofSlab ? 0.35 + i * 0.72 - 0.12 : 0.35 + i * 0.72;

        // Solid glowing structural core
        drawBox(ctx, {
          cy: isRoofSlab ? centerY + 0.11 : centerY,
          w: w * 0.36,
          h: isRoofSlab ? 0.18 * eased : h * 0.88,
          d: d * 0.36,
          angleY,
          tiltX,
          width,
          height,
          scale,
          fillStyle: "rgba(34, 211, 238, 0.78)",
          topFillStyle: "rgba(125, 211, 252, 0.94)",
          strokeStyle: "rgba(186, 230, 253, 0.5)",
          lineWidth: 0.8,
        });

        // Glass & blueprint wireframe shell
        drawBox(ctx, {
          cy: centerY,
          w,
          h,
          d,
          angleY,
          tiltX,
          width,
          height,
          scale,
          fillStyle: "rgba(37, 99, 235, 0.15)",
          topFillStyle: "rgba(56, 189, 248, 0.2)",
          strokeStyle: "rgba(56, 189, 248, 0.72)",
          lineWidth: 1.1,
        });
      }

      // 3D architectural crane mast & horizontal jib framing the left side
      drawBox(ctx, {
        cx: -2.5,
        cy: 3.05,
        cz: 1.45,
        w: 0.16,
        h: 6.1,
        d: 0.16,
        angleY,
        tiltX,
        width,
        height,
        scale,
        fillStyle: "#b45309",
        topFillStyle: "#d97706",
        strokeStyle: "rgba(251, 191, 36, 0.55)",
        lineWidth: 0.8,
      });

      drawBox(ctx, {
        cx: -1.05,
        cy: 5.95,
        cz: 1.45,
        w: 3.3,
        h: 0.14,
        d: 0.14,
        angleY,
        tiltX,
        width,
        height,
        scale,
        fillStyle: "#b45309",
        topFillStyle: "#eab308",
        strokeStyle: "rgba(251, 191, 36, 0.55)",
        lineWidth: 0.8,
      });

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none z-0 opacity-90"
    />
  );
}
