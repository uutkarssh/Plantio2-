"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* useVoiceInput — wraps the Web Speech API (SpeechRecognition) so any text/number
 * input field can be voice-filled. Falls back gracefully on unsupported browsers
 * (Safari uses webkitSpeechRecognition; Chrome uses SpeechRecognition; Firefox
 * has no implementation yet — hook reports supported=false and the calling UI
 * hides its mic button).
 *
 * Recognises English + Hindi (devanagari) — the user can speak numbers in either
 * language and we parse the result into digits.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/* Word -> digit map for Hindi (devanagari + latin transliteration) and common
 * spoken variants. Lets the user say "तीन सौ पचास" or "three hundred fifty"
 * and get a numeric value back. */
const WORD_TO_DIGIT: Record<string, string> = {
  // English
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15",
  sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
  twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60",
  seventy: "70", eighty: "80", ninety: "90", hundred: "00", thousand: "000",
  // Hindi (devanagari)
  "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पाँच": "5",
  "पांच": "5", "छह": "6", "छः": "6", "सात": "7", "आठ": "8", "नौ": "9",
  "दस": "10", "बीस": "20", "तीस": "30", "चालीस": "40", "पचास": "50",
  "साठ": "60", "सत्तर": "70", "अस्सी": "80", "नब्बे": "90",
  "सौ": "00", "हज़ार": "000", "हजार": "000",
};

/* Convert a spoken transcript like "three hundred fifty" or "तीन सौ पचास" to
 * a numeric string. Strategy: walk tokens; multiply running total by 1000 for
 * "thousand/हज़ार", by 100 for "hundred/सौ", otherwise add the digit value. */
function transcriptToNumber(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  let sawAny = false;
  for (const tok of tokens) {
    if (tok in WORD_TO_DIGIT) {
      sawAny = true;
      const v = WORD_TO_DIGIT[tok];
      if (v === "000") {
        current = (current || 1) * 1000;
      } else if (v === "00") {
        current = (current || 1) * 100;
      } else {
        current += parseInt(v, 10);
      }
    } else if (/^\d+$/.test(tok)) {
      sawAny = true;
      current += parseInt(tok, 10);
    } else {
      // unknown word — flush current into total
      total += current;
      current = 0;
    }
  }
  total += current;
  if (!sawAny) {
    // no number words at all — fall back to stripping non-digits from the original
    const digits = text.replace(/[^\d]/g, "");
    return digits;
  }
  return String(total);
}

export interface VoiceInputOptions {
  /* "text" — keep the transcript as-is. "number" — parse transcript into a numeric string. */
  mode?: "text" | "number";
  /* Called whenever a final transcript arrives. Returns the value to set into the input. */
  onResult: (value: string) => void;
  /* Language code passed to SpeechRecognition (default: en-IN for best Hindi+English mix). */
  lang?: string;
}

export function useVoiceInput({
  mode = "text",
  onResult,
  lang = "en-IN",
}: VoiceInputOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // keep the latest onResult in a ref so we don't reinit the recognition on every render
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      // Defer to a microtask so we don't call setState synchronously in the
      // effect body (react-hooks/set-state-in-effect). Browser-API read.
      queueMicrotask(() => setSupported(false));
      return;
    }
    queueMicrotask(() => setSupported(true));
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      try {
        const transcript = Array.from(e.results ?? [])
          .map((r: any) => r[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (!transcript) return;
        const value =
          modeRef.current === "number"
            ? transcriptToNumber(transcript)
            : transcript;
        onResultRef.current(value);
      } catch {
        /* ignore */
      }
    };
    rec.onerror = (e: any) => {
      const err = e?.error || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Microphone permission denied — enable it in your browser settings.");
      } else if (err === "no-speech") {
        setError("Didn't hear anything — try again, closer to the mic.");
      } else if (err === "network") {
        setError("Voice input needs an internet connection.");
      } else {
        setError("Voice input failed — try typing instead.");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;

    return () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    setError("");
    const rec = recRef.current;
    if (!rec) {
      setError("Voice input isn't supported on this browser.");
      return;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      // calling start() twice throws InvalidStateError — safe to ignore
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop, setError };
}
