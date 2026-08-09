import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lightweight health-check: pings Supabase by calling a simple REST endpoint
 * (listing tables with limit=0) using the anon key. Returns { ok: true/false }.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({
      ok: false,
      error: "Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    });
  }

  try {
    // Ping Supabase REST API — fetch from a lightweight endpoint
    const res = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    // Supabase returns 200 for valid connections
    if (res.ok || res.status === 200) {
      return NextResponse.json({ ok: true });
    }

    // Some Supabase setups return 401/403 for empty GET on /rest/v1/ — still means connection works
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({
      ok: false,
      error: `Supabase returned status ${res.status}`,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || "Connection failed",
    });
  }
}
