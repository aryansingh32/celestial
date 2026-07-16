import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateFallbackReading, type ReadingSections } from "./fallback-reading";

const PalmHintsSchema = z.object({
  handedness: z.enum(["left", "right", "unknown"]).default("unknown"),
  brightness: z.number().min(0).max(1).optional(),
  aspect: z.number().optional(),
  symmetry: z.number().min(0).max(1).optional(),
  fingersOpen: z.boolean().optional(),
  seed: z.number().optional(),
}).default({ handedness: "unknown" });

const UserDetailsSchema = z.object({
  name: z.string().optional(),
  birthDate: z.string().optional(),
  birthState: z.string().optional(),
  birthCity: z.string().optional(),
  birthTime: z.string().optional(),
}).optional();

const InputSchema = z.object({
  hints: PalmHintsSchema,
  userDetails: UserDetailsSchema,
});

// All free models to try in order
const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.5-flash:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3.1:free",
  "mistralai/mistral-7b-instruct:free",
];

const SYSTEM_PROMPT = `You are Jyotishi — an ancient Vedic astrologer and palm reader, master of both traditional palmistry and Jyotish astrology. You blend the wisdom of the stars with the secrets written on the palm.

Rules:
- Speak like a graceful storyteller, warm, mysterious, uplifting. Never robotic.
- Use language like "Your palm whispers…", "The stars reveal…", "Jyotish suggests…", "Your nakshatra indicates…"
- Include mostly positive guidance with 1–2 practical cautions.
- Never predict exact death dates, but can mention danger periods as karmic challenges.
- Avoid clichés. Each section must feel personal and resonant.
- Each section 2–4 sentences.
- Return ONLY valid JSON in the exact schema requested. No preamble, no markdown fences.`;

function buildUserPrompt(hints: z.infer<typeof PalmHintsSchema>, userDetails?: z.infer<typeof UserDetailsSchema>) {
  const birthInfo = userDetails
    ? `
User Information:
- Name: ${userDetails.name || "Unknown"}
- Date of Birth: ${userDetails.birthDate || "Unknown"}
- Birth Location: ${[userDetails.birthCity, userDetails.birthState].filter(Boolean).join(", ") || "India"}
- Birth Time: ${userDetails.birthTime || "Unknown (use sunrise as default)"}
`
    : "";

  return `Generate a deeply personalized Vedic palm reading based on the following:
${birthInfo}
Palm Analysis:
- Handedness: ${hints.handedness}
- Overall symmetry: ${hints.symmetry ?? "moderate"}
- Fingers openness: ${hints.fingersOpen === false ? "closed/reserved" : hints.fingersOpen === true ? "open/expressive" : "balanced"}
- Line brightness: ${hints.brightness ?? "average"}
- Random seed for uniqueness: ${hints.seed ?? Math.floor(Math.random() * 1e6)}

Generate a Vedic kundali reading combined with palm analysis. Return JSON with exactly these keys, all strings unless noted:
{
  "personality": "...",
  "love": "...",
  "career": "...",
  "wealth": "...",
  "lifePath": "...",
  "challenges": "...",
  "guidance": "...",
  "luckyColor": "one evocative color name",
  "luckyNumber": "a single number 1-77 as a string",
  "luckyDay": "one day of the week",
  "summary": "one short poetic sentence tying it together",
  "childrenCount": "a single digit 1-4 as a string",
  "childrenNote": "2-3 warm sentences about children line and family life",
  "relationship": "2-3 sentences describing the deep personal relationship the palm foretells",
  "companionInitial": "a single uppercase English letter A-Z — the first letter of the lifelong companion",
  "companionNote": "1-2 poetic sentences about this lifelong companion",
  "lifeGraph": "an array of exactly 8 integers between 15 and 98, forming a mostly-rising curve of life energy across decades (ages 10,20,30,40,50,60,70,80)",
  "marriageAge": "age range like '26-29' when the person is most likely to marry",
  "dangerPeriod": "a life period like 'Ages 32-35' representing a karmic challenge window",
  "dangerNote": "1-2 sentences describing the nature of this danger period and how to navigate it",
  "vedicRashi": "the Vedic moon sign Rashi name with Sanskrit and English, e.g. 'Mesh (Aries)'",
  "vedicNakshatra": "the birth nakshatra name based on birth date if provided",
  "vedicElement": "the Vedic element: Fire, Earth, Water, Air, or Ether",
  "vedicGuidance": "2-3 sentences of Vedic astrology guidance specific to this person's chart"
}`;
}

