import { NextResponse } from 'next/server';
import { z } from 'zod';
import { corsHeaders, handleOptions } from '@/lib/cors';

export const OPTIONS = handleOptions;

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

const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.5-flash:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3.1:free",
  "mistralai/mistral-7b-instruct:free",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = NeighbourhoodInputSchema.parse(body);

    const apiKey = process.env.OPENROUTER_API_KEY;

    const fallback: NeighbourhoodReading = {
      neighbourhoodReading: "The energy around your home radiates warmth and quiet protection. Your locality carries an ancient calm that supports your growth.",
      localityEnergy: "Your neighbourhood vibrates at a frequency of gentle abundance — the kind that asks for nothing but gives everything in return.",
      localityLifestyle: "Those who live near you tend to be creative, community-minded souls. Your lifestyle aligns beautifully with the rhythm of this place.",
      localityRelationship: "A neighbour or nearby soul carries a connection to your destiny. The one who lives closest to the east holds an unexpected gift for your journey.",
    };

    if (!apiKey) {
      return NextResponse.json({ reading: fallback, source: "fallback" }, { headers: corsHeaders });
    }

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
          return NextResponse.json({ reading: parsed, source: "ai" }, { headers: corsHeaders });
        }
      } catch { /* try next */ }
    }

    return NextResponse.json({ reading: fallback, source: "fallback" }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid input" }, { status: 400, headers: corsHeaders });
  }
}
