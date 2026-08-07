import "server-only";
import ZAI from "z-ai-web-dev-sdk";

/* Shared server-side AI helpers — timeout + retry + strict JSON validation.
 * Used by /api/scan, /api/cure, /api/cattle, /api/calendar. */

const TIMEOUT_MS = 12_000;

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

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!_zai) _zai = await ZAI.create();
  return _zai;
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
      const zai = await getZai();
      const res = await withTimeout(
        zai.chat.completions.create({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 900,
        }),
        TIMEOUT_MS
      );
      const content = res?.choices?.[0]?.message?.content;
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
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const zai = await getZai();
      const res = await withTimeout(
        zai.chat.completions.createVision({
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageBase64DataUrl } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
        TIMEOUT_MS
      );
      const content = res?.choices?.[0]?.message?.content;
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
