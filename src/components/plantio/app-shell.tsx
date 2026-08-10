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
import { I18nProvider } from "@/lib/plantio/i18n";

function useIsAuthRoute() {
  const pathname = usePathname();
  return Boolean(pathname && pathname.startsWith("/auth"));
}

function SplashGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const KEY = "plantio-splash-seen";
    const seen = sessionStorage.getItem(KEY);
    if (seen) queueMicrotask(() => setReady(true));
    else {
      const t = setTimeout(() => {
        sessionStorage.setItem(KEY, "1");
        setReady(true);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, []);
  if (!ready) return <LoadingScreen />;
  return <>{children}</>;
}

function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("SW registration failed:", err));
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
}

function FirebaseAuthGate({ children }: { children: React.ReactNode }) {
  const isAuthRoute = useIsAuthRoute();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthRoute) {
      queueMicrotask(() => setChecking(false));
      return;
    }

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const isAuthRoute = useIsAuthRoute();
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
            <div className="min-h-screen flex flex-col bg-cream plantio-main">{children}</div>
            <BottomNav />
            <InstallBanner />
          </SplashGate>
        </FirebaseAuthGate>
      </I18nProvider>
    </ErrorBoundary>
  );
}
