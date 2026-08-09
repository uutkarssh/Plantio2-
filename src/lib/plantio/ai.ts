import "server-only";

/* Shared server-side AI helpers — timeout + retry + strict JSON validation.
 * Used by /api/scan, /api/cure, /api/cattle, /api/calendar.
 * Provider: Google Gemini API (free tier) — https://ai.google.dev
 * Requires GEMINI_API_KEY in the environment. */

const TIMEOUT_MS = 12_000;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI request timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in the environment");
  return key;
}

/* Split a "data:image/jpeg;base64,...." string into mimeType + raw base64. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  // Already raw base64 with no data-url prefix — assume JPEG.
  return { mimeType: "image/jpeg", data: dataUrl };
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

async function callGemini(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json: GeminiResponse = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty AI response");
  return text;
}

/* Extract a JSON object from a possibly-prose model response. */
export function extractJson(text: string): string | null {
  if (!text) return null;
  // direct parse
  try {
    JSON.parse(text);
    return text;
  } catch {
    /* continue */
  }
  // fenced ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      JSON.parse(fence[1]);
      return fence[1];
    } catch {
      /* continue */
    }
  }
  // first {...} block
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try {
      JSON.parse(slice);
      return slice;
    } catch {
      /* continue */
    }
  }
  return null;
}

/* Run an LLM text completion with timeout + 1 retry, return raw text. */
export async function runLlm(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await withTimeout(
        callGemini({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: opts.maxTokens ?? 900,
          },
        }),
        TIMEOUT_MS
      );
      if (content) return content;
      lastErr = new Error("Empty AI response");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("AI call failed");
}

/* Run a vision (VLM) completion with timeout + 1 retry, return raw text. */
export async function runVision(
  system: string,
  userPrompt: string,
  imageBase64DataUrl: string
): Promise<string> {
  const { mimeType, data } = parseDataUrl(imageBase64DataUrl);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await withTimeout(
        callGemini({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }, { inline_data: { mime_type: mimeType, data } }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 900,
          },
        }),
        TIMEOUT_MS
      );
      if (content) return content;
      lastErr = new Error("Empty AI vision response");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("AI vision call failed");
}

/* Run LLM and parse to a validated JSON object (with fallback). */
export async function runLlmJson<T>(
  system: string,
  user: string,
  fallback: T,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  try {
    const text = await runLlm(system, user, opts);
    const jsonStr = extractJson(text);
    if (!jsonStr) return fallback;
    const parsed = JSON.parse(jsonStr);
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

/* Run a multi-turn chat completion (used by the "Ask Plantio" widget). */
export async function runChatGemini(
  history: Array<{ role: "user" | "model"; text: string }>,
  newMessage: string,
  systemInstruction: string
): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await withTimeout(
        callGemini({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
            { role: "user", parts: [{ text: newMessage }] },
          ],
          generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
        }),
        TIMEOUT_MS
      );
      if (content) return content;
      lastErr = new Error("Empty chat response");
    } catch (e) {
      lastErr = e;
    }
  }
  return "Plantio is having trouble answering right now — try again in a moment.";
}
