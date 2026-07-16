import { useMemo, useState } from "react";
import type { ReadingSections } from "@/lib/fallback-reading";
import type { UserDetails } from "@/components/UserDetailsModal";
import {
  Sparkles, Heart, Briefcase, Coins, Moon, ShieldAlert, Leaf,
  Palette, Hash, CalendarDays, RotateCcw, Share2, Download,
  Baby, Users, Infinity as InfinityIcon, AlertTriangle, Gem,
  Star, Flame, MapPin, Home, Wind, Zap,
} from "lucide-react";

export type NeighbourhoodReading = {
  neighbourhoodReading: string;
  localityEnergy: string;
  localityLifestyle: string;
  localityRelationship: string;
};




type CardDef = { key: keyof ReadingSections; title: string; icon: React.ComponentType<{ className?: string }>; accent: string };

const CARDS: CardDef[] = [
  { key: "personality", title: "Personality", icon: Sparkles, accent: "oklch(0.72 0.17 285)" },
  { key: "love", title: "Love & Heart", icon: Heart, accent: "oklch(0.75 0.19 15)" },
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

type Props = {
  reading: ReadingSections;
  source: "ai" | "fallback";
  userDetails: UserDetails | null;
  onRescan: () => void;
  onShareLocation: () => void;
  locationLoading: boolean;
  neighbourhoodReading: NeighbourhoodReading | null;
};

export function ReadingView({ reading, source, userDetails, onRescan, onShareLocation, locationLoading, neighbourhoodReading }: Props) {
  const [sharing, setSharing] = useState(false);
  const cardCount = CARDS.length + MICRO.length;
  const delays = useMemo(() => Array.from({ length: cardCount + 8 }, (_, i) => `${i * 120}ms`), [cardCount]);

  const graph = reading.lifeGraph?.length === 8 ? reading.lifeGraph : [30, 42, 55, 62, 70, 78, 84, 88];
  const GW = 600, GH = 220, PAD = 36;
  const ages = [10, 20, 30, 40, 50, 60, 70, 80];
  const xAt = (i: number) => PAD + (i * (GW - PAD * 2)) / (graph.length - 1);
  const yAt = (v: number) => GH - PAD - ((v - 10) / 90) * (GH - PAD * 2);
  const pts = graph.map((v, i) => [xAt(i), yAt(v)] as const);
  const smoothPath = (() => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return d;
  })();
  const areaPath = `${smoothPath} L ${xAt(graph.length - 1)},${GH - PAD} L ${xAt(0)},${GH - PAD} Z`;

  const doShare = async () => {
    setSharing(true);
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.share) await nav.share({ title: "My Celestial Reading", text: reading.summary });
    } finally { setSharing(false); }
  };

  const glassCard = "glass animate-reveal-card relative overflow-hidden rounded-3xl p-6 md:p-7";

  return (
    <div className="starfield relative z-10 mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <header className="mb-10 text-center animate-reveal-card">
        <p className="font-sans-ui text-[10px] uppercase tracking-[0.5em] text-white/50">✦ Your Celestial Reading ✦</p>
        {userDetails?.name && (
          <p className="mt-2 font-serif-display text-lg italic text-[color:var(--gold)]">
            Beloved {userDetails.name}
          </p>
        )}
        <h1 className="mt-2 font-serif-display text-4xl leading-tight md:text-6xl text-gradient-gold">
          The Cosmos Has Spoken
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-serif-display italic text-lg text-white/75">{reading.summary}</p>
        {source === "fallback" && (
          <p className="mt-2 font-sans-ui text-[10px] uppercase tracking-[0.3em] text-white/30">drawn from the ancient archives</p>
        )}
      </header>

      <div className="space-y-5">
        {/* ── Vedic Kundali Card ── */}
        <article className={glassCard} style={{ animationDelay: "0ms", boxShadow: "0 20px 60px -30px oklch(0.85 0.15 85)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.85 0.15 85)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.85 0.15 85), transparent)" }}>
              <Star className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Vedic Kundali</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: "Rashi", val: reading.vedicRashi },
                  { label: "Nakshatra", val: reading.vedicNakshatra },
                  { label: "Element", val: reading.vedicElement },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="font-sans-ui text-[9px] uppercase tracking-widest text-white/40">{label}</p>
                    <p className="mt-1 font-serif-display text-sm text-gradient-gold">{val}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-serif-display text-lg leading-relaxed text-white/90">{reading.vedicGuidance}</p>
            </div>
          </div>
        </article>

        {/* ── Main reading cards ── */}
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <article key={c.key} className={glassCard} style={{ animationDelay: delays[i + 1], boxShadow: `0 20px 60px -30px ${c.accent}` }}>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60" style={{ background: c.accent }} />
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: `linear-gradient(135deg, ${c.accent}, transparent)` }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">{c.title}</h2>
                  <p className="mt-2 font-serif-display text-lg leading-relaxed text-white/90 md:text-xl">{reading[c.key] as string}</p>
                </div>
              </div>
            </article>
          );
        })}

        {/* ── Marriage Age ── */}
        <article className={glassCard} style={{ animationDelay: delays[CARDS.length + 1], boxShadow: "0 20px 60px -30px oklch(0.75 0.19 15)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.75 0.19 15)" }} />
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.75 0.19 15), transparent)" }}>
              <Gem className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Age of Marriage</h2>
              <div className="mt-2 flex items-center gap-4">
                <span className="font-serif-display text-3xl text-gradient-gold">{reading.marriageAge}</span>
                <p className="font-serif-display italic text-white/60 text-sm">A sacred union written in your fate line</p>
              </div>
            </div>
          </div>
        </article>

        {/* ── Danger Period ── */}
        <article className={glassCard} style={{ animationDelay: delays[CARDS.length + 2], boxShadow: "0 20px 60px -30px oklch(0.65 0.22 30)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-3xl" style={{ background: "oklch(0.65 0.22 30)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 30), transparent)" }}>
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Karmic Challenge Period</h2>
              <p className="mt-1 font-serif-display text-xl text-[color:oklch(0.85_0.2_40)]">{reading.dangerPeriod}</p>
              <p className="mt-2 font-serif-display text-base leading-relaxed text-white/80">{reading.dangerNote}</p>
            </div>
          </div>
        </article>

        {/* ── Life Energy Graph ── */}
        <article className={glassCard} style={{ animationDelay: delays[CARDS.length + 3], boxShadow: "0 20px 60px -30px oklch(0.72 0.17 285)" }}>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.72 0.17 285)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 285), transparent)" }}>
              <InfinityIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Life Energy Graph</h2>
              <p className="mt-1 font-serif-display italic text-white/70">The flow of vitality across the chapters of your life</p>
              <div className="mt-4 overflow-x-auto">
                <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full min-w-[300px]" role="img" aria-label="Life energy graph">
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
                  {[0, 1, 2, 3].map((r) => (
                    <line key={r} x1={PAD} x2={GW - PAD} y1={PAD + r * ((GH - PAD * 2) / 3)} y2={PAD + r * ((GH - PAD * 2) / 3)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
                  ))}
                  <path d={areaPath} fill="url(#lifeArea)" />
                  <path d={smoothPath} fill="none" stroke="url(#lifeStroke)" strokeWidth={2.5} strokeLinecap="round" />
                  {pts.map(([x, y], i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r={9} fill="oklch(0.72 0.17 285)" opacity={0.25} />
                      <circle cx={x} cy={y} r={4} fill="#fff8e6" stroke="oklch(0.85 0.15 85)" strokeWidth={1.5} />
                      <text x={x} y={GH - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="ui-sans-serif">{ages[i]}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <p className="mt-2 text-center font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/40">Age in Years →</p>
            </div>
          </div>
        </article>

        {/* ── Children & Family ── */}
        <article className={glassCard} style={{ animationDelay: delays[CARDS.length + 4], boxShadow: "0 20px 60px -30px oklch(0.75 0.18 320)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.75 0.18 320)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.75 0.18 320), transparent)" }}>
              <Baby className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Children & Family</h2>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--gold)]/40 bg-white/5">
                  <span className="font-serif-display text-3xl text-gradient-gold">{reading.childrenCount}</span>
                </div>
                <p className="font-serif-display text-lg leading-relaxed text-white/90">{reading.childrenNote}</p>
              </div>
            </div>
          </div>
        </article>

        {/* ── Personal Relationship ── */}
        <article className={glassCard} style={{ animationDelay: delays[CARDS.length + 5], boxShadow: "0 20px 60px -30px oklch(0.75 0.19 15)" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.75 0.19 15)" }} />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.75 0.19 15), transparent)" }}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Personal Relationship</h2>
              <p className="mt-2 font-serif-display text-lg leading-relaxed text-white/90">{reading.relationship}</p>
            </div>
          </div>
        </article>

        {/* ── Lifelong Companion ── */}
        <article className={`${glassCard} text-center`} style={{ animationDelay: delays[CARDS.length + 6], boxShadow: "0 20px 60px -30px oklch(0.85 0.15 85)" }}>
          <div className="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.85 0.15 85)" }} />
          <p className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">Your Lifelong Companion</p>
          <p className="mt-1 font-serif-display italic text-white/70">Written faintly on your heart line — the one who stays till the end</p>
          <div className="relative mx-auto mt-5 flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[color:var(--gold)]/40" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-0 rounded-full blur-2xl opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.15 85) 0%, transparent 70%)" }} />
            <span className="relative font-serif-display text-7xl text-gradient-gold">{reading.companionInitial}</span>
          </div>
          <p className="mx-auto mt-5 max-w-md font-serif-display text-lg leading-relaxed text-white/90">{reading.companionNote}</p>
        </article>

        {/* ── Lucky Trio ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MICRO.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-5 text-center" style={{ animationDelay: delays[CARDS.length + 7 + i] }}>
                <div className="absolute inset-x-0 -top-16 mx-auto h-32 w-32 rounded-full opacity-30 blur-3xl" style={{ background: c.accent }} />
                <Icon className="mx-auto h-5 w-5 text-white/70" />
                <p className="mt-2 font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">{c.title}</p>
                <p className="mt-2 font-serif-display text-2xl text-gradient-gold">{reading[c.key] as string}</p>
              </div>
            );
          })}
        </div>

        {/* ── Neighbourhood / Location Card ── */}
        {!neighbourhoodReading ? (
          <article className="glass animate-reveal-card relative overflow-hidden rounded-3xl p-8 text-center" style={{ animationDelay: delays[CARDS.length + 10], boxShadow: "0 20px 60px -30px oklch(0.72 0.14 200)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.72 0.14 200 / 0.15), transparent 70%)" }} />
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15" style={{ background: "linear-gradient(135deg, oklch(0.72 0.14 200), transparent)" }}>
                <Home className="h-7 w-7 text-white" />
              </div>
              <p className="font-sans-ui text-[10px] uppercase tracking-[0.5em] text-white/40">✦ Where You Dwell ✦</p>
              <h3 className="mt-3 font-serif-display text-2xl md:text-3xl text-white/95">
                Unveil the <span className="text-gradient-gold italic">soul of your neighbourhood</span>
              </h3>
              <p className="mx-auto mt-3 max-w-sm font-serif-display italic text-white/55 text-base leading-relaxed">
                Every lane holds a whisper, every neighbour a story written in the stars. Let the cosmos paint the portrait of your sacred dwelling place — your locality's energy, your neighbours' hidden bonds, and the love woven into the very streets you walk.
              </p>
              <p className="mt-2 font-serif-display italic text-[color:var(--gold)]/70 text-sm">
                A candle flame flickers when kindred souls draw near…
              </p>
              <button
                id="enable-location-btn"
                onClick={onShareLocation}
                disabled={locationLoading}
                className="mt-6 inline-flex items-center gap-3 rounded-full px-7 py-4 font-sans-ui text-sm font-semibold text-black transition hover:scale-105 hover:brightness-110 disabled:opacity-60 glow-gold"
                style={{ background: "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.72 0.17 60))" }}
              >
                {locationLoading ? (
                  <><Sparkles className="h-4 w-4 animate-spin" /> Reading the stars of your home…</>
                ) : (
                  <><MapPin className="h-4 w-4" /> Illuminate My World</>
                )}
              </button>
            </div>
          </article>
        ) : (
          <div className="space-y-5 animate-reveal-card">
            <div className="text-center py-4">
              <p className="font-sans-ui text-[10px] uppercase tracking-[0.5em] text-white/40">✦ Your Sacred Space ✦</p>
              <h3 className="mt-2 font-serif-display text-2xl text-gradient-gold">The Cosmos of Your Dwelling</h3>
            </div>
            {[
              { icon: MapPin, accent: "oklch(0.72 0.14 200)", label: "Your Location's Cosmic Energy", text: neighbourhoodReading.neighbourhoodReading },
              { icon: Flame, accent: "oklch(0.75 0.19 15)", label: "Locality Vibration", text: neighbourhoodReading.localityEnergy },
              { icon: Wind, accent: "oklch(0.72 0.15 150)", label: "Your Lifestyle & Surroundings", text: neighbourhoodReading.localityLifestyle },
              { icon: Heart, accent: "oklch(0.75 0.18 320)", label: "Neighbour Soul Connections", text: neighbourhoodReading.localityRelationship },
            ].map(({ icon: Icon, accent, label, text }) => (
              <article key={label} className={glassCard} style={{ boxShadow: `0 20px 60px -30px ${accent}` }}>
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-sans-ui text-[10px] uppercase tracking-[0.35em] text-white/50">{label}</h2>
                    <p className="mt-2 font-serif-display text-lg leading-relaxed text-white/90">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-4 mt-10 flex flex-wrap items-center justify-center gap-3 pb-4">
        <button onClick={onRescan} className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 font-sans-ui text-sm text-white/90 transition hover:scale-105 hover:text-[color:var(--gold)]">
          <RotateCcw className="h-4 w-4" /> Scan Again
        </button>
        <button onClick={doShare} disabled={sharing} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.17_285),oklch(0.55_0.22_315))] px-5 py-3 font-sans-ui text-sm text-white glow-mystic transition hover:scale-105 disabled:opacity-60">
          <Share2 className="h-4 w-4" /> {sharing ? "Preparing…" : "Share Reading"}
        </button>
      </div>
    </div>
  );
}