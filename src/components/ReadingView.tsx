import { useMemo, useState } from "react";
import type { ReadingSections } from "@/lib/fallback-reading";
import { Sparkles, Heart, Briefcase, Coins, Moon, ShieldAlert, Leaf, Palette, Hash, CalendarDays, RotateCcw, Share2, Download, Baby, Users, Infinity as InfinityIcon } from "lucide-react";

type CardDef = { key: keyof ReadingSections; title: string; icon: React.ComponentType<{ className?: string }>; accent: string };

const CARDS: CardDef[] = [
  { key: "personality", title: "Personality", icon: Sparkles, accent: "oklch(0.72 0.17 285)" },
  { key: "love", title: "Love", icon: Heart, accent: "oklch(0.75 0.19 15)" },
  { key: "career", title: "Career", icon: Briefcase, accent: "oklch(0.7 0.15 240)" },
  { key: "wealth", title: "Wealth", icon: Coins, accent: "oklch(0.85 0.15 85)" },
  { key: "lifePath", title: "Life Path", icon: Moon, accent: "oklch(0.72 0.14 200)" },
  { key: "challenges", title: "Challenges", icon: ShieldAlert, accent: "oklch(0.7 0.16 40)" },
  { key: "guidance", title: "Guidance", icon: Leaf, accent: "oklch(0.72 0.15 150)" },
];

const MICRO: CardDef[] = [
  { key: "luckyColor", title: "Lucky Color", icon: Palette, accent: "oklch(0.75 0.18 320)" },
  { key: "luckyNumber", title: "Lucky Number", icon: Hash, accent: "oklch(0.85 0.15 85)" },
  { key: "luckyDay", title: "Lucky Day", icon: CalendarDays, accent: "oklch(0.72 0.17 285)" },
];

