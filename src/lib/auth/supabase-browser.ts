"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase Auth client (singleton).
 *
 * This is the auth-aware client used by the /auth page, the AuthForm component,
 * and the LogoutButton. It is intentionally SEPARATE from the legacy
 * `src/lib/supabase.ts` client (which uses default localStorage storage and is
 * kept untouched for backwards compatibility with any other code paths).
 *
 * Why a cookie-based storage adapter?
 * -----------------------------------
 * Supabase JS v2 defaults to `localStorage`, which is invisible to Next.js
 * server components and middleware. By writing the session into a cookie named
 * `plantio-auth-token` we let `middleware.ts` and server components read the
 * session server-side — that is what makes the already-authenticated redirect
 * work without flashing the login form.
 *
 * The cookie is NOT httpOnly — the browser Supabase client must be able to
 * read and update it on token refresh. It does not contain the service role
 * key; only the user's own access/refresh tokens (which are already exposed
 * to the browser via the anon-key-authenticated session).
 */

export const AUTH_COOKIE_NAME = "plantio-auth-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Custom cookie storage adapter — used by Supabase JS v2 `auth.storage`. */
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp("(^|;\\s*)(" + key + ")=([^;]*)")
    );
    return match ? decodeURIComponent(match[3]) : null;
  },
  setItem(key: string, value: string) {
    if (typeof document === "undefined") return;
    document.cookie =
      `${key}=${encodeURIComponent(value)}` +
      `; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  },
  removeItem(key: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
  },
};

let cachedClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Soft-fail: return a client pointing at empty strings. The AuthForm will
    // surface a friendly "Something went wrong" error rather than crash. This
    // matches the project's existing pattern in src/lib/supabase.ts.
    console.warn(
      "[auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — auth will not function until these are set."
    );
  }

  cachedClient = createClient(url ?? "", anonKey ?? "", {
    auth: {
      storage: cookieStorage,
      storageKey: AUTH_COOKIE_NAME,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

/** Convenience export — the singleton browser Supabase client. */
export const supabaseBrowser = getBrowserSupabase();

/**
 * Returns true if the env vars needed for client-side auth are present.
 * Used by the AuthForm to show a friendly "not configured" message instead
 * of crashing.
 */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
