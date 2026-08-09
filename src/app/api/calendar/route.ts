import { NextRequest, NextResponse } from "next/server";
import { runLlm } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are Plantio's farm advisory assistant. You receive a crop name, its current growth stage, and a short weather summary for the next few days.

Respond with ONE single short, practical sentence (max 20 words) of advice combining the crop stage with the weather. No JSON, no headings, no emojis — just the sentence. If the weather is clear and calm and the crop stage needs no action, say something reassuring. Example: "Rain expected tomorrow — hold off spraying pesticide today."`;

export async function POST(req: NextRequest) {
  try {
    const { crop, stage, weather } = await req.json();
    if (!crop || !stage) {
      return NextResponse.json({ error: "crop and stage are required." }, { status: 400 });
    }
    let advisory = "";
    try {
      advisory = await runLlm(
        SYSTEM,
        `Crop: ${crop}\nCurrent stage: ${stage}\nWeather summary: ${weather || "no data"}\n\nGive the one-line advisory.`,
        { temperature: 0.5, maxTokens: 80 }
      );
      advisory = advisory.replace(/\s+/g, " ").trim().split("\n")[0].slice(0, 180);
    } catch (e) {
      console.error("calendar AI error:", e);
      // fail soft — frontend hides the banner
      return NextResponse.json({ advisory: null }, { status: 200 });
    }
    return NextResponse.json({ advisory: advisory || null });
  } catch (e) {
    console.error("calendar route error:", e);
    return NextResponse.json({ advisory: null }, { status: 200 });
  }
}
