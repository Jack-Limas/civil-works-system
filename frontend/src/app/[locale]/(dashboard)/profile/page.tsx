"use client";

import { useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { CalendarClock, KeyRound, Languages, Mail, Moon, Phone, ShieldCheck, Sun, UserRound } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { RoleBadge } from "@/components/users/user-badges";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { nameInitial } from "@/lib/initials";
import { useAuthStore } from "@/store/auth.store";

const subscribe = () => () => {};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T | undefined;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 ${
            value === option.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <div className="break-words text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

/** My profile (CSR, both roles): account details, password and preferences. */
export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { resolvedTheme, setTheme } = useTheme();
  // Theme is only known on the client: avoids a hydration mismatch without setState in an effect
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <main className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <div className="h-32 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      </main>
    );
  }

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        <Reveal className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RevealItem className="space-y-5">
            <section className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-xl font-semibold text-accent" aria-hidden>
                  {nameInitial(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-ink">{user.name}</p>
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <div className="mt-3 divide-y divide-line">
                <Row icon={Mail} label={t("email")}>
                  {user.email}
                </Row>
                <Row icon={Phone} label={t("phone")}>
                  {user.phone ?? <span className="text-ink-muted">{t("noPhone")}</span>}
                </Row>
                <Row icon={CalendarClock} label={t("lastLogin")}>
                  {user.lastLoginAt
                    ? format.dateTime(new Date(user.lastLoginAt), { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })
                    : t("never")}
                </Row>
              </div>
              {user.role !== "ADMIN" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                  <UserRound size={13} aria-hidden /> {t("managedByAdmin")}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-base font-semibold text-ink">{t("preferences")}</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Languages size={15} aria-hidden /> {t("language")}
                  </p>
                  <Segmented
                    label={t("language")}
                    value={locale}
                    disabled={isPending}
                    options={routing.locales.map((l) => ({ value: l, label: tCommon(`languages.${l}`) }))}
                    onChange={(next) => startTransition(() => router.replace(pathname, { locale: next }))}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-ink">{t("theme")}</p>
                  <Segmented
                    label={t("theme")}
                    value={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : undefined}
                    options={[
                      { value: "light", label: t("themeLight"), icon: <Sun size={15} aria-hidden /> },
                      { value: "dark", label: t("themeDark"), icon: <Moon size={15} aria-hidden /> },
                    ]}
                    onChange={setTheme}
                  />
                </div>
              </div>
            </section>
          </RevealItem>

          <RevealItem>
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <KeyRound size={17} className="text-accent" aria-hidden /> {t("security")}
              </h2>
              <p className="mb-4 mt-1 flex items-start gap-1.5 text-xs text-ink-muted">
                <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden /> {t("securityHint")}
              </p>
              <ChangePasswordForm />
            </section>
          </RevealItem>
        </Reveal>
      </main>
    </>
  );
}
