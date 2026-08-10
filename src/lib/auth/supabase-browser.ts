"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase Auth client.
 *
 * The previous implementation stored the complete Supabase session JSON in a
 * single cookie. Supabase access + refresh tokens can exceed the practical
 * per-cookie browser limit, so the browser could report a successful login
 * while the cookie was silently truncated/not stored. The app then redirected
 * to `/`, middleware could not validate the session, and the user appeared
 * stuck on the "Welcome back! Redirecting..." state.
 *
 * Store access and refresh tokens in separate cookies instead. The storage
 * adapter still exposes the normal Supabase session JSON to supabase-js.
 */

export const AUTH_COOKIE_NAME = "plantio-auth-token"; // logical storage key
export const AUTH_ACCESS_COOKIE_NAME = "plantio-auth-access";
export const AUTH_REFRESH_COOKIE_NAME = "plantio-auth-refresh";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)(" + name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + ")=([^;]*)")
  );
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, maxAge = SESSION_MAX_AGE_SECONDS) {
  if (typeof document === "undefined") return;
  document.cookie =
    `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** Supabase JS v2 storage adapter backed by two small cookies. */
const cookieStorage = {
  getItem(_key: string): string | null {
    const access = readCookie(AUTH_ACCESS_COOKIE_NAME);
    const refresh = readCookie(AUTH_REFRESH_COOKIE_NAME);
    if (!access || !refresh) return null;

    return JSON.stringify({
      access_token: access,
      refresh_token: refresh,
    });
  },
  setItem(_key: string, value: string) {
    try {
      const parsed = JSON.parse(value);
      if (!parsed?.access_token || !parsed?.refresh_token) return;
      setCookie(AUTH_ACCESS_COOKIE_NAME, parsed.access_token);
      setCookie(AUTH_REFRESH_COOKIE_NAME, parsed.refresh_token);
    } catch {
      // Ignore malformed storage writes.
    }
  },
  removeItem(_key: string) {
    deleteCookie(AUTH_ACCESS_COOKIE_NAME);
    deleteCookie(AUTH_REFRESH_COOKIE_NAME);
  },
};

let cachedClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
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

export const supabaseBrowser = getBrowserSupabase();

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
