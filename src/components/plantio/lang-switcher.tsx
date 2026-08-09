"use client";
import { Languages } from "lucide-react";
import { useI18n, type Lang } from "@/lib/plantio/i18n";

const LANG_SHORT: Record<Lang, string> = {
  en: "EN",
  hi: "हि",
  mr: "मरा",
};

const CYCLE: Lang[] = ["en", "hi", "mr"];

export function LangSwitcher() {
  const { lang, setLang } = useI18n();

  const cycle = () => {
    const idx = CYCLE.indexOf(lang);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setLang(next);
  };

  return (
    <button
      onClick={cycle}
      aria-label={`Switch language — current: ${lang}`}
      className="fixed top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-2 border-[2.5px] border-ink rounded-full bg-white shadow-[3px_3px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all font-display text-sm font-bold uppercase text-ink"
    >
      <Languages className="w-4 h-4" strokeWidth={2.5} />
      <span>{LANG_SHORT[lang]}</span>
    </button>
  );
}
