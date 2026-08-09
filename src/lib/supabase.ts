import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * Uses the NEXT_PUBLIC_ prefixed env vars so Next.js exposes them to the client.
 * Safe to import in any client or server component.
 *
 * IMPORTANT: Never hardcode URLs or keys here — always read from env vars.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

/**
 * Server-only Supabase client (with service role key).
 *
 * This bypasses Row Level Security — use ONLY in API routes or server components.
 * NEVER import this in a client component (the key is not NEXT_PUBLIC_ prefixed
 * so Next.js will not expose it to the browser).
 *
 * If the service role key is missing, this falls back to the anon client
 * (which will still respect RLS). Check isSupabaseServerConfigured() first.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

/**
 * Helper to check if the browser client is configured (env vars present).
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Helper to check if the server-only client is configured (service role key present).
 */
export function isSupabaseServerConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
