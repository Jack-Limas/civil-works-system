import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { routing } from "@/i18n/routing";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

/** Endpoints that must never trigger a refresh attempt (they ARE the auth flow). */
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];
const PUBLIC_PATHS = ["", "login", "register"];
const CHANGE_PASSWORD_PAGE = "change-password";

function currentLocale() {
  const segment = window.location.pathname.split("/")[1];
  return routing.locales.find((l) => l === segment) ?? routing.defaultLocale;
}

/** Path without the locale prefix, e.g. "/es/login" -> "login". */
function currentPage() {
  return window.location.pathname.split("/").slice(2).join("/");
}

/**
 * Sends the user to the localized login only from private pages, and only
 * once: "?session=expired" lets the proxy show the login even if a stale
 * cookie is still around, which prevents a login <-> dashboard redirect loop.
 */
function redirectToLogin(reason: "expired" | "disabled" = "expired") {
  if (typeof window === "undefined") return;
  if (PUBLIC_PATHS.includes(currentPage())) return;
  window.location.replace(`/${currentLocale()}/login?session=${reason}`);
}

/** The API answers 403 PASSWORD_CHANGE_REQUIRED until a temporary password is replaced. */
function redirectToChangePassword() {
  if (typeof window === "undefined" || currentPage() === CHANGE_PASSWORD_PAGE) return;
  window.location.replace(`/${currentLocale()}/${CHANGE_PASSWORD_PAGE}`);
}

export function apiErrorCode(error: unknown): string | undefined {
  return isAxiosError<{ code?: string }>(error) ? error.response?.data?.code : undefined;
}

/** Whole hours until an AI quota resets (the API sends retryAfterSeconds); 0 = "a few minutes". */
export function quotaHours(error: unknown): number {
  const seconds = isAxiosError<{ retryAfterSeconds?: number | null }>(error) ? error.response?.data?.retryAfterSeconds : undefined;
  return seconds ? Math.floor(seconds / 3600) : 0;
}

let refreshPromise: Promise<void> | null = null;

/** One refresh at a time: concurrent 401s wait for the same request. */
function refreshSession() {
  refreshPromise ??= apiClient
    .post("/auth/refresh")
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = originalRequest?.url ?? "";
    const canRefresh = !NO_REFRESH.some((path) => url.includes(path));

    const code = apiErrorCode(error);
    if (error.response?.status === 403 && code === "PASSWORD_CHANGE_REQUIRED") {
      redirectToChangePassword();
      return Promise.reject(error);
    }
    // A deactivated account cannot be refreshed: go straight to the login with a notice
    if (error.response?.status === 401 && code === "ACCOUNT_DISABLED") {
      redirectToLogin("disabled");
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && canRefresh) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return apiClient(originalRequest);
      } catch (refreshError) {
        redirectToLogin(apiErrorCode(refreshError) === "ACCOUNT_DISABLED" ? "disabled" : "expired");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
