import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "./supabase-browser";

/**
 * Server-side Supabase Auth client (per-request).
 *
 * Creates a fresh, non-persisting Supabase client for use inside Server
 * Components, Server Actions, and Route Handlers. The session is hydrated
 * from the `plantio-auth-token` cookie set by the browser client — this lets
 * server code read the current user without re-implementing cookie parsing.
 *
 * IMPORTANT:
 * - This client uses the ANON key only — never the service role key.
 * - It does NOT persist sessions (no cookie writes from server code).
 * - For privileged server operations that must bypass RLS, use the existing
 *   `supabaseServer` from `src/lib/supabase-server.ts` (service-role client).
 *
 * Why non-persisting?
 *   The browser client owns cookie writes. If the server also wrote cookies,
 *   we'd race against the browser's auto-refresh. Server code only needs to
 *   READ the session.
 */

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: unknown;
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

export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on the server."
    );
  }

  const supabase = createClient(url ?? "", anonKey ?? "", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Hydrate the session from the cookie so subsequent supabase.auth.* calls
  // are authenticated as the current user.
  const cookieStore = await cookies();
  const stored = parseSessionCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (stored) {
    try {
      await supabase.auth.setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
      });
    } catch {
      /* session invalid — leave the client unauthenticated */
    }
  }

  return supabase;
}

/**
 * Convenience helper: returns the current server-side session, or null.
 * Use this in Server Components / Server Actions to gate access.
 */
export async function getServerSession() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Convenience helper: returns the current server-side user, or null.
 */
export async function getServerUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
