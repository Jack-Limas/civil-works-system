import axios, { AxiosRequestConfig } from "axios";
import { routing } from "@/i18n/routing";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

/** Endpoints that must never trigger a refresh attempt (they ARE the auth flow). */
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];
const PUBLIC_PATHS = ["", "login", "register"];

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
function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (PUBLIC_PATHS.includes(currentPage())) return;
  window.location.replace(`/${currentLocale()}/login?session=expired`);
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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && canRefresh) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return apiClient(originalRequest);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
