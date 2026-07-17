import { useState } from "react";
import { User, Calendar, MapPin, Clock, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { INDIA_STATES } from "@/lib/india-states-cities";

export type UserDetails = {
  name: string;
  birthDate: string;
  birthState: string;
  birthCity: string;
  birthTime: string; // optional
};

type Step = "name" | "dob" | "location";

type Props = {
  onComplete: (details: UserDetails) => void;
};

export function UserDetailsModal({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthState, setBirthState] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");

  const selectedStateObj = INDIA_STATES.find((s) => s.name === birthState);
  const cities = selectedStateObj?.cities ?? [];

  const handleNameNext = () => {
    if (!name.trim()) { setNameError("Please whisper your name to the stars…"); return; }
    setNameError("");
    setStep("dob");
  };

  const handleDobNext = () => {
    if (!birthDate) { setDobError("The stars need your birth date to align…"); return; }
    setDobError("");
    setStep("location");
  };

  const handleFinish = () => {
    onComplete({ name: name.trim(), birthDate, birthState, birthCity, birthTime });
  };

  const stepIndex = step === "name" ? 0 : step === "dob" ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md animate-reveal-card rounded-3xl border border-white/10"
        style={{
          background: "linear-gradient(145deg, oklch(0.16 0.06 285 / 0.98), oklch(0.10 0.04 275 / 0.98))",
          boxShadow: "0 40px 120px -20px oklch(0.72 0.17 285 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.06)",
        }}
      >
        {/* Aura blob */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-40"
          style={{ background: "oklch(0.72 0.17 285)" }}
        />

        {/* Step indicator */}
        <div className="relative z-10 flex items-center justify-center gap-3 pt-8 pb-2">
          {(["name", "dob", "location"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold font-sans-ui transition-all duration-500 ${
                  i < stepIndex
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)] text-black"
                    : i === stepIndex
                    ? "border-[color:var(--gold)] text-[color:var(--gold)] scale-110"
                    : "border-white/20 text-white/30"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              {i < 2 && (
                <div className={`h-px w-8 transition-all duration-500 ${i < stepIndex ? "bg-[color:var(--gold)]" : "bg-white/15"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="relative z-10 px-8 pb-8 pt-4">
          {/* ─── STEP 1: Name ─── */}
          {step === "name" && (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15"
                style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 285), transparent)" }}
              >
                <User className="h-7 w-7 text-white" />
              </div>
              <p className="font-sans-ui text-[10px] uppercase tracking-[0.4em] text-white/50">The Stars Await</p>
              <h2 className="mt-2 font-serif-display text-3xl text-white/95">
                How shall the cosmos <span className="text-gradient-gold italic">call you?</span>
              </h2>
              <p className="mt-2 font-serif-display italic text-white/50 text-sm">
                Your name carries vibrations that the universe already knows
              </p>

              <div className="mt-6 w-full">
                <input
                  id="modal-name"
                  type="text"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                  placeholder="Enter your name…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-center font-serif-display text-xl text-white placeholder-white/25 outline-none focus:border-[color:var(--gold)]/60 focus:ring-1 focus:ring-[color:var(--gold)]/30 transition"
                />
                {nameError && (
                  <p className="mt-2 font-sans-ui text-xs text-red-400/80 italic">{nameError}</p>
                )}
              </div>

              <button
                id="modal-name-next"
                onClick={handleNameNext}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-4 font-sans-ui text-sm font-semibold text-black transition hover:scale-[1.02] hover:brightness-110"
                style={{ background: "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.72 0.17 60))" }}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="truncate">Reveal My Cosmic Name</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Date of Birth ─── */}
          {step === "dob" && (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15"
                style={{ background: "linear-gradient(135deg, oklch(0.75 0.19 15), transparent)" }}
              >
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <p className="font-sans-ui text-[10px] uppercase tracking-[0.4em] text-white/50">Your Celestial Birth</p>
              <h2 className="mt-2 font-serif-display text-3xl text-white/95">
                When did you <span className="text-gradient-gold italic">grace this world?</span>
              </h2>
              <p className="mt-2 font-serif-display italic text-white/50 text-sm">
                Every soul arrives at a perfect cosmic moment — yours is no exception
              </p>

              <div className="mt-6 w-full">
                <input
                  id="modal-dob"
                  type="date"
                  value={birthDate}
                  autoFocus
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-center font-serif-display text-xl text-white outline-none focus:border-[color:var(--gold)]/60 focus:ring-1 focus:ring-[color:var(--gold)]/30 transition [color-scheme:dark]"
                />
                {dobError && (
                  <p className="mt-2 font-sans-ui text-xs text-red-400/80 italic">{dobError}</p>
                )}
              </div>

              <div className="mt-4 flex w-full gap-3">
                <button
                  onClick={() => setStep("name")}
                  className="flex-1 rounded-xl border border-white/15 py-3.5 font-sans-ui text-sm text-white/60 transition hover:border-white/30 hover:text-white/80"
                >
                  ← Back
                </button>
                <button
                  id="modal-dob-next"
                  onClick={handleDobNext}
                  className="flex-[2] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-3.5 font-sans-ui text-xs sm:text-sm font-semibold text-black transition hover:scale-[1.02] hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.72 0.17 60))" }}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="truncate">The Stars Remember</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Birth Location ─── */}
          {step === "location" && (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15"
                style={{ background: "linear-gradient(135deg, oklch(0.72 0.14 200), transparent)" }}
              >
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <p className="font-sans-ui text-[10px] uppercase tracking-[0.4em] text-white/50">Sacred Birthplace</p>
              <h2 className="mt-2 font-serif-display text-3xl text-white/95">
                Where did the universe <span className="text-gradient-gold italic">first know you?</span>
              </h2>
              <p className="mt-2 font-serif-display italic text-white/50 text-sm">
                Your birthplace shapes your Vedic kundali — the blueprint of your soul
              </p>

              <div className="mt-6 w-full space-y-3 text-left">
                {/* State dropdown */}
                <div className="relative">
                  <select
                    id="modal-state"
                    value={birthState}
                    onChange={(e) => { setBirthState(e.target.value); setBirthCity(""); }}
                    className="w-full rounded-xl border border-white/15 px-5 py-4 font-serif-display text-lg text-white outline-none focus:border-[color:var(--gold)]/60 focus:ring-1 focus:ring-[color:var(--gold)]/30 transition"
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      background: "oklch(0.14 0.05 280)",
                      colorScheme: "dark",
                      touchAction: "manipulation",
                      WebkitOverflowScrolling: "touch" as any,
                    } as React.CSSProperties}
                  >
                    <option value="" style={{ background: "#1a1025" }}>Select your birth state…</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s.name} value={s.name} style={{ background: "#1a1025", color: "#fff" }}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                </div>

                {/* City dropdown — appears after state selection */}
                {birthState && (
                  <div className="relative animate-reveal-card">
                    <select
                      id="modal-city"
                      value={birthCity}
                      onChange={(e) => setBirthCity(e.target.value)}
                      className="w-full rounded-xl border border-white/15 px-5 py-4 font-serif-display text-lg text-white outline-none focus:border-[color:var(--gold)]/60 focus:ring-1 focus:ring-[color:var(--gold)]/30 transition"
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        background: "oklch(0.14 0.05 280)",
                        colorScheme: "dark",
                        touchAction: "manipulation",
                        WebkitOverflowScrolling: "touch" as any,
                      } as React.CSSProperties}
                    >
                      <option value="" style={{ background: "#1a1025" }}>Select your birth city…</option>
                      {cities.map((c) => (
                        <option key={c} value={c} style={{ background: "#1a1025", color: "#fff" }}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  </div>
                )}

                {/* Birth time — optional */}
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    id="modal-birthtime"
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    placeholder="Birth time (optional)"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-4 pl-12 pr-5 font-serif-display text-lg text-white placeholder-white/25 outline-none focus:border-[color:var(--gold)]/60 focus:ring-1 focus:ring-[color:var(--gold)]/30 transition [color-scheme:dark]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans-ui text-[10px] uppercase tracking-widest text-white/30">optional</span>
                </div>
              </div>

              <div className="mt-5 flex w-full gap-3">
                <button
                  onClick={() => setStep("dob")}
                  className="flex-1 rounded-xl border border-white/15 py-3.5 font-sans-ui text-sm text-white/60 transition hover:border-white/30 hover:text-white/80"
                >
                  ← Back
                </button>
                <button
                  id="modal-generate"
                  onClick={handleFinish}
                  className="flex-[2] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-3.5 font-sans-ui text-xs sm:text-sm font-semibold text-black transition hover:scale-[1.02] hover:brightness-110 glow-gold"
                  style={{ background: "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.72 0.17 60))" }}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="truncate">Generate My Future</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
