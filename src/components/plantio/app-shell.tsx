"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/config";
import { ErrorBoundary } from "./error-boundary";
import { BottomNav } from "./bottom-nav";
import { HamburgerDrawer } from "./drawer";
import { AskPlantioModal } from "./ask-plantio-modal";
import { TopBar } from "./top-bar";
import { InstallBanner } from "./install-banner";
import { LoadingScreen } from "./loading-screen";
import { LogoutButton } from "./logout-button";
import { I18nProvider } from "@/lib/plantio/i18n";

function useIsAuthRoute() {
  const pathname = usePathname();
  return Boolean(pathname && pathname.startsWith("/auth"));
}

function SplashGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const KEY = "plantio-splash-seen";
    try {
      if (sessionStorage.getItem(KEY)) {
        setReady(true);
        return;
      }
      // Keep the first-load branding cue short; the old 1.6s gate made the
      // homepage feel frozen before any useful content could be interacted with.
      const t = window.setTimeout(() => {
        sessionStorage.setItem(KEY, "1");
        setReady(true);
      }, 350);
      return () => window.clearTimeout(t);
    } catch {
      setReady(true);
    }
  }, []);

  if (!ready) return <LoadingScreen />;
  return <>{children}</>;
}

function useServiceWorker() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
}

function FirebaseAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = Boolean(pathname && pathname.startsWith("/auth"));
  const [checking, setChecking] = useState(!isAuthRoute);

  useEffect(() => {
    if (isAuthRoute) {
      setChecking(false);
      return;
    }

    setChecking(true);
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        window.location.replace("/auth");
        return;
      }
      setChecking(false);
    });

    return unsubscribe;
  }, [isAuthRoute]);

  if (checking) return <LoadingScreen />;
  return <>{children}</>;
}

function SettingsAccountAction() {
  const pathname = usePathname();
  if (pathname !== "/settings") return null;

  return (
    <div className="order-2 mx-auto w-full max-w-2xl px-5 pb-6">
      <div className="rounded-2xl border-[3px] border-ink bg-white p-4 shadow-[4px_4px_0px_0px_#161611] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase text-ink">Account</p>
          <p className="text-xs text-ink/60 mt-0.5">Sign out of this Plantio account</p>
        </div>
        <LogoutButton variant="warn" size="sm" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const isAuthRoute = useIsAuthRoute();
  const pathname = usePathname();
  const isSettingsRoute = pathname === "/settings";
  useServiceWorker();

  if (isAuthRoute) {
    return (
      <ErrorBoundary>
        <I18nProvider>
          <FirebaseAuthGate>
            <div className="min-h-screen bg-cream">{children}</div>
          </FirebaseAuthGate>
        </I18nProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <FirebaseAuthGate>
          <TopBar />
          <HamburgerDrawer />
          <AskPlantioModal />
          <SplashGate>
            <div
              className={`min-h-screen flex flex-col bg-cream plantio-main ${
                isSettingsRoute
                  ? "[&>main]:contents [&>main>section]:order-1 [&>main>footer]:order-3"
                  : ""
              }`}
            >
              {children}
              <SettingsAccountAction />
            </div>
            <BottomNav />
            <InstallBanner />
          </SplashGate>
        </FirebaseAuthGate>
      </I18nProvider>
    </ErrorBoundary>
  );
}
