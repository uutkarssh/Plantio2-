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
  symptoms_summary: "This photo isn't clear enough for a confident result.",
  symptoms_summary_hi: null,
  plant_description_en: null,
  plant_description_hi: null,
};

const SYSTEM_PROMPT = `You are Plantio, an expert plant pathologist assistant. You analyze photos of plants (especially crops and garden plants) and detect signs of disease.

Respond ONLY with a single JSON object, no prose, no markdown fences. Use exactly this schema:
{
  "plant_name": string | null (English/common name, e.g. "Wheat", "Rice", "Tomato"),
  "plant_name_hi": string | null (Hindi name in Devanagari script, e.g. "गेहूँ", "धान", "टमाटर"),
  "plant_name_local": string | null (regional/local vernacular name — could be Marathi, Telugu, Bengali, Bhojpuri, etc. depending on the crop. Use the most common Indian regional name that differs from both English and Hindi. If same as plant_name_hi, set null),
  "is_healthy": boolean,
  "disease_name": string | null (English name of the disease),
  "disease_name_hi": string | null (Hindi name of the disease in Devanagari script),
  "confidence": number (0 to 1),
  "symptoms_summary": string (1-2 short plain-language sentences in English describing symptoms or health status),
  "symptoms_summary_hi": string | null (same summary in Hindi — Devanagari script),
  "plant_description_en": string | null (2-3 sentence description of the plant in English — what it is, where it's commonly grown in India, and its main uses. If plant unknown, set null),
  "plant_description_hi": string | null (same description in Hindi — Devanagari script. If plant unknown, set null)
}

Rules:
- If the plant looks healthy, set is_healthy=true, disease_name=null, disease_name_hi=null, confidence between 0.7 and 0.95.
- If a disease is visible, name the most likely disease, set confidence honestly (0.5 to 0.95), and describe symptoms in simple language a farmer understands.
- plant_name: The common English name of the plant.
- plant_name_hi: Hindi name in Devanagari (e.g. "गेहूँ" for Wheat, "धान" for Rice, "मक्का" for Maize, "कपास" for Cotton, "सोयाबीन" for Soybean, "टमाटर" for Tomato, "आलू" for Potato, "गन्ना" for Sugarcane, "सरसों" for Mustard, "मूंगफली" for Groundnut, "चना" for Chickpea, "मटर" for Pea, "पपीता" for Papaya, "केला" for Banana, "आम" for Mango, "नीम" for Neem, "तुलसी" for Tulsi). If unknown, set null.
- plant_name_local: A regional/local Indian name that farmers use, which may be in Marathi, Telugu, Tamil, Bengali, Bhojpuri, etc. For example: Wheat→"गहू" (Marathi), Rice→"भात" (Marathi), Cotton→"कपाशी" (Marathi), Tomato→"टोमॅटो" (Marathi). Pick the most widely used alternate regional name. If no distinct regional name exists, set null.
- disease_name_hi: Hindi disease name in Devanagari (e.g. "पत्ता धब्बा रोग" for Leaf Spot, "अगेली झुलस" for Early Blight, "बैक्टीरियल मुरझाना" for Bacterial Wilt, "पाउडरी आसिता" for Powdery Mildew). If unknown, set null.
- symptoms_summary: 1-2 short English sentences describing what's visible, in simple farmer-friendly language.
- symptoms_summary_hi: Same content translated to Hindi in Devanagari script.
- plant_description_en: A brief 2-3 sentence English description of this plant — what it is, its growing season in India, and its main agricultural or economic uses. This helps farmers understand the plant better.
- plant_description_hi: The exact same description in Hindi using Devanagari script.
- If the photo is blurry, not a plant, or you are not confident (below 0.7), set confidence below 0.7 and is_healthy=false with disease_name=null and disease_name_hi=null.
- Never invent a disease name if uncertain. Honesty over false confidence.
- Never invent a disease name if uncertain. Honesty over false confidence.
- IMPORTANT: Judge photo clarity separately from diagnostic certainty. A clear photo must NOT be called "unclear" simply because the plant has a complex background, multiple leaves, grass, soil, or other plants around it.
- If the main plant or leaves are clearly visible, identify the plant even when the disease cannot be identified confidently.
- If the plant can be identified but disease cannot, return the plant name with confidence based on plant identification and set disease_name to null. Do not return the generic "photo isn't clear enough" response.
- Only use confidence below 0.7 when the image itself is genuinely blurry, severely obstructed, too dark, not a plant, or the plant cannot reasonably be identified.
- IMPORTANT: plant_description_en and plant_description_hi must ALWAYS be provided when plant_name is identified. They give the farmer useful context about the plant.`;

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
        "Analyze this plant photo and return the JSON diagnosis with plant names in English, Hindi, and local/regional language, plus bilingual descriptions.",
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
      plant_name_hi: typeof parsed.plant_name_hi === "string" ? parsed.plant_name_hi : null,
      plant_name_local: typeof parsed.plant_name_local === "string" ? parsed.plant_name_local : null,
      is_healthy: Boolean(parsed.is_healthy),
      disease_name: typeof parsed.disease_name === "string" ? parsed.disease_name : null,
      disease_name_hi: typeof parsed.disease_name_hi === "string" ? parsed.disease_name_hi : null,
      confidence: Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, Number(parsed.confidence)))
        : 0,
      symptoms_summary:
        typeof parsed.symptoms_summary === "string" && parsed.symptoms_summary.trim()
          ? parsed.symptoms_summary
          : UNCERTAIN.symptoms_summary,
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

    return NextResponse.json({ result });
  } catch (e) {
    console.error("scan route error:", e);
    return NextResponse.json(
      { error: "Something went wrong while scanning.", result: UNCERTAIN },
      { status: 500 }
    );
  }
}
