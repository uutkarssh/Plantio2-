import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AUTH_ACCESS_COOKIE_NAME = "plantio-auth-access";
const AUTH_REFRESH_COOKIE_NAME = "plantio-auth-refresh";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function setSessionCookies(
  res: NextResponse,
  session: { access_token: string; refresh_token: string }
) {
  const options = {
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set({
    name: AUTH_ACCESS_COOKIE_NAME,
    value: session.access_token,
    ...options,
  });
  res.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: session.refresh_token,
    ...options,
  });
  return res;
}

/**
 * Handles Supabase email-confirmation and recovery links.
 *
 * Supabase redirects here with a PKCE `code`. We exchange that code for a
 * session on the server, store the same two auth cookies used by middleware,
 * and send the user to the requested safe relative path (normally `/`).
 */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));

  if (!url || !anonKey || !code) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/auth?error=confirmation", req.url));
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  return setSessionCookies(res, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
