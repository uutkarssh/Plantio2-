"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  ScanLine,
  MapPinned,
  Beef,
  IndianRupee,
  CalendarDays,
  BookOpen,
  Repeat,
  Info,
  History,
  Languages,
  Wallet,
  MessageSquareHeart,
  NotebookPen,
  CloudSun,
  Settings,
  Sprout,
  Bug,
  Wheat,
  Heart,
  Droplets,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/lib/plantio/i18n";
import { onDrawerOpen, closeDrawer } from "@/lib/plantio/drawer-state";
import { openAskPlantio } from "@/lib/plantio/ask-plantio-state";

/* ── Menu sections ─────────────────────────────────────────────── */
interface MenuItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface MenuSection {
  headerKey: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    headerKey: "drawer.tools",
    items: [
      { href: "/", labelKey: "nav.home", icon: Home },
      { href: "/scan", labelKey: "nav.scanPlant", icon: ScanLine },
      { href: "/scan/history", labelKey: "nav.history", icon: History },
      { href: "/measure", labelKey: "nav.measureLand", icon: MapPinned },
      { href: "/weather", labelKey: "nav.weather", icon: CloudSun },
      { href: "/guides", labelKey: "nav.guides", icon: BookOpen },
      { href: "/yield", labelKey: "drawer.yield", icon: Wheat },
      { href: "/irrigation", labelKey: "drawer.irrigation", icon: Droplets },
      { href: "/seeds", labelKey: "drawer.seeds", icon: Sprout },
    ],
  },
  {
    headerKey: "drawer.manage",
    items: [
      { href: "/cattle", labelKey: "nav.cattle", icon: Beef },
      { href: "/mandi", labelKey: "nav.mandi", icon: IndianRupee },
      { href: "/expenses", labelKey: "nav.expenses", icon: Wallet },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/rotation", labelKey: "nav.rotation", icon: Repeat },
      { href: "/journal", labelKey: "nav.journal", icon: NotebookPen },
    ],
  },
  {
    headerKey: "drawer.info",
    items: [
      { href: "/library", labelKey: "nav.library", icon: Bug },
      { href: "/about", labelKey: "nav.about", icon: Info },
      { href: "/feedback", labelKey: "nav.feedback", icon: MessageSquareHeart },
      { href: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

/* ── Farm profile from localStorage ────────────────────────────── */
function useFarmName() {
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("plantio-settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile?.farmName) queueMicrotask(() => setName(parsed.profile.farmName));
      }
    } catch {}
  }, []);
  return name;
}

