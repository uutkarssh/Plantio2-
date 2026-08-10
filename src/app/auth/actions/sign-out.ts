"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/auth/supabase-server";

/**
 * Server Action: sign out the current user.
 *
 * Uses the server-side Supabase client to invalidate the session server-side,
 * then redirects to /auth. This works even if JavaScript is disabled on the
 * client (e.g. when called from a <form action={signOutAction}>).
 *
 * The browser-side cookie is cleared by the supabase client on signOut(), OR
 * by middleware on the next request to /auth.
 */
export async function signOutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}
