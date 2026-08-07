"use client";
import React from "react";
import { StickerButton } from "./sticker";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error) {
    console.error("Plantio error boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-5 bg-cream">
          <div className="sticker-card p-6 max-w-md w-full text-center bg-white">
            <div className="mx-auto w-16 h-16 rounded-full bg-warn border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold uppercase">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink/70">
              Plantio hit an unexpected snag. Reload to get back to your plants.
            </p>
            <div className="mt-5">
              <StickerButton variant="forest" size="md" className="w-full" onClick={() => window.location.reload()}>
                Reload Plantio
              </StickerButton>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
