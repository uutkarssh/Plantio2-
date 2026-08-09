"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  Leaf,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/plantio/i18n";
import {
  openAskPlantio,
  closeAskPlantio,
  onAskPlantioOpen,
  type AskPlantioContext,
} from "@/lib/plantio/ask-plantio-state";

/* ── Chat message type ────────────────────────────────────────── */
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/* ── Quick question presets ───────────────────────────────────── */
const QUICK_QUESTIONS_DISEASE = [
  "What causes this disease?",
  "How do I cure it organically?",
  "Which fertilizer should I use?",
  "How does it spread?",
  "Will it affect my other crops?",
];

const QUICK_QUESTIONS_HEALTHY = [
  "What fertilizer keeps it healthy?",
  "When should I water this plant?",
  "What common diseases should I watch for?",
  "How do I improve yield?",
];

/* ── The shared modal component ─────────────────────────────────
 *
 * Mount this ONCE in AppShell (or layout). It renders via React
 * portal at document.body so it escapes any parent stacking context.
 * Other components open it by calling openAskPlantio(context).
 */
export function AskPlantioModal() {
  const { lang } = useI18n();
  const isHindi = lang === "hi" || lang === "mr";

  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<AskPlantioContext>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydration-safe mount flag
  useEffect(() => { setMounted(true); }, []);

  // Listen for open events from anywhere in the app
  useEffect(() => {
    return onAskPlantioOpen((ctx) => {
      setContext(ctx);
      setMessages([]);
      setInput("");
      setOpen(true);
      // Focus input after transition
      setTimeout(() => inputRef.current?.focus(), 200);
    });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || sending) return;
    const trimmed = question.trim();
    setInput("");
    setSending(true);

    const newMessages: ChatMsg[] = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context,
          history: newMessages.slice(-8),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: isHindi ? "उत्तर देने में समस्या हुई। कृपया दोबारा प्रयास करें।" : "Couldn't get an answer. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, context, isHindi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    closeAskPlantio();
  }, []);

  const quickQuestions = context.is_healthy ? QUICK_QUESTIONS_HEALTHY : QUICK_QUESTIONS_DISEASE;

  // Don't render until client-side mounted (portal needs document.body)
  if (!mounted) return null;

  // When closed, render nothing (the trigger buttons in each page handle the CTA)
  if (!open) return null;

  // Determine subtitle from context
  const subtitle = context.disease_name
    ? `${context.plant_name || "Plant"} · ${context.disease_name}`
    : (context.plant_name || "Your plant");

  const modal = (
    <>
      {/* Full-screen backdrop — blocks ALL interaction with page behind it */}
      <div
        className="fixed inset-0 z-[10001] bg-black/50 animate-[plantio-backdrop-in_0.2s_ease_both]"
        onClick={handleClose}
        aria-hidden
      />

      {/* Bottom sheet — z-index above backdrop and above everything else */}
      <div className="fixed inset-x-0 bottom-0 z-[10002] flex justify-center plantio-slide-up">
        <div
          className="w-full max-w-2xl flex flex-col overflow-x-hidden overflow-y-hidden rounded-t-3xl border-[3px] border-b-0 border-ink bg-white shadow-[0_-5px_0px_0px_#161611]"
          style={{ maxHeight: "calc(100dvh - 3rem)" }}
        >
          {/* Header — forest green, flush with card top */}
          <div className="bg-forest text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-leaf border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
              <MessageCircle className="w-5 h-5 text-ink" strokeWidth={2.5} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold uppercase truncate leading-tight">
                {isHindi ? "प्लांटियो से पूछें" : "Ask Plantio"}
              </p>
              <p className="text-[11px] text-white/70 truncate leading-tight mt-0.5">
                {subtitle}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 w-8 h-8 rounded-lg bg-white/15 border-[2px] border-white/30 flex items-center justify-center text-white/90 hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Quick question chips */}
          {messages.length === 0 && (
            <div className="px-4 py-3 border-b border-ink/10 shrink-0">
              <p className="font-display text-[10px] font-bold uppercase text-ink/50 mb-2">
                {isHindi ? "जल्दी से पूछें" : "Quick questions"}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuestion(q)}
                    disabled={sending}
                    className="rounded-full border-[2px] border-ink bg-leaf/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-leaf/40 active:translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages — scrollable (no padding on outer so scrollbar is flush) */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto plantio-chat-scroll"
          >
            <div className="px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <Leaf className="w-10 h-10 text-forest mx-auto leaf-bob" strokeWidth={2.5} />
                  <p className="mt-3 text-sm text-ink/50">
                    {isHindi ? "अपना सवाल नीचे टाइप करें या ऊपर से चुनें" : "Type your question below or pick one from above"}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] min-w-0 rounded-2xl border-[2.5px] border-ink p-4 shadow-[2px_2px_0px_0px_#161611] break-words ${
                      msg.role === "user"
                        ? "bg-forest text-white rounded-br-sm"
                        : "bg-cream text-ink rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <p className="font-display text-[10px] font-bold uppercase text-forest mb-1.5 flex items-center gap-1">
                        <Leaf className="w-3 h-3" strokeWidth={2.5} /> Plantio
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-3 shadow-[2px_2px_0px_0px_#161611] rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-forest animate-spin" strokeWidth={2.5} />
                    <span className="text-xs text-ink/60 font-display font-bold uppercase">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input area — cream bg, safe area padding so input is above bottom nav */}
          <div className="shrink-0 bg-cream" style={{ paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom) + 1rem))" }}>
          <form
            onSubmit={handleSubmit}
            className="w-full px-3 pt-3 pb-1 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isHindi ? "अपना सवाल लिखें..." : "Type your question..."}
              disabled={sending}
              className="flex-1 min-w-0 rounded-xl border-[2.5px] border-ink bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-leaf focus:border-forest disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] text-white disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-0.5 transition-all"
              aria-label="Send"
            >
              <Send className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </form>
          </div>
        </div>
      </div>
    </>
  );

  // Render via React portal at document.body to escape all stacking contexts
  return createPortal(modal, document.body);
}
