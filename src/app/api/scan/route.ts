import { NextRequest, NextResponse } from "next/server";
import { runVision, extractJson } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ScanResult {
  plant_name: string | null;
  is_healthy: boolean;
  disease_name: string | null;
  confidence: number;
  symptoms_summary: string;
}

const UNCERTAIN: ScanResult = {
  plant_name: null,
  is_healthy: false,
  disease_name: null,
  confidence: 0,
  symptoms_summary: "This photo isn't clear enough for a confident result.",
};

const SYSTEM_PROMPT = `You are Plantio, an expert plant pathologist assistant. You analyze photos of plants (especially crops and garden plants) and detect signs of disease.

Respond ONLY with a single JSON object, no prose, no markdown fences. Use exactly this schema:
{
  "plant_name": string | null,
  "is_healthy": boolean,
  "disease_name": string | null,
  "confidence": number (0 to 1),
  "symptoms_summary": string (one or two short plain-language sentences)
}

Rules:
- If the plant looks healthy, set is_healthy=true, disease_name=null, confidence between 0.7 and 0.95.
- If a disease is visible, name the most likely disease, set confidence honestly (0.5 to 0.95), and describe symptoms in simple language a farmer understands.
- If the photo is blurry, not a plant, or you are not confident (below 0.7), set confidence below 0.7 and is_healthy=false with disease_name=null.
- Never invent a disease name if uncertain. Honesty over false confidence.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body?.image as string | undefined;
    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "A base64 image is required." }, { status: 400 });
    }

    let text: string;
    try {
      text = await runVision(
        SYSTEM_PROMPT,
        "Analyze this plant photo and return the JSON diagnosis.",
        image
      );
    } catch (e) {
      console.error("scan AI error:", e);
      return NextResponse.json(
        { error: "Couldn't reach the plant doctor. Please retry.", result: UNCERTAIN },
        { status: 502 }
      );
    }

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json({ result: UNCERTAIN });
    }

    let parsed: Partial<ScanResult>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ result: UNCERTAIN });
    }

    const result: ScanResult = {
      plant_name: typeof parsed.plant_name === "string" ? parsed.plant_name : null,
      is_healthy: Boolean(parsed.is_healthy),
      disease_name: typeof parsed.disease_name === "string" ? parsed.disease_name : null,
      confidence: Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, Number(parsed.confidence)))
        : 0,
      symptoms_summary:
        typeof parsed.symptoms_summary === "string" && parsed.symptoms_summary.trim()
          ? parsed.symptoms_summary
          : UNCERTAIN.symptoms_summary,
    };

    return NextResponse.json({ result });
  } catch (e) {
    console.error("scan route error:", e);
    return NextResponse.json(
      { error: "Something went wrong while scanning.", result: UNCERTAIN },
      { status: 500 }
    );
  }
}
