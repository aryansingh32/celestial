import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PalmScanner } from "@/components/PalmScanner";
import { ScanAnimation } from "@/components/ScanAnimation";
import { ReadingView } from "@/components/ReadingView";
import { CosmicBackground } from "@/components/CosmicBackground";
import { generateReading } from "@/lib/reading.functions";
import { generateFallbackReading, type ReadingSections } from "@/lib/fallback-reading";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mystic Palm — AI Palm Reading" },
      { name: "description", content: "Discover your destiny through an immersive AI-powered palm reading experience." },
      { property: "og:title", content: "Mystic Palm — AI Palm Reading" },
      { property: "og:description", content: "An immersive, AI-powered palm reading. Place your palm inside the frame and let the ancient patterns speak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Phase = "scan" | "analyzing" | "result";

function Index() {
  const [phase, setPhase] = useState<Phase>("scan");
  const [image, setImage] = useState<string>("");
  const [reading, setReading] = useState<ReadingSections | null>(null);
  const [source, setSource] = useState<"ai" | "fallback">("ai");

  const callGenerate = useServerFn(generateReading);

  const [hintsSeed, setHintsSeed] = useState(0);

  const onCapture = useCallback(
    (dataUrl: string, hints: { brightness: number; symmetry: number; fingersOpen: boolean; seed: number }) => {
      setImage(dataUrl);
      setPhase("analyzing");
      setHintsSeed(hints.seed);

      const req = callGenerate({
        data: { hints: { handedness: "unknown", ...hints } },
      }).then((r) => r).catch(() => ({ reading: generateFallbackReading(hints.seed), source: "fallback" as const }));

      // Ensure animation runs full duration; both complete then proceed.
      const anim = new Promise<void>((res) => setTimeout(res, 7000));
      Promise.all([req, anim]).then(([r]) => {
        setReading(r.reading);
        setSource(r.source);
        setPhase("result");
      });
    },
    [callGenerate],
  );

  const onRescan = () => {
    setReading(null);
    setImage("");
    setPhase("scan");
  };

  return (
    <main className="relative min-h-[100dvh] text-white">
      {phase !== "scan" && <CosmicBackground density={phase === "result" ? 70 : 40} />}
      {phase === "scan" && <PalmScanner key={hintsSeed || "initial"} onCapture={onCapture} />}
      {phase === "analyzing" && <ScanAnimation imageDataUrl={image} onDone={() => { /* handled by promise */ }} />}
      {phase === "result" && reading && <ReadingView reading={reading} source={source} onRescan={onRescan} />}
    </main>
  );
}
