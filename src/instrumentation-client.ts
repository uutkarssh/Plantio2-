import { firebaseAuth } from "@/lib/firebase/config";

/**
 * The scan page is an older client component whose request is intentionally
 * kept stable. Add the Firebase ID token at the browser fetch boundary so the
 * authenticated scan API can attribute the scan to the current user without
 * duplicating the Firebase setup or changing the scan UI.
 */
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (method === "POST" && url.includes("/api/scan")) {
    const user = firebaseAuth.currentUser;

    if (user) {
      try {
        const token = await user.getIdToken(true);
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
        headers.set("Authorization", `Bearer ${token}`);

        return originalFetch(input, {
          ...init,
          headers,
        });
      } catch (error) {
        console.error("[Plantio] Could not obtain Firebase scan token:", error);
      }
    }
  }

  return originalFetch(input, init);
};
