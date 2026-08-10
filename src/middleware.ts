import { NextResponse, type NextRequest } from "next/server";

/**
 * Firebase Authentication is client-side in Plantio.
 * Route protection is handled by FirebaseAuthGate in AppShell, which waits
 * for Firebase's persisted session before rendering protected app content.
 * Keep Next middleware auth-free so it never tries to interpret Supabase
 * authentication cookies.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
