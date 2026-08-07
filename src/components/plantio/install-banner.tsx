"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { StickerButton } from "./sticker";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const dismissedKey = "plantio-install-dismissed";
    if (localStorage.getItem(dismissedKey)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Only show on the home page so it never crowds the scanner or map controls
  if (pathname !== "/") return null;
  if (!deferred || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 76px)" }}>
      <div className="mx-auto max-w-2xl sticker-card p-4 bg-leaf border-ink flex items-center gap-3">
        <span className="shrink-0 w-12 h-12 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center">
          <Download className="w-6 h-6 text-white" strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold uppercase leading-tight">Install Plantio</p>
          <p className="text-xs text-ink/80">Add to your home screen for offline use.</p>
        </div>
        <div className="flex items-center gap-2">
          <StickerButton
            size="sm"
            variant="forest"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
          >
            Install
          </StickerButton>
          <button
            aria-label="Dismiss"
            onClick={() => {
              setDismissed(true);
              localStorage.setItem("plantio-install-dismissed", "1");
            }}
            className="w-9 h-9 rounded-xl bg-white border-[2.5px] border-ink flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ink" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
