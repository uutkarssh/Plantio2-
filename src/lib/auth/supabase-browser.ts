import { createClient, type SupportedStorage } from "@supabase/supabase-js";

export const AUTH_ACCESS_COOKIE_NAME = "plantio-auth-access";
export const AUTH_REFRESH_COOKIE_NAME = "plantio-auth-refresh";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function removeCookie(name: string) {
  setCookie(name, "", 0);
}

const cookieStorage: SupportedStorage = {
  getItem(key) {
    if (key === "access_token") return getCookie(AUTH_ACCESS_COOKIE_NAME);
    if (key === "refresh_token") return getCookie(AUTH_REFRESH_COOKIE_NAME);
    return getCookie(key);
  },
  setItem(key, value) {
    if (key === "access_token") setCookie(AUTH_ACCESS_COOKIE_NAME, value);
    else if (key === "refresh_token") setCookie(AUTH_REFRESH_COOKIE_NAME, value);
    else setCookie(key, value);
  },
  removeItem(key) {
    if (key === "access_token") removeCookie(AUTH_ACCESS_COOKIE_NAME);
    else if (key === "refresh_token") removeCookie(AUTH_REFRESH_COOKIE_NAME);
    else removeCookie(key);
  },
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient(url ?? "", anonKey ?? "", {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
