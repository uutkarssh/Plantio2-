import "server-only";

/* Shared server-side AI helpers for Plantio. */

const TIMEOUT_MS = 15_000;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in the environment");
  return key;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: "image/jpeg", data: dataUrl };
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
};

async function callGemini(body: Record<string, unknown>): Promise<string> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        const json: GeminiResponse = await response.json();
        const candidate = json?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
          console.error("[Plantio AI] Empty Gemini response:", JSON.stringify(json).slice(0, 1500));
          throw new Error("Gemini returned an empty response");
        }

        if (candidate?.finishReason && candidate.finishReason !== "STOP") {
          console.warn(`[Plantio AI] Gemini finishReason=${candidate.finishReason}`);
        }

        return text;
      }

      const errorText = await response.text().catch(() => "");
      console.error(
        `[Plantio AI] Gemini HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`,
        errorText.slice(0, 1500)
      );

      if (response.status === 400) throw new Error(`Gemini bad request: ${errorText.slice(0, 700)}`);
      if (response.status === 401) throw new Error("Gemini API key authentication failed.");
      if (response.status === 403) throw new Error("Gemini API key is invalid, expired, or does not have permission.");
      if (response.status === 404) throw new Error(`Gemini model "${GEMINI_MODEL}" was not found.`);

      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable) throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 700)}`);

      lastError = new Error(`Gemini temporary error ${response.status}`);
      if (attempt >= maxAttempts) break;

      const retryAfter = response.headers.get("retry-after");
      let delayMs = 0;
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) delayMs = Math.min(Math.max(seconds * 1000, 1000), 10_000);
      }
      if (!delayMs) delayMs = Math.min(1500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500), 8_000);

      console.warn(`[Plantio AI] Retrying Gemini in ${delayMs}ms...`);
      await sleep(delayMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown Gemini error");
      const message = lastError.message;
      const permanent =
        message.includes("GEMINI_API_KEY") ||
        message.includes("authentication") ||
        message.includes("not found") ||
        message.includes("bad request");

      if (permanent || attempt >= maxAttempts) break;

      const delayMs = Math.min(1500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500), 8_000);
      console.warn(`[Plantio AI] Network/temporary error. Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error("Gemini API request failed");
}

export function extractJson(text: string): string | null {
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    // Continue.
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1].trim());
      return JSON.stringify(parsed);
    } catch {
      // Continue.
    }
  }

  const first = text.indexOf("{");
  if (first === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = first; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(first, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          return JSON.stringify(parsed);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export async function runLlm(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  return withTimeout(
    callGemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 700,
      },
    }),
    TIMEOUT_MS
  );
}

/* Gemini structured-output schema for Scan. */
const SCAN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    plant_name: { type: "string", nullable: true },
    plant_name_hi: { type: "string", nullable: true },
    plant_name_local: { type: "string", nullable: true },
    is_healthy: { type: "boolean" },
    disease_name: { type: "string", nullable: true },
    disease_name_hi: { type: "string", nullable: true },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    symptoms_summary: { type: "string" },
    symptoms_summary_hi: { type: "string", nullable: true },
    plant_description_en: { type: "string", nullable: true },
    plant_description_hi: { type: "string", nullable: true },
  },
  required: [
    "plant_name",
    "plant_name_hi",
    "plant_name_local",
    "is_healthy",
    "disease_name",
    "disease_name_hi",
    "confidence",
    "symptoms_summary",
    "symptoms_summary_hi",
    "plant_description_en",
    "plant_description_hi",
  ],
  additionalProperties: false,
};

export async function runVision(
  system: string,
  userPrompt: string,
  imageBase64DataUrl: string
): Promise<string> {
  const { mimeType, data } = parseDataUrl(imageBase64DataUrl);

  return withTimeout(
    callGemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 1400,
        responseMimeType: "application/json",
        responseJsonSchema: SCAN_RESPONSE_SCHEMA,
      },
    }),
    TIMEOUT_MS
  );
}

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
  } catch (error) {
    console.error("[Plantio AI] LLM JSON error:", error);
    return fallback;
  }
}

export async function runChatGemini(
  history: Array<{ role: "user" | "model"; text: string }>,
  newMessage: string,
  systemInstruction: string
): Promise<string> {
  try {
    return await withTimeout(
      callGemini({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
          { role: "user", parts: [{ text: newMessage }] },
        ],
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
      }),
      TIMEOUT_MS
    );
  } catch (error) {
    console.error("[Plantio AI] Chat error:", error);
    return "Plantio is having trouble answering right now — please try again in a moment.";
  }
}
