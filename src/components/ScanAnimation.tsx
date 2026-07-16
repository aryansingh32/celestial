import { useEffect, useState } from "react";

const STAGES = [
  "Initializing Cosmic Link",
  "Detecting Palm Lines",
  "Mapping Life Path",
  "Reading Destiny Markers",
  "Interpreting Energy Flow",
  "Consulting the Stars",
  "Aligning Chakras",
  "Calculating Karma",
  "Generating Jyotish Reading",
];

export function ScanAnimation({ imageDataUrl, onDone, durationMs = 7000 }: {
  imageDataUrl?: string;
  onDone: () => void;
  durationMs?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      
      // Progress asymptotically approaches 96% over 40-60 seconds so it never freezes
      const p = 0.96 * (1 - Math.exp(-elapsed / 15000));
      setProgress(p);
      
      // Cycle through stage texts every 3.5 seconds
      const stageIdx = Math.floor(elapsed / 3500) % STAGES.length;
      setStage(stageIdx);
      
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden">
      {imageDataUrl ? (
        <img src={imageDataUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[2px]" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.4),rgba(0,0,0,0.9))]" />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6">
        <div className="relative h-[min(70vw,420px)] w-[min(70vw,420px)]">
          {/* rotating aura */}
          <div className="absolute -inset-8 animate-rotate-slow">
            <div className="h-full w-full rounded-full bg-[conic-gradient(from_0deg,transparent,oklch(0.72_0.17_285/0.5),transparent,oklch(0.85_0.15_85/0.5),transparent)] blur-3xl opacity-80" />
          </div>
          {/* palm lines SVG animated */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="lg1" x1="0" x2="1">
                <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
                <stop offset="100%" stopColor="oklch(0.72 0.17 285)" />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="1.6" /></filter>
            </defs>
            {/* palm outline */}
            <path d="M50 190 V110 c0-6 8-6 8 0 V80 c0-6 8-6 8 0 V60 c0-6 8-6 8 0 V80 M90 80 V50 c0-6 8-6 8 0 V80 M106 80 V45 c0-6 8-6 8 0 V80 M122 80 V60 c0-6 8-6 8 0 V115 c0 40-20 75-55 75 z"
              fill="none" stroke="url(#lg1)" strokeWidth="1.2" opacity="0.5" />
            {/* major lines with dash reveal */}
            {[
              "M60 150 C 80 145, 110 140, 135 160",
              "M62 135 C 85 125, 115 118, 138 128",
              "M65 120 C 80 108, 105 98, 128 108",
              "M78 175 C 82 160, 88 145, 100 130",
            ].map((d, i) => (
              <path key={i} d={d} fill="none" stroke="url(#lg1)" strokeWidth="1.6" strokeLinecap="round"
                strokeDasharray="1000" strokeDashoffset="1000" filter="url(#glow)"
                style={{ animation: `trace-line ${1.6 + i * 0.4}s ease-out ${i * 0.5}s forwards` }} />
            ))}
          </svg>
          {/* scan sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-[oklch(0.85_0.15_85/0.55)] to-transparent"
              style={{ animation: "scan-line 2.2s linear infinite" }} />
          </div>
        </div>

        <div className="w-[min(80vw,420px)] text-center">
          <div className="mb-3 font-serif-display text-2xl text-gradient-gold min-h-[2.2rem]">
            {STAGES[stage]}…
          </div>
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,oklch(0.72_0.17_285),oklch(0.85_0.15_85))]"
              style={{ width: `${progress * 100}%`, transition: "width 120ms linear", boxShadow: "0 0 12px oklch(0.85 0.15 85 / 0.8)" }} />
          </div>
          <p className="mt-4 font-sans-ui text-[10px] uppercase tracking-[0.4em] text-white/50">
            Consulting the ancient patterns of your palm
          </p>
        </div>
      </div>
    </div>
  );
}