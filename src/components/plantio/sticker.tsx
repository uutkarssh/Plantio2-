"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/* StickerCard — thick black border, hard offset shadow, rounded */
export function StickerCard({
  className,
  children,
  as: Comp = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Comp className={cn("sticker-card p-5", className)} {...props}>
      {children}
    </Comp>
  );
}

/* StickerButton — pill, black border, hard shadow, press effect */
export const StickerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "leaf" | "forest" | "gold" | "cream" | "warn" | "outline";
    size?: "sm" | "md" | "lg";
  }
>(({ className, variant = "forest", size = "md", children, ...props }, ref) => {
  const variants: Record<string, string> = {
    leaf: "bg-leaf text-ink",
    forest: "bg-forest text-white",
    gold: "bg-gold text-ink",
    cream: "bg-cream text-ink",
    warn: "bg-warn text-white",
    outline: "bg-white text-ink",
  };
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 text-sm min-h-[40px]",
    md: "px-5 py-3 text-base min-h-[48px]",
    lg: "px-6 py-4 text-lg min-h-[56px]",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "sticker-pill inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wide cursor-pointer select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
StickerButton.displayName = "StickerButton";

/* StickerBadge — small pill badge */
export function StickerBadge({
  className,
  children,
  variant = "leaf",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "leaf" | "gold" | "warn" | "forest" | "cream";
}) {
  const variants: Record<string, string> = {
    leaf: "bg-leaf text-ink",
    gold: "bg-gold text-ink",
    warn: "bg-warn text-white",
    forest: "bg-forest text-white",
    cream: "bg-cream text-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-[2.5px] border-ink rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wide shadow-[3px_3px_0px_0px_#161611]",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/* SectionHeader — colored full-bleed band with title */
export function SectionHeader({
  title,
  subtitle,
  bg = "forest",
  text = "white",
  icon: Icon,
  iconTint = "bg-leaf",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  bg?: "forest" | "midgreen" | "gold" | "cream" | "leaf";
  text?: "white" | "ink";
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconTint?: string; // tailwind bg-* for the icon badge
  className?: string;
  children?: React.ReactNode;
}) {
  const bgs: Record<string, string> = {
    forest: "bg-forest",
    midgreen: "bg-midgreen",
    gold: "bg-gold",
    cream: "bg-cream",
    leaf: "bg-leaf",
  };
  const texts: Record<string, string> = { white: "text-white", ink: "text-ink" };
  // dot pattern tint: white dots on dark bgs, ink dots on light bgs
  const dotClass = text === "white" ? "plantio-dots" : "plantio-dots-ink";
  const textureClass = text === "white" ? "plantio-crosshatch" : "plantio-stripes";
  return (
    <section className={cn("w-full px-5 pt-16 pb-7 border-b-[3px] border-ink relative overflow-hidden", bgs[bg], texts[text], className)}>
      {/* Decorative dot pattern — subtle texture, like a field of seeds */}
      <div aria-hidden className={cn("absolute inset-0 pointer-events-none opacity-60", dotClass)} />
      {/* Decorative crosshatch/stripes — second texture layer for depth */}
      <div aria-hidden className={cn("absolute inset-0 pointer-events-none opacity-40", textureClass)} />
      {/* Decorative blob — adds depth without crowding the title */}
      <div
        aria-hidden
        className="absolute -right-12 -top-16 w-40 h-40 rounded-full bg-black/10 blur-2xl pointer-events-none"
      />
      <div className="relative mx-auto max-w-2xl">
        {Icon && (
          <div className={cn("sh-icon-badge plantio-title-slide", iconTint)} style={{ animationDelay: "0ms" }}>
            <Icon className="w-7 h-7 text-ink" strokeWidth={2.5} />
          </div>
        )}
        <h1 className="plantio-title-slide font-display text-3xl sm:text-4xl font-bold uppercase leading-[1.05]" style={{ animationDelay: Icon ? "60ms" : "0ms" }}>{title}</h1>
        {subtitle && <p className="plantio-title-slide mt-2 text-sm sm:text-base opacity-90 leading-relaxed" style={{ animationDelay: Icon ? "120ms" : "60ms" }}>{subtitle}</p>}
        {children && <div className="plantio-title-slide mt-4" style={{ animationDelay: Icon ? "180ms" : "120ms" }}>{children}</div>}
      </div>
    </section>
  );
}

/* Skeleton card for loading states (>1s) */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("sticker-card p-5 space-y-3", className)}>
      <div className="skeleton-plantio h-6 w-2/3" />
      <div className="skeleton-plantio h-4 w-full" />
      <div className="skeleton-plantio h-4 w-5/6" />
      <div className="skeleton-plantio h-10 w-1/2 mt-2" />
    </div>
  );
}

/* ErrorRetryCard — friendly error with retry */
export function ErrorRetryCard({
  message = "Couldn't reach the plant doctor — check your connection and try again.",
  onRetry,
  onSecondary,
  secondaryLabel = "Upload a Different Photo",
}: {
  message?: string;
  onRetry: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
}) {
  return (
    <StickerCard className="bg-warn text-white">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-full bg-white border-[3px] border-ink flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-warn" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold uppercase text-white">Something went wrong</h3>
          <p className="mt-1 text-sm text-white/95">{message}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <StickerButton variant="gold" size="md" className="w-full" onClick={onRetry}>
          Retry
        </StickerButton>
        {onSecondary && (
          <StickerButton variant="outline" size="md" className="w-full" onClick={onSecondary}>
            {secondaryLabel}
          </StickerButton>
        )}
      </div>
    </StickerCard>
  );
}
