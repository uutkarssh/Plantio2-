import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from "@/lib/auth/supabase-browser";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getTokens(req: NextRequest) {
  const access = req.cookies.get(AUTH_ACCESS_COOKIE_NAME)?.value;
  const refresh = req.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value;
  if (!access || !refresh) return null;
  return {
    access_token: decodeURIComponent(access),
    refresh_token: decodeURIComponent(refresh),
  };
}

function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(AUTH_ACCESS_COOKIE_NAME);
  res.cookies.delete(AUTH_REFRESH_COOKIE_NAME);
  return res;
}

function setAuthCookies(res: NextResponse, session: {
  access_token: string;
  refresh_token: string;
}) {
  const options = {
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set({ name: AUTH_ACCESS_COOKIE_NAME, value: session.access_token, ...options });
  res.cookies.set({ name: AUTH_REFRESH_COOKIE_NAME, value: session.refresh_token, ...options });
  return res;
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

async function validateSession(tokens: { access_token: string; refresh_token: string }) {
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

  const { data, error } = await supabase.auth.setSession(tokens);
  if (error || !data.session) return null;
  return data.session;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    if (!pathname.startsWith("/auth")) return NextResponse.next();

    const tokens = getTokens(req);
    if (!tokens) return NextResponse.next();

    const session = await validateSession(tokens);
    if (!session) return clearAuthCookies(NextResponse.next());

    const res = NextResponse.redirect(new URL("/", req.url));
    return setAuthCookies(res, session);
  }

  const tokens = getTokens(req);
  if (!tokens) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await validateSession(tokens);
  if (!session) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("next", pathname);
    return clearAuthCookies(NextResponse.redirect(loginUrl));
  }

  return setAuthCookies(NextResponse.next(), session);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
