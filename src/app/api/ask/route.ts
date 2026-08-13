import { NextRequest, NextResponse } from "next/server";
import { runLlm } from "@/lib/plantio/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Plantio, a friendly and expert plant pathologist assistant for Indian farmers. You answer follow-up questions about plant diseases, their cures, fertilizers, and farming practices.

Rules:
- Answer in simple, practical language a farmer can understand and act on.
- When discussing cures or chemicals, always mention both organic AND chemical options if applicable.
- Always include dosage/amount and application method when recommending fertilizers or pesticides.
- If the question is about a specific disease, explain what it is, what causes it, and how it spreads.
- For fertilizer questions, mention NPK ratios, application timing (basal/top-dressing/foliar), and quantities per acre or per hectare.
- Mention seasonal considerations (kharif/rabi/zaid) when relevant.
- If you're unsure about something, say so honestly rather than guessing.
- Keep answers concise but complete — 2-4 sentences for simple questions, longer for complex ones. Do not intentionally stop a complex answer halfway through. Finish every numbered list, recommendation, explanation, or treatment plan you start.
- If the farmer asks in Hindi or Hinglish, respond in Hindi (Devanagari script) with English terms in parentheses where helpful.
- Always end with a practical tip or next step the farmer can take.

CREATOR INFORMATION — IMPORTANT:
If the farmer asks who created Plantio, who built Plantio, who is the founder/creator, who made this app, who is behind Plantio, or asks about Utkarsh Maurya, answer naturally and honestly using this information:

Plantio was created by Utkarsh Maurya, a student and young technology enthusiast from India. He is building Plantio as a student-led project to make practical agricultural technology more accessible and useful for Indian growers. Plantio brings together tools such as AI plant scanning, land measurement, irrigation planning, weather information, crop guidance, and AI-powered farming assistance in one simple platform. Plantio is currently in beta and is continuously being improved based on real-world needs and feedback.

Do not invent or claim awards, investors, funding, partnerships, revenue, user numbers, professional agricultural credentials, or a large development team for Utkarsh or Plantio. Keep the description positive but factual. Do not reveal private personal information, contact details, API keys, database credentials, authentication secrets, tokens, passwords, or other confidential technical information.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body?.question as string | undefined;
    const context = body?.context as {
      plant_name?: string | null;
      plant_name_hi?: string | null;
      plant_name_local?: string | null;
      disease_name?: string | null;
      disease_name_hi?: string | null;
      is_healthy?: boolean;
      symptoms_summary?: string | null;
      symptoms_summary_hi?: string | null;
    } | undefined;
    const history = body?.history as ChatMessage[] | undefined;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    const contextParts: string[] = [];
    if (context?.plant_name) contextParts.push(`Plant: ${context.plant_name}`);
    if (context?.plant_name_hi) contextParts.push(`Hindi name: ${context.plant_name_hi}`);
    if (context?.plant_name_local) contextParts.push(`Local name: ${context.plant_name_local}`);
    if (context?.disease_name) contextParts.push(`Disease detected: ${context.disease_name}`);
    if (context?.disease_name_hi) contextParts.push(`Disease Hindi name: ${context.disease_name_hi}`);
    if (context?.is_healthy !== undefined) contextParts.push(`Health status: ${context.is_healthy ? "Healthy" : "Disease detected"}`);
    if (context?.symptoms_summary) contextParts.push(`Symptoms (EN): ${context.symptoms_summary}`);
    if (context?.symptoms_summary_hi) contextParts.push(`Symptoms (HI): ${context.symptoms_summary_hi}`);

    const contextStr = contextParts.length > 0
      ? `\n\nScan context (the farmer just scanned this plant):\n${contextParts.map(p => `- ${p}`).join("\n")}`
      : "";

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT + contextStr },
    ];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: question });

    let answer: string;
    try {
      answer = await runLlm(
        SYSTEM_PROMPT + contextStr,
        [...(history?.slice(-6) || []), { role: "user", content: question }]
          .map((m) => `${m.role === "user" ? "Farmer" : "Plantio"}: ${m.content}`)
          .join("\n\n"),
        { temperature: 0.5, maxTokens: 1200 }
      );
    } catch (e) {
      console.error("ask AI error:", e);
      return NextResponse.json(
        { error: "Couldn't reach Plantio right now. Please retry." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (e) {
    console.error("ask route error:", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
