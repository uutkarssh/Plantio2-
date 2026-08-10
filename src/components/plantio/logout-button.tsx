"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * Reusable Plantio logout button.
 *
 * Calls `supabase.auth.signOut()` and redirects to `/auth` on success.
 * Renders in the same sticker-pill visual language as the rest of the app.
 *
 * Usage:
 *   <LogoutButton variant="outline" size="md" />
 *   <LogoutButton className="custom-classes" label="Sign out" />
 */

type Variant = "forest" | "outline" | "warn" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  forest: "bg-forest text-white",
  outline: "bg-white text-ink",
  warn: "bg-warn text-white",
  ghost: "bg-transparent text-ink border-transparent shadow-none",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm min-h-[40px]",
  md: "px-5 py-3 text-base min-h-[48px]",
  lg: "px-6 py-4 text-lg min-h-[56px]",
};

export function LogoutButton({
  className,
  variant = "outline",
  size = "md",
  label = "Sign out",
  redirectTo = "/auth",
  onLoggedOut,
}: {
  className?: string;
  variant?: Variant;
  size?: Size;
  label?: string;
  /** Where to send the user after sign-out. Defaults to /auth. */
  redirectTo?: string;
  /** Optional callback after a successful sign-out (runs before redirect). */
  onLoggedOut?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (loading) return; // Prevent double-clicks
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) {
        setError("Couldn't sign out. Please try again.");
        setLoading(false);
        return;
      }
      onLoggedOut?.();
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        "sticker-pill inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wide cursor-pointer select-none",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
      ) : (
        <LogOut className="w-5 h-5" strokeWidth={2.5} />
      )}
      {loading ? "Signing out..." : label}
      {error && <span className="sr-only">{error}</span>}
    </button>
  );
}
