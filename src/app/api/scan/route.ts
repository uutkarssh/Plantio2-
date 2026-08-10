import { NextRequest, NextResponse } from "next/server";
import { runVision, extractJson } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ScanResult {
  plant_name: string | null;
  plant_name_hi: string | null;
  plant_name_local: string | null;
  is_healthy: boolean;
  disease_name: string | null;
  disease_name_hi: string | null;
  confidence: number;
  symptoms_summary: string;
  symptoms_summary_hi: string | null;
  plant_description_en: string | null;
  plant_description_hi: string | null;
}

const UNCERTAIN: ScanResult = {
  plant_name: null,
  plant_name_hi: null,
  plant_name_local: null,
  is_healthy: false,
  disease_name: null,
  disease_name_hi: null,
  confidence: 0,
  symptoms_summary: "The plant could not be identified confidently from this image.",
  symptoms_summary_hi: null,
  plant_description_en: null,
  plant_description_hi: null,
};

const SYSTEM_PROMPT = `You are Plantio, an expert plant pathologist assistant. You analyze photos of plants (especially crops and garden plants) and detect signs of disease.

Respond ONLY with a single JSON object, no prose, no markdown fences. Use exactly this schema:
{
  "plant_name": string | null,
  "plant_name_hi": string | null,
  "plant_name_local": string | null,
  "is_healthy": boolean,
  "disease_name": string | null,
  "disease_name_hi": string | null,
  "confidence": number (0 to 1),
  "symptoms_summary": string,
  "symptoms_summary_hi": string | null,
  "plant_description_en": string | null,
  "plant_description_hi": string | null
}

Rules:
- Judge image clarity separately from diagnostic certainty.
- Do NOT call a clear image unclear merely because it contains multiple leaves, grass, soil, other plants, or a complex background.
- If the main plant or leaves are clearly visible, identify the plant whenever reasonably possible.
- If the plant can be identified but the disease cannot, return the plant name and set disease_name and disease_name_hi to null. Do not use a generic unclear-photo response.
- Only use very low confidence when the image is genuinely blurry, severely obstructed, too dark, not a plant, or the plant cannot reasonably be identified.
- If the plant looks healthy, set is_healthy=true and disease_name=null.
- If a disease is visible, name the most likely disease and describe the visible symptoms in simple farmer-friendly language.
- Never invent a disease name if uncertain. Honesty over false confidence.
- plant_name_hi must be the Hindi name in Devanagari when known.
- plant_name_local may contain a useful Indian regional/local name when known; otherwise null.
- symptoms_summary should be 1-2 short English sentences.
- symptoms_summary_hi should contain the same information in Hindi when possible.
- plant_description_en and plant_description_hi should be provided whenever plant_name is identified.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body?.image as string | undefined;

    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { ok: false, error: "INVALID_IMAGE", message: "A base64 image is required." },
        { status: 400 }
      );
    }

    let text: string;

    try {
      text = await runVision(
        SYSTEM_PROMPT,
        "Analyze this plant photo and return the JSON diagnosis. Identify the plant if it is reasonably visible, even if the disease cannot be determined confidently.",
        image
      );
    } catch (e) {
      console.error("[Scan] AI backend error:", e);
      const message = e instanceof Error ? e.message : "Unknown AI error";

      let error = "AI_ERROR";
      let status = 502;

      if (message.includes("429") || message.toLowerCase().includes("rate") || message.toLowerCase().includes("quota")) {
        error = "AI_RATE_LIMITED";
        status = 429;
      } else if (message.includes("503") || message.toLowerCase().includes("unavailable")) {
        error = "AI_UNAVAILABLE";
        status = 503;
      } else if (message.toLowerCase().includes("timed out") || message.toLowerCase().includes("timeout")) {
        error = "AI_TIMEOUT";
        status = 504;
      } else if (message.includes("403") || message.toLowerCase().includes("api key")) {
        error = "AI_AUTH_ERROR";
        status = 502;
      }

      return NextResponse.json(
        {
          ok: false,
          error,
          message: "The AI service could not process the scan. Please try again shortly.",
        },
        { status }
      );
    }

    const jsonStr = extractJson(text);

    if (!jsonStr) {
      console.error("[Scan] Gemini returned non-JSON response:", text.slice(0, 1000));
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_AI_RESPONSE",
          message: "The AI returned an invalid response. Please try again.",
        },
        { status: 502 }
      );
    }

    let parsed: Partial<ScanResult>;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[Scan] JSON parse error:", e);
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_AI_RESPONSE",
          message: "The AI returned an invalid diagnosis response. Please try again.",
        },
        { status: 502 }
      );
    }

    const plantName = typeof parsed.plant_name === "string" && parsed.plant_name.trim()
      ? parsed.plant_name.trim()
      : null;
    const diseaseName = typeof parsed.disease_name === "string" && parsed.disease_name.trim()
      ? parsed.disease_name.trim()
      : null;
    const confidence = Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, Number(parsed.confidence)))
      : 0;

    // Plant identification and disease certainty are separate.
    // If Gemini can identify the plant but cannot confirm a disease, keep the
    // result usable instead of sending the frontend into its "photo unclear" state.
    const identifiedWithoutDisease = Boolean(plantName) && !diseaseName;

    const result: ScanResult = {
      plant_name: plantName,
      plant_name_hi: typeof parsed.plant_name_hi === "string" ? parsed.plant_name_hi : null,
      plant_name_local: typeof parsed.plant_name_local === "string" ? parsed.plant_name_local : null,
      is_healthy: Boolean(parsed.is_healthy) || identifiedWithoutDisease,
      disease_name: diseaseName,
      disease_name_hi: typeof parsed.disease_name_hi === "string" ? parsed.disease_name_hi : null,
      confidence,
      symptoms_summary:
        identifiedWithoutDisease
          ? (typeof parsed.symptoms_summary === "string" && parsed.symptoms_summary.trim()
              ? parsed.symptoms_summary
              : "The plant was identified, but no specific disease could be confirmed from this photo.")
          : (typeof parsed.symptoms_summary === "string" && parsed.symptoms_summary.trim()
              ? parsed.symptoms_summary
              : UNCERTAIN.symptoms_summary),
      symptoms_summary_hi:
        typeof parsed.symptoms_summary_hi === "string" && parsed.symptoms_summary_hi.trim()
          ? parsed.symptoms_summary_hi
          : null,
      plant_description_en:
        typeof parsed.plant_description_en === "string" && parsed.plant_description_en.trim()
          ? parsed.plant_description_en
          : null,
      plant_description_hi:
        typeof parsed.plant_description_hi === "string" && parsed.plant_description_hi.trim()
          ? parsed.plant_description_hi
          : null,
    };

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[Scan] route error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "SCAN_SERVER_ERROR",
        message: "Something went wrong while scanning. Please try again.",
      },
      { status: 500 }
    );
  }
}
