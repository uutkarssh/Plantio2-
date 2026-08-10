import "server-only";

/*
 * Shared server-side AI helpers for Plantio.
 *
 * Used by:
 * /api/scan
 * /api/cure
 * /api/cattle
 * /api/calendar
 * Ask Plantio
 *
 * Provider: Google Gemini API
 * Requires GEMINI_API_KEY in Vercel Environment Variables.
 */

const TIMEOUT_MS = 15_000;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Wait for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add a timeout to a promise.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("AI request timed out"));
    }, ms);

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

/**
 * Get Gemini API key from server environment.
 */
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set in the environment"
    );
  }

  return key;
}

/**
 * Split:
 * data:image/jpeg;base64,...
 *
 * into MIME type + raw base64.
 */
function parseDataUrl(
  dataUrl: string
): {
  mimeType: string;
  data: string;
} {
  const match = dataUrl.match(
    /^data:([^;]+);base64,(.+)$/
  );

  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  // Raw base64 fallback.
  return {
    mimeType: "image/jpeg",
    data: dataUrl,
  };
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

/**
 * Call Gemini.
 *
 * IMPORTANT:
 * Retry logic lives ONLY here.
 *
 * This prevents:
 *
 * runVision
 *   -> callGemini x3
 *   -> runVision retry x2
 *
 * which could create 6 requests for one scan.
 */
async function callGemini(
  body: Record<string, unknown>
): Promise<string> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      const response = await fetch(
        `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      /*
       * Successful response.
       */
      if (response.ok) {
        const json: GeminiResponse =
          await response.json();

        const text =
          json?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          console.error(
            "[Plantio AI] Gemini returned an empty response:",
            JSON.stringify(json).slice(0, 1000)
          );

          throw new Error(
            "Gemini returned an empty response"
          );
        }

        return text;
      }

      /*
       * Read the actual Gemini error.
       */
      const errorText = await response
        .text()
        .catch(() => "");

      console.error(
        `[Plantio AI] Gemini HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`,
        errorText.slice(0, 1000)
      );

      /*
       * Permanent errors.
       *
       * Do NOT retry these.
       */
      if (response.status === 400) {
        throw new Error(
          `Gemini bad request: ${errorText.slice(0, 500)}`
        );
      }

      if (response.status === 401) {
        throw new Error(
          "Gemini API key authentication failed."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "Gemini API key is invalid, expired, or does not have permission."
        );
      }

      if (response.status === 404) {
        throw new Error(
          `Gemini model "${GEMINI_MODEL}" was not found.`
        );
      }

      /*
       * Retryable errors.
       *
       * 429 = rate/quota limit
       * 500 = internal server error
       * 502 = bad gateway
       * 503 = temporary unavailable
       * 504 = gateway timeout
       */
      const retryable =
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      if (!retryable) {
        throw new Error(
          `Gemini API error ${response.status}: ${errorText.slice(
            0,
            500
          )}`
        );
      }

      lastError = new Error(
        `Gemini temporary error ${response.status}`
      );

      /*
       * Stop after the final attempt.
       */
      if (attempt >= maxAttempts) {
        break;
      }

      /*
       * Respect Retry-After if Gemini sends it.
       */
      const retryAfter =
        response.headers.get("retry-after");

      let delayMs = 0;

      if (retryAfter) {
        const seconds = Number(retryAfter);

        if (Number.isFinite(seconds)) {
          delayMs = Math.min(
            Math.max(seconds * 1000, 1000),
            10_000
          );
        }
      }

      /*
       * Otherwise use exponential backoff:
       *
       * attempt 1 -> 1.5 sec
       * attempt 2 -> 3 sec
       *
       * Small random jitter prevents multiple requests
       * from retrying at exactly the same moment.
       */
      if (delayMs === 0) {
        const baseDelay =
          1500 * Math.pow(2, attempt - 1);

        const jitter = Math.floor(
          Math.random() * 500
        );

        delayMs = Math.min(
          baseDelay + jitter,
          8_000
        );
      }

      console.warn(
        `[Plantio AI] Retrying Gemini in ${delayMs}ms...`
      );

      await sleep(delayMs);
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Unknown Gemini error");

      /*
       * Don't retry known permanent configuration errors.
       */
      const message = lastError.message;

      const permanent =
        message.includes("GEMINI_API_KEY") ||
        message.includes("authentication") ||
        message.includes("not found") ||
        message.includes("bad request");

      if (permanent || attempt >= maxAttempts) {
        break;
      }

      /*
       * Network errors / timeouts can be temporary.
       */
      const delayMs = Math.min(
        1500 * Math.pow(2, attempt - 1) +
          Math.floor(Math.random() * 500),
        8_000
      );

      console.warn(
        `[Plantio AI] Network/temporary error. Retrying in ${delayMs}ms...`
      );

      await sleep(delayMs);
    }
  }

  throw (
    lastError ??
    new Error("Gemini API request failed")
  );
}

/**
 * Extract a JSON object from a model response.
 */
export function extractJson(
  text: string
): string | null {
  if (!text) return null;

  /*
   * Direct JSON.
   */
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue.
  }

  /*
   * Markdown fenced JSON.
   */
  const fence = text.match(
    /```(?:json)?\s*([\s\S]*?)```/i
  );

  if (fence) {
    try {
      JSON.parse(fence[1]);
      return fence[1];
    } catch {
      // Continue.
    }
  }

  /*
   * Find first JSON object.
   */
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");

  if (first !== -1 && last > first) {
    const slice = text.slice(
      first,
      last + 1
    );

    try {
      JSON.parse(slice);
      return slice;
    } catch {
      // Continue.
    }
  }

  return null;
}

/**
 * Normal text LLM request.
 *
 * Used by cure, cattle, calendar and similar features.
 */
export async function runLlm(
  system: string,
  user: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const content = await withTimeout(
    callGemini({
      systemInstruction: {
        parts: [
          {
            text: system,
          },
        ],
      },

      contents: [
        {
          role: "user",
          parts: [
            {
              text: user,
            },
          ],
        },
      ],

      generationConfig: {
        temperature:
          opts.temperature ?? 0.4,

        maxOutputTokens:
          opts.maxTokens ?? 700,
      },
    }),
    TIMEOUT_MS
  );

  return content;
}

/**
 * Vision request used by Plantio Scan.
 *
 * Only ONE callGemini retry system is used.
 */
export async function runVision(
  system: string,
  userPrompt: string,
  imageBase64DataUrl: string
): Promise<string> {
  const {
    mimeType,
    data,
  } = parseDataUrl(imageBase64DataUrl);

  const content = await withTimeout(
    callGemini({
      systemInstruction: {
        parts: [
          {
            text: system,
          },
        ],
      },

      contents: [
        {
          role: "user",

          parts: [
            {
              text: userPrompt,
            },

            {
              inline_data: {
                mime_type: mimeType,
                data,
              },
            },
          ],
        },
      ],

      generationConfig: {
        temperature: 0.2,

        /*
         * Scan normally returns a compact JSON response.
         * Lowering this reduces unnecessary token usage.
         */
        maxOutputTokens: 650,

        responseMimeType: "application/json",
      },
    }),
    TIMEOUT_MS
  );

  return content;
}

/**
 * LLM request + JSON parsing with fallback.
 */
export async function runLlmJson<T>(
  system: string,
  user: string,
  fallback: T,
  opts: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  try {
    const text = await runLlm(
      system,
      user,
      opts
    );

    const jsonStr = extractJson(text);

    if (!jsonStr) {
      return fallback;
    }

    const parsed = JSON.parse(jsonStr);

    return {
      ...fallback,
      ...parsed,
    } as T;
  } catch (error) {
    console.error(
      "[Plantio AI] LLM JSON error:",
      error
    );

    return fallback;
  }
}

/**
 * Multi-turn Ask Plantio chat.
 */
export async function runChatGemini(
  history: Array<{
    role: "user" | "model";
    text: string;
  }>,
  newMessage: string,
  systemInstruction: string
): Promise<string> {
  try {
    const content = await withTimeout(
      callGemini({
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },

        contents: [
          ...history.map((turn) => ({
            role: turn.role,
            parts: [
              {
                text: turn.text,
              },
            ],
          })),

          {
            role: "user",
            parts: [
              {
                text: newMessage,
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0.5,

          /*
           * Chat answers don't need huge output.
           */
          maxOutputTokens: 400,
        },
      }),
      TIMEOUT_MS
    );

    return content;
  } catch (error) {
    console.error(
      "[Plantio AI] Chat error:",
      error
    );

    return "Plantio is having trouble answering right now — please try again in a moment.";
  }
        }
