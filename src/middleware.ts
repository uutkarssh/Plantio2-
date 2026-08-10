import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/supabase-browser";

/**
 * Plantio authentication middleware.
 *
 * Behaviour:
 * - /auth/* is public. Authenticated users are redirected to /.
 * - Normal application pages require a Plantio Supabase session.
 * - /api/* and static Next.js/public assets are left untouched so API routes
 *   can return their own errors and assets are never redirected to /auth.
 *
 * The session is stored by the browser auth client in AUTH_COOKIE_NAME.
 * We validate it with Supabase before allowing protected pages through.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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
    // Malformed cookie — treat the request as unauthenticated.
  }
  return null;
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[^/]+$/.test(pathname)
  );
}

async function validateSession(stored: StoredSession) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  });

  if (error || !data.session) return null;
  return data.session;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public routes and static assets must never be redirected to /auth.
  if (isPublicPath(pathname)) {
    // /auth is special: if already signed in, skip the login form.
    if (pathname.startsWith("/auth")) {
      const stored = parseSessionCookie(req.cookies.get(AUTH_COOKIE_NAME)?.value);
      if (!stored) return NextResponse.next();

      const session = await validateSession(stored);
      if (!session) {
        const res = NextResponse.next();
        res.cookies.delete(AUTH_COOKIE_NAME);
        return res;
      }

      const res = NextResponse.redirect(new URL("/", req.url));
      res.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: encodeURIComponent(
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          })
        ),
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }

    return NextResponse.next();
  }

  // Every normal Plantio page is protected.
  const stored = parseSessionCookie(req.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!stored) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await validateSession(stored);
  if (!session) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }

  // Keep the refreshed session in the same cookie used by the browser client.
  const res = NextResponse.next();
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: encodeURIComponent(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      })
    ),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}

export const config = {
  // Run on application routes while excluding Next internals and common
  // static files. API routes are handled separately by their own handlers.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
