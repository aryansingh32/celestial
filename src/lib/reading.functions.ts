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

const InputSchema = z.object({ hints: PalmHintsSchema });

const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3.1:free",
];

const SYSTEM_PROMPT = `You are a warm, elegant, deeply intuitive palm reader in the tradition of ancient mystics — never robotic, never generic, never fear-inducing.

Rules:
- Speak like a graceful storyteller, not an assistant.
- Sound mysterious yet grounded, warm and emotionally uplifting.
- Use language like "Your palm suggests…", "It may indicate…", "This could be a season where…".
- Include mostly positive guidance, with 1–2 gentle, practical cautions.
- Never predict death, illness, disasters, accidents, exact dates, or guaranteed events.
- Avoid clichés and repetitive phrasing.
- Each section 2–4 sentences. Personal, specific-feeling, emotionally resonant.
- Return ONLY valid JSON in the exact schema requested. No preamble, no markdown fences.`;

function buildUserPrompt(hints: z.infer<typeof PalmHintsSchema>) {
  return `Generate a personalized palm reading based on these observed palm traits:
- Handedness: ${hints.handedness}
- Overall symmetry: ${hints.symmetry ?? "moderate"}
- Fingers openness: ${hints.fingersOpen === false ? "closed/reserved" : hints.fingersOpen === true ? "open/expressive" : "balanced"}
- Line brightness: ${hints.brightness ?? "average"}
- Random seed for uniqueness: ${hints.seed ?? Math.floor(Math.random() * 1e6)}

Return JSON with exactly these keys, all strings:
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
  "childrenCount": "a single digit 1-4 as a string, representing likely number of children",
  "childrenNote": "2-3 warm sentences about the children line and family life",
  "relationship": "2-3 sentences describing the deep personal relationship the palm foretells",
  "companionInitial": "a single uppercase English letter A-Z — the first letter of the lifelong companion's name",
  "companionNote": "1-2 poetic sentences about this lifelong companion",
  "lifeGraph": "an array of exactly 8 integers between 15 and 98, forming a mostly-rising curve of life energy across decades (ages 10,20,30,40,50,60,70,80)"
}`;
}

async function tryModel(apiKey: string, model: string, hints: z.infer<typeof PalmHintsSchema>, signal: AbortSignal): Promise<ReadingSections | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lovable.dev",
      "X-Title": "Mystic Palm",
    },
    body: JSON.stringify({
      model,
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(hints) },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ReadingSections>;
    const required = ["personality","love","career","wealth","lifePath","challenges","guidance","luckyColor","luckyNumber","luckyDay"] as const;
    for (const k of required) if (!parsed[k] || typeof parsed[k] !== "string") return null;
    // Enrich / normalize the new fields with sane fallbacks so the UI always renders
    const fb = (await import("./fallback-reading")).generateFallbackReading(hints.seed);
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
    } as ReadingSections;
  } catch {
    return null;
  }
}

export const generateReading = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<{ reading: ReadingSections; source: "ai" | "fallback" }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { reading: generateFallbackReading(data.hints.seed), source: "fallback" };

    for (const model of MODELS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const result = await tryModel(apiKey, model, data.hints, controller.signal);
        clearTimeout(timer);
        if (result) return { reading: result, source: "ai" };
      } catch {
        // try next model
      }
    }
    return { reading: generateFallbackReading(data.hints.seed), source: "fallback" };
  });