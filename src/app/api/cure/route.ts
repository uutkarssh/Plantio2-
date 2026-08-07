import { NextRequest, NextResponse } from "next/server";
import { runLlmJson } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface CureStep {
  step: string;
  detail: string;
}
interface FertilizerItem {
  name: string;
  amount: string;
  frequency: string;
}
interface CurePlan {
  disease_name: string;
  immediate_treatment: CureStep[];
  organic_option: CureStep[];
  chemical_option: CureStep[];
  fertilizer_and_nutrients: FertilizerItem[];
  prevention_tips: string[];
}

const FALLBACK: CurePlan = {
  disease_name: "Unknown",
  immediate_treatment: [{ step: "Inspect the crop", detail: "Remove and destroy severely affected leaves to slow the spread." }],
  organic_option: [{ step: "Neem oil spray", detail: "Apply neem oil every 7 days as a gentle organic option." }],
  chemical_option: [{ step: "Consult local officer", detail: "For a confirmed diagnosis, ask a local agricultural officer for the right fungicide." }],
  fertilizer_and_nutrients: [{ name: "Balanced NPK", amount: "As per soil test", frequency: "Once at flowering" }],
  prevention_tips: ["Improve air circulation between plants.", "Avoid overhead watering in the evening."],
};

const SYSTEM = `You are Plantio's agronomist. Given a plant disease, produce a practical cure and fertilizer plan that a smallholder farmer can follow.

Respond ONLY with a JSON object (no prose, no fences) using exactly this schema:
{
  "disease_name": string,
  "immediate_treatment": [{ "step": string, "detail": string }],
  "organic_option": [{ "step": string, "detail": string }],
  "chemical_option": [{ "step": string, "detail": string }],
  "fertilizer_and_nutrients": [{ "name": string, "amount": string, "frequency": string }],
  "prevention_tips": [string]
}

Keep steps short and actionable. Organic first, chemical clearly separated. Amounts in plain units a farmer understands (kg, litres, grams). 3-5 items per list where sensible.`;

export async function POST(req: NextRequest) {
  try {
    const { disease_name, plant_name } = await req.json();
    if (!disease_name || typeof disease_name !== "string") {
      return NextResponse.json({ error: "disease_name is required." }, { status: 400 });
    }
    const user = `Plant: ${plant_name || "unknown"}\nDisease: ${disease_name}\n\nGive the cure & fertilizer plan as JSON.`;
    const plan = await runLlmJson<CurePlan>(SYSTEM, user, { ...FALLBACK, disease_name }, { temperature: 0.4, maxTokens: 1100 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("cure route error:", e);
    return NextResponse.json({ plan: { ...FALLBACK } }, { status: 200 });
  }
}
