import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the SERVICE ROLE key.
 *
 * WARNING: NEVER import this in a client component — the service role key
 *     bypasses Row Level Security and must only be used on the server
 *     (API routes, Server Actions, server components).
 *
 * Uses a SUPABASE_SERVICE_ROLE_KEY env var that is NOT prefixed with
 * NEXT_PUBLIC_, so Next.js will NOT expose it to the browser bundle.
 *
 * IMPORTANT: Never hardcode URLs or keys here — always read from env vars.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

/**
 * Helper to check if the server client is configured (env vars present).
 */
export function isSupabaseServerConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
