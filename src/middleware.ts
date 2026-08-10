import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/supabase-browser";

/**
 * Plantio auth middleware.
 *
 * Responsibilities (minimal & focused — does NOT touch any non-auth route):
 *
 * 1.  For requests to `/auth/*`:
 *     - If a valid Supabase session cookie exists → refresh it and redirect
 *       to `/` so already-authenticated users never see the login form.
 *     - If the cookie is missing or invalid → pass through to the auth page.
 *     - On refresh failure → clear the stale cookie and pass through.
 *
 * 2.  For all other routes: do nothing. The existing Plantio pages remain
 *     public/anonymous — this matches the requirement to NOT break any
 *     existing functionality (AI, Scan, Mandi, Weather, Irrigation, etc.).
 *
 * Why refresh here?
 *   `supabase.auth.refreshSession` rotates the access token server-side and
 *   writes the new session back to the cookie. This keeps long-lived sessions
 *   alive even if the user never visits a client component that triggers
 *   auto-refresh, and prevents the auth page from briefly flashing before
 *   the client-side redirect kicks in.
 *
 * No service-role key is used here — only the anon key, so RLS still applies.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

function parseSessionCookie(raw: string | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (parsed?.access_token && parsed?.refresh_token) {
      return parsed as StoredSession;
    }
  } catch {
    /* malformed cookie — ignore */
  }
  return null;
}

export async function middleware(req: NextRequest) {
  // Only act on /auth routes — leave every other route untouched.
  if (!req.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const stored = parseSessionCookie(req.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!stored) {
    // No session — show the auth page.
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Misconfigured — pass through; the AuthForm will surface a friendly error.
    return NextResponse.next();
  }

  // Stateless, per-request client — no persistence, no auto-refresh, no cookie
  // writes from this client (we manage the cookie explicitly below).
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Try to refresh the session using the stored refresh token.
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: stored.refresh_token,
  });

  // Refresh failed → session is invalid. Clear the stale cookie so the user
  // can log in fresh, then pass through to the auth page.
  if (error || !data.session) {
    const res = NextResponse.next();
    res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }

  // Session is valid — redirect to the homepage.
  const res = NextResponse.redirect(new URL("/", req.url));

  // Persist the refreshed session back into the cookie so the next request
  // uses the new tokens (avoids re-refreshing on every navigation).
  const refreshedSession: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: encodeURIComponent(JSON.stringify(refreshedSession)),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}

export const config = {
  // Only run on /auth routes — every other path is bypassed for zero impact
  // on existing Plantio pages (homepage, scan, mandi, weather, etc.).
  matcher: ["/auth/:path*"],
};
