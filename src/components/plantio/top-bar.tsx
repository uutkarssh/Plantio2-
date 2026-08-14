"use client";
/* Scroll-aware top bar that holds the hamburger menu + language switcher. */
import { useEffect, useState, useRef } from "react";
import { Languages, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n, type Lang } from "@/lib/plantio/i18n";
import { openDrawer, onDrawerStateChange, getDrawerIsOpen } from "@/lib/plantio/drawer-state";

const LANG_SHORT: Record<Lang, string> = { en: "EN", hi: "हि", mr: "मरा" };
const LANG_CYCLE: Lang[] = ["en", "hi", "mr"];
const SCROLL_THRESHOLD = 10;

export function TopBar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { lang, setLang } = useI18n();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const isMeasurePage = pathname === "/measure";
  const isCurePage = pathname === "/scan/cure";

  useEffect(() => {
    const initial = getDrawerIsOpen();
    if (initial) queueMicrotask(() => setDrawerOpen(true));
    return onDrawerStateChange((open) => setDrawerOpen(open));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (y < SCROLL_THRESHOLD) setVisible(true);
        else if (delta > 6) setVisible(false);
        else if (delta < -6) setVisible(true);
        lastScrollY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cycleLang = () => {
    const idx = LANG_CYCLE.indexOf(lang);
    setLang(LANG_CYCLE[(idx + 1) % LANG_CYCLE.length]);
  };

  const openMenu = () => {
    if (onMenuOpen) onMenuOpen();
    else openDrawer();
  };

  if (drawerOpen) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-3 transition-transform duration-300 ease-in-out pointer-events-none ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {!isMeasurePage && !isCurePage && (
        <button
          onClick={cycleLang}
          aria-label={`Switch language — current: ${lang}`}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 border-[2.5px] border-ink rounded-full bg-white/95 backdrop-blur-sm shadow-[3px_3px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all font-display text-sm font-bold uppercase text-ink"
        >
          <Languages className="w-4 h-4" strokeWidth={2.5} />
          <span>{LANG_SHORT[lang]}</span>
        </button>
      )}

      <button
        onClick={openMenu}
        aria-label="Open menu"
        className="pointer-events-auto w-12 h-12 rounded-2xl bg-cream/95 backdrop-blur-sm border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
      >
        <Menu className="w-6 h-6 text-forest" strokeWidth={2.5} />
      </button>
    </div>
  );
}
