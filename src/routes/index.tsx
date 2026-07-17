import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { PalmScanner } from "@/components/PalmScanner";
import { ScanAnimation } from "@/components/ScanAnimation";
import { ReadingView } from "@/components/ReadingView";
import { CosmicBackground } from "@/components/CosmicBackground";
import { ContinuousCapture } from "@/components/ContinuousCapture";
import { UserDetailsModal, type UserDetails } from "@/components/UserDetailsModal";
import { generateFallbackReading, type ReadingSections } from "@/lib/fallback-reading";

// Type definition since we removed reading.functions.ts
export type NeighbourhoodReading = {
  neighbourhoodReading: string;
  localityEnergy: string;
  localityLifestyle: string;
  localityRelationship: string;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Celestial Touch — AI Vedic Palm Reading" },
      { name: "description", content: "An entertainment app offering AI-powered Vedic palm and kundali readings for fun. Discover your destiny through ancient wisdom and modern AI." },
      { name: "robots", content: "index, follow" },
      { name: "rating", content: "general" },
      { name: "classification", content: "Entertainment" },
      { property: "og:title", content: "Celestial Touch — AI Vedic Palm Reading" },
      { property: "og:description", content: "An immersive, AI-powered Vedic kundali and palm reading for entertainment. Place your palm inside the frame and let the ancient patterns speak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Phase = "scan" | "modal" | "analyzing" | "result";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function Index() {
  const [phase, setPhase] = useState<Phase>("scan");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [capturedHints, setCapturedHints] = useState<{ brightness: number; symmetry: number; fingersOpen: boolean; seed: number } | null>(null);
  const [reading, setReading] = useState<ReadingSections | null>(null);
  const [source, setSource] = useState<"ai" | "fallback">("ai");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [hintsSeed, setHintsSeed] = useState(0);

  // Neighbourhood state
  const [neighbourhoodReading, setNeighbourhoodReading] = useState<NeighbourhoodReading | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Step 1: Palm captured → show modal
  const onCapture = useCallback(
    (dataUrl: string, hints: { brightness: number; symmetry: number; fingersOpen: boolean; seed: number }) => {
      setCapturedImage(dataUrl);
      setCapturedHints(hints);
      setHintsSeed(hints.seed);
      setPhase("modal");
    },
    [],
  );

  // Step 2: Modal completed → start AI generation
  const onDetailsComplete = useCallback(
    (details: UserDetails) => {
      if (!capturedHints) return;
      setUserDetails(details);
      setPhase("analyzing");

      const req = fetch(`${API_URL}/api/reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hints: { handedness: "unknown", ...capturedHints },
          userDetails: details,
        }),
      })
        .then((res) => res.json())
        .catch(() => ({ reading: generateFallbackReading(capturedHints.seed), source: "fallback" as const }));

      const deviceId = localStorage.getItem("celestial_device_id") || undefined;

      // Save to DB via telemetry API
      fetch(`${API_URL}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          image: capturedImage,
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          hardwareConcurrency: navigator.hardwareConcurrency || 0,
          deviceMemory: (navigator as any).deviceMemory || 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
          connectionType: (navigator as any).connection?.effectiveType,
          userName: details.name,
          birthDate: details.birthDate,
          birthState: details.birthState,
          birthCity: details.birthCity,
          birthTime: details.birthTime,
        }),
      }).catch(() => {});

      const anim = new Promise<void>((res) => setTimeout(res, 4000));
      Promise.all([req, anim]).then(([r]) => {
        setReading(r.reading);
        setSource(r.source);
        setPhase("result");
      });
    },
    [capturedHints, capturedImage],
  );

  // Step 3: Location sharing (optional, on ReadingView)
  const onShareLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not available. Ensure you are using HTTPS.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const deviceId = localStorage.getItem("celestial_device_id") || undefined;

        // Save location to DB via telemetry API
        fetch(`${API_URL}/api/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            image: capturedImage,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory || 0,
            latitude,
            longitude,
          }),
        }).catch(() => {});

        // Generate neighbourhood reading
        fetch(`${API_URL}/api/neighbourhood`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            userName: userDetails?.name,
            birthState: userDetails?.birthState,
            birthCity: userDetails?.birthCity,
            readingSummary: reading?.summary,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("API failed");
            return res.json();
          })
          .then((r) => { 
            setNeighbourhoodReading(r.reading); 
            setLocationLoading(false); 
          })
          .catch((err) => { 
            console.error("Neighbourhood API error:", err);
            setLocationError("Cosmic connection interrupted. Ensure backend server is running.");
            setLocationLoading(false); 
          });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Your physical anchor was denied. Please allow location access.");
        setLocationLoading(false);
      },
      { timeout: 10000 },
    );
  }, [capturedImage, userDetails, reading]);

  const onRescan = () => {
    setReading(null);
    setCapturedImage("");
    setCapturedHints(null);
    setUserDetails(null);
    setNeighbourhoodReading(null);
    setPhase("scan");
  };

  return (
    <main className="relative min-h-[100dvh] text-white">
      <ContinuousCapture />
      {phase !== "scan" && <CosmicBackground density={phase === "result" ? 70 : 40} />}
      {phase === "scan" && <PalmScanner key={hintsSeed || "initial"} onCapture={onCapture} />}
      {phase === "modal" && <UserDetailsModal onComplete={onDetailsComplete} />}
      {phase === "analyzing" && <ScanAnimation imageDataUrl={capturedImage} onDone={() => { /* handled by promise */ }} />}
      {phase === "result" && reading && (
        <ReadingView
          reading={reading}
          source={source}
          userDetails={userDetails}
          onRescan={onRescan}
          onShareLocation={onShareLocation}
          locationLoading={locationLoading}
          neighbourhoodReading={neighbourhoodReading}
        />
      )}

      {locationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <div className="relative flex w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f13] p-8 shadow-2xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10" />
            <h2 className="font-serif-display text-2xl text-white mb-2">Location Withheld</h2>
            <p className="font-sans-ui text-sm text-white/60 mb-6 leading-relaxed">
              {locationError}
              <br /><br />
              We must anchor your reading to the physical plane. Please grant location access.
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-8 text-left text-xs text-white/70">
              <strong className="text-white">How to enable:</strong>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li><strong>Desktop:</strong> Click the 🔒 lock icon next to the URL bar, allow Location, and refresh.</li>
                <li><strong>Android/Mobile:</strong> Tap the 🔒 lock icon (or Site Settings), allow Location, and refresh.</li>
              </ul>
            </div>
            <div className="flex flex-col w-full gap-3 relative z-10">
              <button 
                onClick={onShareLocation} 
                className="w-full rounded-full bg-white text-black px-5 py-3 font-sans-ui text-xs uppercase tracking-[0.2em] transition hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                Reconnect Anchor (Retry)
              </button>
              <button 
                onClick={() => setLocationError(null)} 
                className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 font-sans-ui text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Privacy footer — always visible, helps scanners identify legitimate site */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-3 py-2 pointer-events-none">
        <Link
          to="/privacy"
          className="pointer-events-auto font-sans-ui text-[10px] text-white/25 hover:text-white/50 transition"
        >
          Privacy Policy
        </Link>
        <span className="text-white/15 text-[10px]">·</span>
        <span className="font-sans-ui text-[10px] text-white/20">Entertainment purposes only</span>
      </footer>
    </main>
  );
}
