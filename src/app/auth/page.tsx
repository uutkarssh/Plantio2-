import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/auth/supabase-server";
import { AuthForm } from "@/components/plantio/auth-form";

export const metadata: Metadata = {
  title: "Sign in — Plantio",
  description:
    "Sign in or create your Plantio account to access AI-powered crop insights, weather, irrigation planning and more.",
  // Hide from search engines — auth pages shouldn't be indexed.
  robots: { index: false, follow: false },
};

// Always render fresh — never cache the auth page (session can change).
export const dynamic = "force-dynamic";

/**
 * /auth — the Plantio authentication page.
 *
 * Server Component. Responsibilities:
 *   1. Read the current Supabase session from the cookie.
 *   2. If a valid session exists → redirect to `/` immediately so
 *      already-authenticated users never see the login form.
 *   3. Otherwise, render the AuthForm (client component).
 *
 * Note: middleware also handles this redirect for the happy path (cookie
 * refresh + redirect before the page even renders). This server component is
 * a second line of defence for any edge case the middleware misses.
 */
export default async function AuthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-cream">
      <AuthForm />
    </main>
  );
}