export function ReadingView({ reading, source, onRescan }: { reading: ReadingSections; source: "ai" | "fallback"; onRescan: () => void }) {
  const [sharing, setSharing] = useState(false);

  const cardCount = CARDS.length + MICRO.length;
  const delays = useMemo(() => Array.from({ length: cardCount }, (_, i) => `${i * 140}ms`), [cardCount]);

  // ---- Life energy graph geometry ----
  const graph = reading.lifeGraph && reading.lifeGraph.length === 8
    ? reading.lifeGraph
    : [30, 42, 55, 62, 70, 78, 84, 88];
  const GW = 600, GH = 220, PAD = 36;
  const ages = [10, 20, 30, 40, 50, 60, 70, 80];
  const xAt = (i: number) => PAD + (i * (GW - PAD * 2)) / (graph.length - 1);
  const yAt = (v: number) => GH - PAD - ((v - 10) / 90) * (GH - PAD * 2);
  const pts = graph.map((v, i) => [xAt(i), yAt(v)] as const);
  // Smooth cubic path
  const smoothPath = (() => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return d;
  })();
  const areaPath = `${smoothPath} L ${xAt(graph.length - 1)},${GH - PAD} L ${xAt(0)},${GH - PAD} Z`;

  const renderCard = async (): Promise<Blob | null> => {
    const W = 1080, H = 1350;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    // background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a0b2e");
    bg.addColorStop(1, "#0a0620");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // nebula glow
    const g1 = ctx.createRadialGradient(W * 0.2, H * 0.15, 10, W * 0.2, H * 0.15, 700);
    g1.addColorStop(0, "rgba(140,80,220,0.5)"); g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W * 0.85, H * 0.85, 10, W * 0.85, H * 0.85, 800);
    g2.addColorStop(0, "rgba(230,180,80,0.35)"); g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    // stars
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 160; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.6;
      ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // title
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9d29a";
    ctx.font = "600 34px Georgia, serif";
    ctx.fillText("✦  MYSTIC PALM  ✦", W / 2, 110);
    ctx.font = "italic 56px Georgia, serif";
    ctx.fillStyle = "#fff8e6";
    ctx.fillText("Your Palm Reading", W / 2, 190);
    // divider
    ctx.strokeStyle = "rgba(233,210,154,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 120, 220); ctx.lineTo(W / 2 + 120, 220); ctx.stroke();

    const wrap = (text: string, x: number, y: number, maxW: number, lh: number, maxLines = 4) => {
      const words = text.split(" ");
      let line = ""; let lines: string[] = [];
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW) { lines.push(line); line = w; if (lines.length === maxLines) break; }
        else line = test;
      }
      if (line && lines.length < maxLines) lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
      return lines.length * lh;
    };

    ctx.textAlign = "left";
    let y = 290;
    const sections: Array<[string, string]> = [
      ["✨ Personality", reading.personality],
      ["❤ Love", reading.love],
      ["💼 Career", reading.career],
      ["🌙 Life Path", reading.lifePath],
      ["🌿 Guidance", reading.guidance],
    ];
    for (const [t, body] of sections) {
      ctx.fillStyle = "#e9d29a"; ctx.font = "600 26px Georgia, serif";
      ctx.fillText(t, 90, y); y += 36;
      ctx.fillStyle = "rgba(255,248,230,0.9)"; ctx.font = "300 22px Georgia, serif";
      const used = wrap(body, 90, y, W - 180, 30, 3); y += used + 24;
    }
    // lucky trio
    ctx.fillStyle = "#e9d29a"; ctx.font = "600 22px Georgia, serif";
    const trio = `Lucky Color: ${reading.luckyColor}   •   Number: ${reading.luckyNumber}   •   Day: ${reading.luckyDay}`;
    ctx.textAlign = "center";
    ctx.fillText(trio, W / 2, H - 120);
    ctx.font = "italic 20px Georgia, serif"; ctx.fillStyle = "rgba(255,248,230,0.7)";
    ctx.fillText("mysticpalm.app", W / 2, H - 70);

    return await new Promise<Blob | null>(res => c.toBlob(b => res(b), "image/png"));
  };

  const doShare = async () => {
    setSharing(true);
    try {
      const blob = await renderCard();
      if (!blob) return;
      const file = new File([blob], "palm-reading.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "My Palm Reading", text: "My mystical palm reading ✨" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "palm-reading.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } finally { setSharing(false); }
  };

  const doSave = async () => {
    const blob = await renderCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "palm-reading.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="starfield relative z-10 mx-auto min-h-[100dvh] w-full max-w-3xl px-5 py-10 md:px-8 md:py-16">
      <header className="mb-10 text-center animate-reveal-card">
        <p className="font-sans-ui text-[10px] uppercase tracking-[0.5em] text-white/50">✦ Your Reading ✦</p>
        <h1 className="mt-3 font-serif-display text-4xl leading-tight md:text-6xl text-gradient-gold">
          The Palms Have Spoken
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-serif-display italic text-lg text-white/75">
          {reading.summary}
        </p>
        {source === "fallback" && (
          <p className="mt-2 font-sans-ui text-[10px] uppercase tracking-[0.3em] text-white/30">
            drawn from the ancient archives
          </p>
        )}
      </header>

      <div className="space-y-5">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <article key={c.key}
              className="glass animate-reveal-card group relative overflow-hidden rounded-3xl p-6 md:p-7"
              style={{ animationDelay: delays[i], boxShadow: `0 20px 60px -30px ${c.accent}` }}>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
                style={{ background: c.accent }} />
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15"
                  style={{ background: `linear-gradient(135deg, ${c.accent}, transparent)` }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">{c.title}</h2>
                  <p className="mt-2 font-serif-display text-lg leading-relaxed text-white/90 md:text-xl">
                    {reading[c.key]}
                  </p>
                </div>
              </div>
            </article>
          );
        })}

        {/* Life Energy Graph */}
        <article className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-6 md:p-7"
          style={{ animationDelay: delays[Math.min(delays.length - 1, CARDS.length)], boxShadow: "0 20px 60px -30px oklch(0.72 0.17 285)" }}>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.72 0.17 285)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 285), transparent)" }}>
              <InfinityIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Life Energy Graph</h2>
              <p className="mt-1 font-serif-display text-white/70 italic">The flow of vitality across the chapters of your life</p>
              <div className="mt-4 overflow-x-auto">
                <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full min-w-[520px]" role="img" aria-label="Life energy graph">
                  <defs>
                    <linearGradient id="lifeArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.75 0.19 15)" stopOpacity="0.55" />
                      <stop offset="60%" stopColor="oklch(0.72 0.17 285)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="oklch(0.72 0.17 285)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="lifeStroke" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
                      <stop offset="50%" stopColor="oklch(0.75 0.19 15)" />
                      <stop offset="100%" stopColor="oklch(0.72 0.17 285)" />
                    </linearGradient>
                  </defs>
                  {/* grid */}
                  {[0, 1, 2, 3].map((r) => (
                    <line key={r} x1={PAD} x2={GW - PAD} y1={PAD + r * ((GH - PAD * 2) / 3)} y2={PAD + r * ((GH - PAD * 2) / 3)}
                      stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
                  ))}
                  <path d={areaPath} fill="url(#lifeArea)" />
                  <path d={smoothPath} fill="none" stroke="url(#lifeStroke)" strokeWidth={2.5} strokeLinecap="round" />
                  {pts.map(([x, y], i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r={9} fill="oklch(0.72 0.17 285)" opacity={0.25} />
                      <circle cx={x} cy={y} r={4} fill="#fff8e6" stroke="oklch(0.85 0.15 85)" strokeWidth={1.5} />
                      <text x={x} y={GH - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="ui-sans-serif">
                        {ages[i]}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <p className="mt-2 text-center font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/40">Age in Years →</p>
            </div>
          </div>
        </article>

        {/* Children & Family */}
        <article className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-6 md:p-7"
          style={{ animationDelay: delays[Math.min(delays.length - 1, CARDS.length)], boxShadow: "0 20px 60px -30px oklch(0.75 0.18 320)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.75 0.18 320)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15"
              style={{ background: "linear-gradient(135deg, oklch(0.75 0.18 320), transparent)" }}>
              <Baby className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Children & Family</h2>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--gold)]/40 bg-white/5">
                  <span className="font-serif-display text-3xl text-gradient-gold">{reading.childrenCount}</span>
                </div>
                <p className="font-serif-display text-lg leading-relaxed text-white/90 md:text-xl">
                  {reading.childrenNote}
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Personal Relationship */}
        <article className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-6 md:p-7"
          style={{ animationDelay: delays[Math.min(delays.length - 1, CARDS.length)], boxShadow: "0 20px 60px -30px oklch(0.75 0.19 15)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.75 0.19 15)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15"
              style={{ background: "linear-gradient(135deg, oklch(0.75 0.19 15), transparent)" }}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Personal Relationship</h2>
              <p className="mt-2 font-serif-display text-lg leading-relaxed text-white/90 md:text-xl">
                {reading.relationship}
              </p>
            </div>
          </div>
        </article>

        {/* Lifelong Companion */}
        <article className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-6 md:p-7 text-center"
          style={{ animationDelay: delays[Math.min(delays.length - 1, CARDS.length)], boxShadow: "0 20px 60px -30px oklch(0.85 0.15 85)" }}>
          <div className="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.85 0.15 85)" }} />
          <p className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Your Lifelong Companion</p>
          <p className="mt-1 font-serif-display italic text-white/70">Written faintly on your heart line — the one who stays till the end</p>
          <div className="relative mx-auto mt-5 flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[color:var(--gold)]/40" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-0 rounded-full blur-2xl opacity-60"
              style={{ background: "radial-gradient(circle, oklch(0.85 0.15 85) 0%, transparent 70%)" }} />
            <span className="relative font-serif-display text-7xl text-gradient-gold">{reading.companionInitial}</span>
          </div>
          <p className="mx-auto mt-5 max-w-md font-serif-display text-lg leading-relaxed text-white/90">
            {reading.companionNote}
          </p>
        </article>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MICRO.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={c.key}
                className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-5 text-center"
                style={{ animationDelay: delays[CARDS.length + i] }}>
                <div className="absolute inset-x-0 -top-16 mx-auto h-32 w-32 rounded-full opacity-30 blur-3xl"
                  style={{ background: c.accent }} />
                <Icon className="mx-auto h-5 w-5 text-white/70" />
                <p className="mt-2 font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">{c.title}</p>
                <p className="mt-2 font-serif-display text-2xl text-gradient-gold">{reading[c.key]}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-4 mt-10 flex flex-wrap items-center justify-center gap-3 pb-4">
        <button onClick={onRescan}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 font-sans-ui text-sm text-white/90 transition hover:scale-105 hover:text-[color:var(--gold)]">
          <RotateCcw className="h-4 w-4" /> Scan Again
        </button>
        <button onClick={doShare} disabled={sharing}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.17_285),oklch(0.55_0.22_315))] px-5 py-3 font-sans-ui text-sm text-white glow-mystic transition hover:scale-105 disabled:opacity-60">
          <Share2 className="h-4 w-4" /> {sharing ? "Preparing…" : "Share Reading"}
        </button>
        <button onClick={doSave}
          className="glass inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 px-5 py-3 font-sans-ui text-sm text-[color:var(--gold)] transition hover:scale-105">
          <Download className="h-4 w-4" /> Save as Image
        </button>
      </div>
    </div>
  );
}