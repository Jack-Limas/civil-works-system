/**
 * Bearer fallback for the session.
 *
 * The API sets httpOnly cookies, but in production the frontend (Vercel) and
 * the API (Render) are different sites and some browsers block those
 * third-party cookies. The access token the API also returns in the body is
 * kept here and sent as `Authorization: Bearer` by the api-client.
 *
 * - Memory first, sessionStorage so a reload keeps the session in this tab
 *   (cleared when the tab closes; short-lived token, 15 min).
 * - A non-sensitive marker cookie on the frontend's own domain tells
 *   src/proxy.ts that a session exists: the API cookies belong to the API's
 *   domain and the proxy can never see them in production.
 */
const STORAGE_KEY = "obraiq.accessToken";
export const SESSION_MARKER_COOKIE = "obraiq_session";

let current: string | null = null;

function readStorage(): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(STORAGE_KEY, token);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode): the in-memory copy still works for this page
  }
}

function writeMarker(present: boolean) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = present
    ? `${SESSION_MARKER_COOKIE}=1; Path=/; SameSite=Lax${secure}`
    : `${SESSION_MARKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getAccessToken(): string | null {
  current ??= readStorage();
  return current;
}

/** Called after login, refresh and password change; null on logout or an expired session. */
export function setAccessToken(token: string | null | undefined) {
  current = token ?? null;
  if (typeof window === "undefined") return;
  writeStorage(current);
  writeMarker(!!current);
}
