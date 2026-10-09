"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Logo } from "@/components/ui/logo";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";

/**
 * Change password (CSR, private). Users with a temporary password land here
 * from the login or from any API call (403 PASSWORD_CHANGE_REQUIRED) and cannot
 * use the rest of the app until they choose their own password.
 */
export default function ChangePasswordPage() {
  const t = useTranslations("changePassword");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);

  // No session (e.g. opened directly after it expired): go sign in
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleLogout() {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }

  const forced = !!user?.mustChangePassword;

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-ink">{tCommon("appShortName")}</span>
        </div>
        <div className="flex gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-6 sm:items-center sm:pt-0">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent" aria-hidden>
            <KeyRound size={24} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
          {forced && (
            <p role="status" className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
              {t("forcedNotice")}
            </p>
          )}

          <div className="mt-6">
            {isLoading || !user ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
                ))}
              </div>
            ) : (
              <ChangePasswordForm forced={forced} onDone={() => router.replace("/dashboard")} />
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-muted hover:text-critical focus-visible:outline-2 focus-visible:outline-accent"
          >
            <LogOut size={15} aria-hidden /> {t("logout")}
          </button>
        </motion.section>
      </div>
    </main>
  );
}
