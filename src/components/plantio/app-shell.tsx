"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorBoundary } from "./error-boundary";
import { BottomNav } from "./bottom-nav";
import { HamburgerDrawer } from "./drawer";
import { AskPlantioModal } from "./ask-plantio-modal";
import { TopBar } from "./top-bar";
import { InstallBanner } from "./install-banner";
import { LoadingScreen } from "./loading-screen";
import { I18nProvider } from "@/lib/plantio/i18n";

/* Auth routes (login / signup / forgot password) render WITHOUT the app
 * chrome (TopBar, BottomNav, HamburgerDrawer, AskPlantioModal, InstallBanner).
 * They have their own full-screen layout and don't make sense for users who
 * aren't signed in yet. ErrorBoundary + I18n + SplashGate are kept so the
 * auth page still gets the branded loading splash and i18n support. */
function useIsAuthRoute() {
  const pathname = usePathname();
  return Boolean(pathname && pathname.startsWith("/auth"));
}

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
  const isAuthRoute = useIsAuthRoute();
  useServiceWorker();

  // Auth routes (login / signup / forgot password) render without app chrome.
  // They have their own full-screen layout. ErrorBoundary + I18n + SplashGate
  // are preserved so auth still gets the branded loading splash and i18n.
  if (isAuthRoute) {
    return (
      <ErrorBoundary>
        <I18nProvider>
          <SplashGate>
            <div className="min-h-screen bg-cream">{children}</div>
          </SplashGate>
        </I18nProvider>
      </ErrorBoundary>
    );
  }

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
