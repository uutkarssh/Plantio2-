import { NextRequest, NextResponse } from "next/server";
import { runLlmJson } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface FeedItem {
  name: string;
  amount_kg_per_day: string;
  icon: string;
}
interface FeedPlan {
  animal_type: string;
  dry_fodder: FeedItem;
  green_fodder: FeedItem;
  concentrate: FeedItem;
  weekly_note: string;
  warnings: string[];
}

const FALLBACK: FeedPlan = {
  animal_type: "Cow",
  dry_fodder: { name: "Dry Fodder (straw/hay)", amount_kg_per_day: "4-5 kg", icon: "wheat" },
  green_fodder: { name: "Green Fodder", amount_kg_per_day: "15-20 kg", icon: "leaf" },
  concentrate: { name: "Concentrate Mix", amount_kg_per_day: "2-3 kg", icon: "grain" },
  weekly_note: "Adjust concentrate by milk yield: add ~400g per litre of milk above baseline. Provide clean water freely.",
  warnings: [
    "Bloating — swollen left flank, restlessness. Call a vet immediately.",
    "Reduced appetite or sudden drop in milk yield.",
    "Diarrhoea or dull coat lasting more than 2 days.",
  ],
};

const SYSTEM = `You are Plantio's livestock nutrition advisor. Given animal type, weight and daily milk yield, calculate a practical daily feed plan.

Respond ONLY with JSON (no prose, no fences) using exactly this schema:
{
  "animal_type": string,
  "dry_fodder": { "name": string, "amount_kg_per_day": string, "icon": "wheat|leaf|grain" },
  "green_fodder": { "name": string, "amount_kg_per_day": string, "icon": "wheat|leaf|grain" },
  "concentrate": { "name": string, "amount_kg_per_day": string, "icon": "wheat|leaf|grain" },
  "weekly_note": string (one short practical sentence),
  "warnings": [string] (2-3 common warning signs)
}

Base fodder on roughly 2-3% of body weight as dry matter. Add concentrate proportional to milk yield (about 400g per litre for cattle/buffalo). Keep amounts realistic for a smallholder. This is guidance, not a medical diagnosis.`;

export async function POST(req: NextRequest) {
  try {
    const { animal_type, weight, milk_yield } = await req.json();
    if (!animal_type) {
      return NextResponse.json({ error: "animal_type is required." }, { status: 400 });
    }
    const user = `Animal type: ${animal_type}\nWeight (kg): ${weight || "unknown"}\nDaily milk yield (litres): ${milk_yield || 0}\n\nReturn the feed plan as JSON.`;
    const plan = await runLlmJson<FeedPlan>(SYSTEM, user, { ...FALLBACK, animal_type }, { temperature: 0.4, maxTokens: 700 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("cattle route error:", e);
    return NextResponse.json({ plan: { ...FALLBACK } }, { status: 200 });
  }
}
