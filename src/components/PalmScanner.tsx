import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Sparkles, RefreshCcw } from "lucide-react";

type Props = {
  onCapture: (dataUrl: string, hints: { brightness: number; symmetry: number; fingersOpen: boolean; seed: number }) => void;
};

type Phase = "idle" | "requesting" | "denied" | "framing" | "detected" | "unsupported";

export function PalmScanner({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Place your palm inside the frame");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef({ start: 0, active: false });

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("framing");
      setMessage("Place your palm inside the frame");
    } catch {
      setPhase("denied");
    }
  }, []);

  useEffect(() => { startCamera(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, [startCamera]);

  // Simple palm-presence heuristic: sample brightness variance inside the frame region.
  useEffect(() => {
    if (phase !== "framing") return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.readyState >= 2) {
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          const w = 64, h = 64;
          c.width = w; c.height = h;
          const vw = v.videoWidth, vh = v.videoHeight;
          const cropSize = Math.min(vw, vh) * 0.6;
          const sx = (vw - cropSize) / 2, sy = (vh - cropSize) / 2;
          ctx.drawImage(v, sx, sy, cropSize, cropSize, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);
          let sum = 0, sumSq = 0, skinPixels = 0;
          const total = w * h;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const lum = (r * 0.299 + g * 0.587 + b * 0.114);
            sum += lum; sumSq += lum * lum;
            // rough skin-tone check
            if (r > 60 && g > 30 && b > 15 && r > g && r > b && Math.abs(r - g) > 10) skinPixels++;
          }
          const mean = sum / total;
          const variance = sumSq / total - mean * mean;
          const skinRatio = skinPixels / total;
          const centered = variance > 200 && skinRatio > 0.18 && mean > 40 && mean < 230;
          const now = performance.now();
          if (centered) {
            if (!holdRef.current.active) { holdRef.current = { start: now, active: true }; }
            const dur = now - holdRef.current.start;
            const p = Math.min(1, dur / 2200);
            setHoldProgress(p);
            setMessage(p > 0.4 ? "Hold still…" : "Palm detected — hold steady");
            if (p >= 1) {
              // capture full frame
              const full = document.createElement("canvas");
              full.width = vw; full.height = vh;
              full.getContext("2d")?.drawImage(v, 0, 0);
              const dataUrl = full.toDataURL("image/jpeg", 0.85);
              streamRef.current?.getTracks().forEach(t => t.stop());
              setPhase("detected");
              onCapture(dataUrl, {
                brightness: Math.min(1, mean / 255),
                symmetry: 0.4 + Math.random() * 0.5,
                fingersOpen: variance > 900,
                seed: Math.floor(Math.random() * 1e9),
              });
              return;
            }
          } else {
            holdRef.current = { start: 0, active: false };
            setHoldProgress(0);
            setMessage("Place your palm inside the frame");
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, onCapture]);

 

  const manualCapture = () => {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    const full = document.createElement("canvas");
    full.width = v.videoWidth; full.height = v.videoHeight;
    full.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = full.toDataURL("image/jpeg", 0.85);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase("detected");
    onCapture(dataUrl, { brightness: 0.5, symmetry: 0.6, fingersOpen: true, seed: Math.floor(Math.random() * 1e9) });
  };

  const skipCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase("detected");
    onCapture("", { brightness: 0.5, symmetry: 0.6, fingersOpen: true, seed: Math.floor(Math.random() * 1e9) });
  };

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <canvas ref={canvasRef} className="hidden" />
      {/* dark vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)]" />

      {/* Scan Frame */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <div className="relative aspect-square w-[min(78vw,520px)]">
          {/* rotating aura */}
          <div className="absolute -inset-6 animate-rotate-slow opacity-70">
            <div className="h-full w-full rounded-full bg-[conic-gradient(from_0deg,transparent,oklch(0.72_0.17_285/0.35),transparent,oklch(0.85_0.15_85/0.35),transparent)] blur-2xl" />
          </div>
          {/* frame */}
          <div className="absolute inset-0 rounded-[2rem] border border-white/20 backdrop-blur-[2px]" />
          {/* corner marks */}
          {["top-0 left-0","top-0 right-0 rotate-90","bottom-0 right-0 rotate-180","bottom-0 left-0 -rotate-90"].map(pos => (
            <div key={pos} className={`absolute ${pos} h-10 w-10`}>
              <div className="h-full w-full border-t-2 border-l-2 border-[color:var(--gold)] rounded-tl-xl glow-gold" />
            </div>
          ))}
          {/* scanning shimmer only while framing */}
          {phase === "framing" && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
              <div
                className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-[oklch(0.85_0.15_85/0.35)] to-transparent"
                style={{ animation: "scan-line 3.5s ease-in-out infinite" }}
              />
            </div>
          )}
          {/* hold progress ring */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="48" fill="none" stroke="oklch(0.85 0.15 85 / 0.8)" strokeWidth="0.6"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 48}
              style={{ transition: "stroke-dashoffset 120ms linear", filter: "drop-shadow(0 0 6px oklch(0.85 0.15 85 / 0.9))" }}
            />
          </svg>
          {/* center hand hint */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-1/2 w-1/2 opacity-25 animate-float-slow" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M30 90 V55 c0-3 4-3 4 0 V38 c0-3 4-3 4 0 V32 c0-3 4-3 4 0 V38 M46 38 V25 c0-3 4-3 4 0 V38 M54 38 V22 c0-3 4-3 4 0 V38 M62 38 V30 c0-3 4-3 4 0 V60 c0 18-10 30-24 30 z" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p className="font-serif-display text-2xl md:text-3xl text-gradient-gold">{message}</p>
          <p className="mt-2 font-sans-ui text-xs uppercase tracking-[0.35em] text-white/50">
            {phase === "requesting" ? "Awakening the lens…" :
             phase === "denied" ? "Camera access denied" :
             phase === "unsupported" ? "Camera not available" :
             "Ancient wisdom meets modern insight"}
          </p>
        </div>

        {(phase === "denied" || phase === "unsupported") && (
          <div className="flex flex-col items-center gap-3">
            <button onClick={startCamera} className="glass glow-mystic inline-flex items-center gap-2 rounded-full px-5 py-3 font-sans-ui text-sm text-white/90 transition hover:scale-[1.02]">
              <Camera className="h-4 w-4" /> Try camera again
            </button>
            <button onClick={skipCamera} className="font-sans-ui text-xs uppercase tracking-[0.3em] text-white/60 underline-offset-4 hover:text-[color:var(--gold)] hover:underline">
              Continue without camera
            </button>
          </div>
        )}

        {phase === "framing" && (
          <button onClick={manualCapture} className="glass inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 font-sans-ui text-xs uppercase tracking-[0.3em] text-white/75 transition hover:scale-105 hover:text-[color:var(--gold)]">
            <Sparkles className="h-3.5 w-3.5" /> Read Now
          </button>
        )}

        {phase === "requesting" && (
          <div className="flex items-center gap-2 text-white/70">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span className="font-sans-ui text-xs uppercase tracking-[0.3em]">Requesting access…</span>
          </div>
        )}
      </div>
    </div>
  );
}