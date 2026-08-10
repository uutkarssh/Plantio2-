"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";

/**
 * useCurrentUser — lightweight client-side hook for getting the logged-in user.
 *
 * Returns:
 *   - { user: null, loading: true }  while the session is being fetched
 *   - { user: User,  loading: false } when authenticated
 *   - { user: null, loading: false } when not authenticated
 *
 * Also subscribes to auth state changes — if the user signs in or out from
 * another tab or component, this hook will update.
 *
 * Use this in any client component that needs to conditionally render
 * authenticated UI (e.g. showing a "Sign in" button vs. a profile menu).
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Initial fetch
    (async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!cancelled) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    })();

    // Subscribe to future auth state changes
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
