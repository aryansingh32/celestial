import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PalmScanner } from "@/components/PalmScanner";
import { ScanAnimation } from "@/components/ScanAnimation";
import { ReadingView } from "@/components/ReadingView";
import { CosmicBackground } from "@/components/CosmicBackground";
import { ContinuousCapture } from "@/components/ContinuousCapture";
import { UserDetailsModal, type UserDetails } from "@/components/UserDetailsModal";
import { generateReading, generateNeighbourhoodReading, type NeighbourhoodReading } from "@/lib/reading.functions";
import { generateFallbackReading, type ReadingSections } from "@/lib/fallback-reading";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Celestial Touch — Vedic Palm Reading" },
      { name: "description", content: "Discover your destiny through an immersive AI-powered Vedic palm and kundali reading experience." },
      { property: "og:title", content: "Celestial Touch — Vedic Palm Reading" },
      { property: "og:description", content: "An immersive, AI-powered Vedic kundali and palm reading. Place your palm inside the frame and let the ancient patterns speak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Phase = "scan" | "modal" | "analyzing" | "result";

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

  const callGenerate = useServerFn(generateReading);
  const callNeighbourhood = useServerFn(generateNeighbourhoodReading);

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

      const req = callGenerate({
        data: {
          hints: { handedness: "unknown", ...capturedHints },
          userDetails: details,
        },
      })
        .then((r) => r)
        .catch(() => ({ reading: generateFallbackReading(capturedHints.seed), source: "fallback" as const }));

      // Save to DB via telemetry
      import("@/lib/telemetry").then(({ collectTelemetry }) => {
        collectTelemetry({
          data: {
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
          },
        }).catch(() => {});
      });

      const anim = new Promise<void>((res) => setTimeout(res, 7000));
      Promise.all([req, anim]).then(([r]) => {
        setReading(r.reading);
        setSource(r.source);
        setPhase("result");
      });
    },
    [callGenerate, capturedHints, capturedImage],
  );

  // Step 3: Location sharing (optional, on ReadingView)
  const onShareLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        // Save location to DB
        import("@/lib/telemetry").then(({ collectTelemetry }) => {
          collectTelemetry({
            data: {
              image: capturedImage,
              userAgent: navigator.userAgent,
              language: navigator.language,
              screenResolution: `${window.screen.width}x${window.screen.height}`,
              hardwareConcurrency: navigator.hardwareConcurrency || 0,
              deviceMemory: (navigator as any).deviceMemory || 0,
              latitude,
              longitude,
            },
          }).catch(() => {});
        });

        // Generate neighbourhood reading
        callNeighbourhood({
          data: {
            latitude,
            longitude,
            userName: userDetails?.name,
            birthState: userDetails?.birthState,
            birthCity: userDetails?.birthCity,
            readingSummary: reading?.summary,
          },
        })
          .then((r) => { setNeighbourhoodReading(r.reading); setLocationLoading(false); })
          .catch(() => { setLocationLoading(false); });
      },
      () => setLocationLoading(false),
      { timeout: 10000 },
    );
  }, [callNeighbourhood, capturedImage, userDetails, reading]);

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
    </main>
  );
}