/* ── Drawer component ──────────────────────────────────────────── */
export function HamburgerDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();
  const farmName = useFarmName();

  // Listen for "More" button in BottomNav
  useEffect(() => {
    return onDrawerOpen(() => setOpen(true));
  }, []);

  // Count total items for stagger index
  const totalItems = MENU_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <>
      {/* The floating hamburger trigger is now in TopBar (scroll-aware).
          This component only renders the drawer panel itself. */}

      {open && (
        <div className="fixed inset-0 z-[10000]">
          {/* Backdrop — translucent with blur */}
          <button
            aria-label="Close menu"
            onClick={() => { setOpen(false); closeDrawer(); }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <aside
            className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-cream/95 backdrop-blur-md border-l-[3px] border-ink overflow-y-auto scroll-plantio plantio-drawer-in"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            role="dialog"
            aria-label="Main menu"
          >
            {/* ── Header with close button ─────────────────────── */}
            <div className="flex items-center justify-between p-5 border-b-[3px] border-ink bg-forest">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/icon-192.png"
                  alt="Plantio"
                  className="w-10 h-10 rounded-xl border-[2.5px] border-ink"
                />
                <span className="font-display text-2xl font-bold uppercase text-white">
                  Plantio
                </span>
              </div>
              <button
                onClick={() => { setOpen(false); closeDrawer(); }}
                aria-label="Close menu"
                className="w-10 h-10 rounded-xl bg-white border-[2.5px] border-ink flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              >
                <X className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </button>
            </div>

            {/* ── User profile section ─────────────────────────── */}
            <div className="px-5 pt-4 pb-2 flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl border-[2.5px] border-ink bg-leaf shadow-[3px_3px_0px_0px_#161611]">
                <Sprout className="w-6 h-6 text-ink" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-ink truncate">
                  {farmName || t("settings.profile")}
                </p>
                <p className="text-xs text-ink/60 font-body">
                  {t("common.madeForGrowers")}
                </p>
              </div>
            </div>

            {/* ── Ask Plantio CTA ─────────────────────────────────── */}
            <div className="px-4 py-2">
              <button
                onClick={() => { setOpen(false); closeDrawer(); openAskPlantio(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-[3px] border-ink bg-forest text-white shadow-[4px_4px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all min-h-[52px]"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl border-[2px] border-white/30 bg-leaf">
                  <MessageCircle className="w-5 h-5 text-ink" strokeWidth={2.5} />
                </span>
                <span className="font-display text-sm font-bold uppercase tracking-wide">
                  {t("drawer.askPlantio") || "Ask Plantio"}
                </span>
              </button>
            </div>

            {/* ── Menu sections ────────────────────────────────── */}
            <nav className="px-4 pb-2">
              {MENU_SECTIONS.map((section, sIdx) => {
                // Calculate stagger offset per section
                const prevCount = MENU_SECTIONS.slice(0, sIdx).reduce(
                  (sum, s) => sum + s.items.length,
                  0
                );
                return (
                  <div key={section.headerKey} className="mb-3">
                    {/* Section header */}
                    <p className="font-display text-[11px] font-bold uppercase tracking-widest text-forest/60 mb-2 px-1">
                      {t(section.headerKey)}
                    </p>
                    <div className="space-y-2.5">
                      {section.items.map(({ href, labelKey, icon: Icon }, iIdx) => {
                        const active =
                          href === "/" ? pathname === "/" : pathname.startsWith(href);
                        const staggerI = prevCount + iIdx;
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => { setOpen(false); closeDrawer(); }}
                            className={cn(
                              "plantio-list-item flex items-center gap-3 px-4 py-3.5 rounded-2xl border-[3px] border-ink shadow-[4px_4px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all min-h-[52px]",
                              active ? "bg-leaf text-ink" : "bg-white text-ink"
                            )}
                            style={{ "--i": staggerI } as React.CSSProperties}
                          >
                            <span
                              className={cn(
                                "flex items-center justify-center w-9 h-9 rounded-xl border-[2px] border-ink",
                                active
                                  ? "bg-forest text-white"
                                  : "bg-cream text-forest"
                              )}
                            >
                              <Icon className="w-5 h-5" strokeWidth={2.5} />
                            </span>
                            <span className="font-display text-sm font-bold uppercase tracking-wide">
                              {t(labelKey)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* ── Language toggle ──────────────────────────────── */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <Languages className="w-4 h-4 text-ink" strokeWidth={2.5} />
                <span className="font-display text-xs font-bold uppercase text-ink/70">
                  Language / भाषा
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["en", "hi", "mr"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "font-display text-sm font-bold uppercase py-3 rounded-2xl border-[3px] border-ink shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all",
                      lang === l ? "bg-forest text-white" : "bg-white text-ink"
                    )}
                  >
                    {l === "en" ? "English" : l === "hi" ? "हिन्दी" : "मराठी"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Visual footer ────────────────────────────────── */}
            <div className="border-t-[3px] border-ink bg-forest plantio-dots p-5 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src="/icons/logo.png"
                  alt="Plantio"
                  className="h-8 object-contain"
                />
              </div>
              <p className="font-display text-[10px] font-bold uppercase tracking-widest text-white/60">
                v1.0.0 — Made for growers
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Heart className="w-3 h-3 text-warn" strokeWidth={2.5} />
                <Wheat className="w-3 h-3 text-leaf" strokeWidth={2.5} />
                <Sprout className="w-3 h-3 text-gold" strokeWidth={2.5} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