async function tryModel(apiKey: string, model: string, hints: z.infer<typeof PalmHintsSchema>, userDetails: z.infer<typeof UserDetailsSchema>, signal: AbortSignal): Promise<ReadingSections | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Celestial Touch",
      "HTTP-Referer": "https://celestial-touch.app",
    },
    body: JSON.stringify({
      model,
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(hints, userDetails) },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`[AI] Model ${model} failed: ${res.status} ${res.statusText}`);
    return null;
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ReadingSections>;
    const required = ["personality","love","career","wealth","lifePath","challenges","guidance","luckyColor","luckyNumber","luckyDay"] as const;
    for (const k of required) if (!parsed[k] || typeof parsed[k] !== "string") return null;
    const fb = generateFallbackReading(hints.seed);
    const graph = Array.isArray((parsed as { lifeGraph?: unknown }).lifeGraph)
      ? ((parsed as { lifeGraph: unknown[] }).lifeGraph
          .map((n) => Math.max(15, Math.min(98, Math.round(Number(n)))))
          .filter((n) => Number.isFinite(n)) as number[])
      : [];
    const lifeGraph = graph.length === 8 ? graph : fb.lifeGraph;
    const initial = typeof parsed.companionInitial === "string"
      ? parsed.companionInitial.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase()
      : "";
    return {
      summary: "A season of quiet realignment awaits you.",
      ...parsed,
      childrenCount: (parsed.childrenCount as string) || fb.childrenCount,
      childrenNote: (parsed.childrenNote as string) || fb.childrenNote,
      relationship: (parsed.relationship as string) || fb.relationship,
      companionInitial: initial || fb.companionInitial,
      companionNote: (parsed.companionNote as string) || fb.companionNote,
      lifeGraph,
      marriageAge: (parsed.marriageAge as string) || fb.marriageAge,
      dangerPeriod: (parsed.dangerPeriod as string) || fb.dangerPeriod,
      dangerNote: (parsed.dangerNote as string) || fb.dangerNote,
      vedicRashi: (parsed.vedicRashi as string) || fb.vedicRashi,
      vedicNakshatra: (parsed.vedicNakshatra as string) || fb.vedicNakshatra,
      vedicElement: (parsed.vedicElement as string) || fb.vedicElement,
      vedicGuidance: (parsed.vedicGuidance as string) || fb.vedicGuidance,
    } as ReadingSections;
  } catch {
    return null;
  }
}

export const generateReading = createServerFn({ method: "POST" })
  .validator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<{ reading: ReadingSections; source: "ai" | "fallback" }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[AI] No OPENROUTER_API_KEY — using fallback");
      return { reading: generateFallbackReading(data.hints.seed), source: "fallback" };
    }

    for (const model of MODELS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        console.log(`[AI] Trying model: ${model}`);
        const result = await tryModel(apiKey, model, data.hints, data.userDetails, controller.signal);
        clearTimeout(timer);
        if (result) {
          console.log(`[AI] Success with model: ${model}`);
          return { reading: result, source: "ai" };
        }
      } catch (err) {
        console.error(`[AI] Model ${model} threw:`, err);
        // try next model
      }
    }
    console.warn("[AI] All models failed — using fallback");
    return { reading: generateFallbackReading(data.hints.seed), source: "fallback" };
  });

// ─── Neighbourhood reading server fn ───────────────────────────────────────

const NeighbourhoodInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  userName: z.string().optional(),
  birthState: z.string().optional(),
  birthCity: z.string().optional(),
  readingSummary: z.string().optional(),
});

export type NeighbourhoodReading = {
  neighbourhoodReading: string;
  localityEnergy: string;
  localityLifestyle: string;
  localityRelationship: string;
};

export const generateNeighbourhoodReading = createServerFn({ method: "POST" })
  .validator((raw: unknown) => NeighbourhoodInputSchema.parse(raw))
  .handler(async ({ data }): Promise<{ reading: NeighbourhoodReading; source: "ai" | "fallback" }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;

    const fallback: NeighbourhoodReading = {
      neighbourhoodReading: "The energy around your home radiates warmth and quiet protection. Your locality carries an ancient calm that supports your growth.",
      localityEnergy: "Your neighbourhood vibrates at a frequency of gentle abundance — the kind that asks for nothing but gives everything in return.",
      localityLifestyle: "Those who live near you tend to be creative, community-minded souls. Your lifestyle aligns beautifully with the rhythm of this place.",
      localityRelationship: "A neighbour or nearby soul carries a connection to your destiny. The one who lives closest to the east holds an unexpected gift for your journey.",
    };

    if (!apiKey) return { reading: fallback, source: "fallback" };

    const prompt = `Based on these details, generate a mystical, warm, and poetic neighbourhood reading:

User: ${data.userName || "The seeker"}
GPS Location: Latitude ${data.latitude.toFixed(4)}, Longitude ${data.longitude.toFixed(4)}
Birth origin: ${[data.birthCity, data.birthState].filter(Boolean).join(", ") || "India"}
Palm reading summary: ${data.readingSummary || "A soul on a beautiful journey"}

Return JSON with exactly these keys:
{
  "neighbourhoodReading": "2-3 sentences about the cosmic energy of their physical location and what it means for their life",
  "localityEnergy": "2 sentences about the energy vibration of their neighbourhood and how it affects them",
  "localityLifestyle": "2 sentences about the lifestyle and nature of people in their locality and how it resonates with the user",
  "localityRelationship": "2-3 warm, poetic sentences about relationships with neighbours and people nearby — any hidden connections or soul contracts"
}`;

    for (const model of MODELS.slice(0, 3)) {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 15000);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Title": "Celestial Touch",
          },
          body: JSON.stringify({
            model,
            temperature: 0.9,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a mystical astrologer. Respond only with valid JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!res.ok) continue;
        const d = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = d?.choices?.[0]?.message?.content?.trim();
        if (!raw) continue;
        const parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()) as NeighbourhoodReading;
        if (parsed.neighbourhoodReading && parsed.localityEnergy) {
          return { reading: parsed, source: "ai" };
        }
      } catch { /* try next */ }
    }

    return { reading: fallback, source: "fallback" };
  });