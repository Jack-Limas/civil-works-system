"use client";

import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck, HardHat } from "lucide-react";
import type { Role } from "@/types/auth";

export function RoleBadge({ role }: { role: Role }) {
  const t = useTranslations("common.roles");
  const Icon = role === "ADMIN" ? ShieldCheck : HardHat;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        role === "ADMIN" ? "bg-ai/15 text-ai" : "bg-accent/15 text-accent"
      }`}
    >
      <Icon size={12} aria-hidden /> {t(role)}
    </span>
  );
}

/** Active / inactive, plus a hint when the account still uses a temporary password. */
export function UserStatusBadge({ isActive, mustChangePassword }: { isActive: boolean; mustChangePassword?: boolean }) {
  const t = useTranslations("users.status");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
          isActive ? "bg-success/15 text-success" : "bg-surface-2 text-ink-muted"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-success" : "bg-ink-muted"}`} aria-hidden />
        {isActive ? t("active") : t("inactive")}
      </span>
      {isActive && mustChangePassword && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning" title={t("mustChange")}>
          <KeyRound size={11} aria-hidden /> {t("mustChange")}
        </span>
      )}
    </span>
  );
}
