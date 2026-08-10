import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Email-confirmation / password-reset callback.
 *
 * Supabase auth email links (signup confirmation, password-reset) point here
 * with a `code` query param. We exchange the code for a session server-side,
 * write the session into the same `plantio-auth-token` cookie used elsewhere,
 * then redirect to the homepage so the user lands already-logged-in.
 *
 * If anything goes wrong, we redirect to /auth so the user can sign in
 * manually — never expose raw Supabase errors.
 */

const AUTH_COOKIE_NAME = "plantio-auth-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/";

  const fallback = NextResponse.redirect(new URL("/auth", req.url));

  if (!url || !anonKey || !code) {
    return fallback;
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return fallback;
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: encodeURIComponent(JSON.stringify(session)),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
