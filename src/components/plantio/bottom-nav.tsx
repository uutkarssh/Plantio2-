"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, CloudSun, BookOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/plantio/i18n";
import { openDrawer } from "@/lib/plantio/drawer-state";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { href: "/weather", labelKey: "nav.weather", icon: CloudSun },
  { href: "/guides", labelKey: "nav.guides", icon: BookOpen },
  // "More" is special — opens drawer instead of navigating
  { href: "__more__", labelKey: "nav.more", icon: MoreHorizontal },
];

/** Read a badge count from localStorage (used by "More" button). */
function useMoreBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("plantio-drawer-badge");
      if (raw) queueMicrotask(() => setCount(Number(raw) || 0));
    } catch {}
    const onStorage = () => {
      try {
        const raw = localStorage.getItem("plantio-drawer-badge");
        setCount(raw ? Number(raw) || 0 : 0);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return count;
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const moreBadge = useMoreBadge();
  const [bouncedIdx, setBouncedIdx] = useState<number | null>(null);

  // Detect path changes to trigger bounce on the newly-active tab
  useEffect(() => {
    const idx = NAV_ITEMS.findIndex(({ href }) => {
      if (href === "__more__") return false;
      return href === "/" ? pathname === "/" : pathname.startsWith(href);
    });
    queueMicrotask(() => setBouncedIdx(idx));
    const timer = setTimeout(() => setBouncedIdx(null), 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t-[3px] border-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest to-[#163a28]" />
      {/* Dot texture overlay */}
      <div className="absolute inset-0 plantio-dots pointer-events-none" />

      <div className="relative mx-auto max-w-2xl grid grid-cols-5 w-full">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }, idx) => {
          const isMore = href === "__more__";
          const active = isMore
            ? false
            : href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          const content = (
            <>
              <span
                className={cn(
                  "relative mx-auto flex items-center justify-center w-10 h-10 rounded-2xl border-[2.5px] border-ink transition-colors",
                  active
                    ? "bg-leaf text-ink shadow-[2px_2px_0px_0px_#161611]"
                    : "bg-transparent text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    bouncedIdx === idx && "plantio-nav-bounce"
                  )}
                  strokeWidth={2.5}
                />
                {/* Badge for "More" button */}
                {isMore && moreBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-warn text-white font-display text-[9px] font-bold leading-none px-1 border-[2px] border-ink">
                    {moreBadge > 9 ? "9+" : moreBadge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "w-full text-center font-display text-[10px] font-bold uppercase tracking-wide leading-[1.05]",
                  active ? "text-leaf" : "text-white/85"
                )}
              >
                {t(labelKey)}
              </span>
              {/* Leaf dot indicator for active item */}
              {active && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-leaf" />
              )}
            </>
          );

          if (isMore) {
            return (
              <button
                key={href}
                onClick={openDrawer}
                className="w-full min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] active:scale-95 transition-transform"
                aria-label={t(labelKey)}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="w-full min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] active:scale-95 transition-transform"
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
