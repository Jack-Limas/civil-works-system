import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";

/** Keys of the "errors" namespace. Backend messages are English and never shown raw. */
export type ErrorKey =
  | "network"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "fileTooLarge"
  | "unavailable"
  | "server"
  | "unknown";

const STATUS_TO_KEY: Record<number, ErrorKey> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  413: "fileTooLarge",
  502: "unavailable",
  503: "unavailable",
};

export function getHttpStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function apiErrorKey(error: unknown): ErrorKey {
  if (!isAxiosError(error)) return "unknown";
  const status = error.response?.status;
  if (!status) return "network";
  return STATUS_TO_KEY[status] ?? (status >= 500 ? "server" : "unknown");
}

/**
 * Returns a function that turns any thrown error into a translated message.
 * `overrides` lets a screen give a more specific text for a status code,
 * e.g. a "this email is already registered" text for 409.
 */
export function useApiErrorMessage() {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown, overrides?: Partial<Record<number, string>>) => {
      const status = getHttpStatus(error);
      if (status && overrides?.[status]) return overrides[status] as string;
      return t(apiErrorKey(error));
    },
    [t]
  );
}
