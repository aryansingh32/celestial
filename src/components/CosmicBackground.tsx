import { useEffect, useRef } from "react";

/** Ambient floating-particle canvas. Lightweight, requestAnimationFrame based. */
export function CosmicBackground({ density = 60 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const particles = Array.from({ length: density }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      hue: Math.random() < 0.5 ? 45 : 275,
      a: 0.3 + Math.random() * 0.5,
    }));
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const x = p.x * w, y = p.y * h;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, p.r * 8);
        grd.addColorStop(0, `hsla(${p.hue},80%,75%,${p.a})`);
        grd.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, p.r * 8, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [density]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}