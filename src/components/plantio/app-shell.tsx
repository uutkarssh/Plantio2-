"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "./error-boundary";
import { BottomNav } from "./bottom-nav";
import { HamburgerDrawer } from "./drawer";
import { AskPlantioModal } from "./ask-plantio-modal";
import { TopBar } from "./top-bar";
import { InstallBanner } from "./install-banner";
import { LoadingScreen } from "./loading-screen";
import { I18nProvider } from "@/lib/plantio/i18n";

/* Loading splash shown on first cold boot of the app (uses uploaded splash image) */
function SplashGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const KEY = "plantio-splash-seen";
    const seen = sessionStorage.getItem(KEY);
    if (seen) {
      // Defer to a microtask so we don't call setState synchronously in the
      // effect body (react-hooks/set-state-in-effect). Reads from a browser
      // API are an explicitly supported external-system sync pattern.
      queueMicrotask(() => setReady(true));
      return;
    }
    const t = setTimeout(() => {
      sessionStorage.setItem(KEY, "1");
      setReady(true);
    }, 1600);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return <LoadingScreen />;
  return <>{children}</>;
}

/* Register the hand-rolled service worker */
function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only register the service worker in production to avoid caching stale
    // bundles during development (which breaks HMR-driven testing).
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useServiceWorker();

  return (
    <ErrorBoundary>
      <I18nProvider>
        <TopBar />
        <HamburgerDrawer />
        <AskPlantioModal />
        <SplashGate>
          {/* Each page's <main> carries the .plantio-main class (defined in
              globals.css) which applies bottom padding equal to the fixed
              bottom nav height + safe area. That keeps the last form control
              visible above the nav on short pages, and lets long pages
              scroll naturally without a redundant trailing spacer. */}
          <div className="min-h-screen flex flex-col bg-cream plantio-main">
            {children}
          </div>
          <BottomNav />
          <InstallBanner />
        </SplashGate>
      </I18nProvider>
    </ErrorBoundary>
  );
}
