import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from "./supabase-browser";

/** Server-side Supabase Auth client, hydrated from browser auth cookies. */
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

  const cookieStore = await cookies();
  const access = cookieStore.get(AUTH_ACCESS_COOKIE_NAME)?.value;
  const refresh = cookieStore.get(AUTH_REFRESH_COOKIE_NAME)?.value;

  if (access && refresh) {
    try {
      await supabase.auth.setSession({
        access_token: decodeURIComponent(access),
        refresh_token: decodeURIComponent(refresh),
      });
    } catch {
      // Invalid session; caller will treat the user as signed out.
    }
  }

  return supabase;
}

export async function getServerSession() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getServerUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
