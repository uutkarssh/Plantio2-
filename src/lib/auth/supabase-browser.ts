"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase Auth client.
 *
 * Supabase sessions contain both access and refresh tokens. Keeping the whole
 * session JSON in one cookie can exceed the browser's per-cookie size limit.
 * Store the two tokens separately and reconstruct the normal session JSON for
 * supabase-js through its storage adapter.
 */

export const AUTH_COOKIE_NAME = "plantio-auth-token"; // logical Supabase storage key
export const AUTH_ACCESS_COOKIE_NAME = "plantio-auth-access";
export const AUTH_REFRESH_COOKIE_NAME = "plantio-auth-refresh";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const item = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function setCookie(name: string, value: string, maxAge = SESSION_MAX_AGE_SECONDS) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

const cookieStorage = {
  getItem(_key: string): string | null {
    const access = readCookie(AUTH_ACCESS_COOKIE_NAME);
    const refresh = readCookie(AUTH_REFRESH_COOKIE_NAME);
    if (!access || !refresh) return null;
    return JSON.stringify({ access_token: access, refresh_token: refresh });
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
