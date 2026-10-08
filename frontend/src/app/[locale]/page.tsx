import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BellRing, ClipboardCheck, Cpu, HardHat, LineChart, Receipt, Smartphone, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { formatCOP } from "@/lib/format";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: { absolute: t("title") }, description: t("description") };
}

const FEATURES = [
  { key: "tracking", icon: HardHat },
  { key: "costs", icon: Receipt },
  { key: "risk", icon: BellRing },
  { key: "background", icon: Cpu },
] as const;

const STEPS = [
  { key: "step1", icon: ClipboardCheck },
  { key: "step2", icon: Smartphone },
  { key: "step3", icon: LineChart },
] as const;

/**
 * Public landing page: a Server Component with no user data, prerendered once
 * per locale (SSG via generateStaticParams in the locale layout). Only the
 * language and theme switchers hydrate as client islands.
 */
export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={30} />
            <span className="font-semibold">{tCommon("appShortName")}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <a href="#features" className="hover:text-ink">
              {t("nav.features")}
            </a>
            <a href="#how" className="hover:text-ink">
              {t("nav.how")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link
              href="/login"
              className="hidden min-h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90 sm:inline-flex"
            >
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("hero.title")}</h1>
            <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{t("hero.subtitle")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("hero.primary")} <ArrowRight size={16} aria-hidden />
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-surface px-6 text-sm font-medium hover:bg-surface-2"
              >
                {t("hero.secondary")}
              </a>
            </div>
            <p className="mt-4 text-xs text-ink-muted">{t("hero.note")}</p>
          </div>

          {/* Product preview drawn with HTML/CSS: no screenshot to keep in sync, crisp in both themes */}
          <figure aria-label={t("preview.label")} className="rounded-2xl border border-line bg-surface p-5 shadow-xl">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["budget", 8_610_000_000, "text-ink"],
                  ["spent", 4_534_000_000, "text-accent"],
                  ["available", 4_076_000_000, "text-success"],
                ] as const
              ).map(([key, value, tone]) => (
                <div key={key} className="min-w-0 rounded-xl border border-line bg-surface-2 p-2.5 sm:p-3">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">{t(`preview.${key}`)}</p>
                  <p className={`whitespace-nowrap font-mono-data text-xs font-semibold sm:text-base ${tone}`}>
                    {formatCOP(value, locale, { compact: true })}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-critical/30 bg-critical/10 p-3">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-critical">{t("preview.alert")}</p>
                <p className="text-xs text-ink-muted">{t("preview.alertDetail")}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3" aria-hidden>
              {[
                [38, 72],
                [61, 57],
                [46, 47],
              ].map(([physical, financial], i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-success" style={{ width: `${physical}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${financial - physical > 15 ? "bg-critical" : "bg-accent"}`}
                      style={{ width: `${financial}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <figcaption className="mt-3 flex gap-4 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden /> {t("preview.physical")}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> {t("preview.financial")}
              </span>
            </figcaption>
          </figure>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">{t("features.title")}</h2>
            <p className="mt-2 max-w-2xl text-ink-muted">{t("features.subtitle")}</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.map(({ key, icon: Icon }) => (
                <article key={key} className="rounded-xl border border-line bg-bg p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <h3 className="font-semibold">{t(`features.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{t(`features.${key}.description`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t("how.title")}</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map(({ key, icon: Icon }, i) => (
              <li key={key} className="rounded-xl border border-line bg-surface p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-mono-data text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <Icon size={18} className="text-ink-muted" aria-hidden />
                </div>
                <h3 className="font-semibold">{t(`how.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-ink-muted">{t(`how.${key}.description`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          {/* Dark band on purpose: --sidebar is dark in both themes */}
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-sidebar p-8 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t("cta.title")}</h2>
              <p className="mt-1 text-sm text-sidebar-ink">{t("cta.subtitle")}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90"
            >
              {t("cta.button")} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:justify-between sm:px-6">
          {/* Build year: the page is static, so it is fixed when the site is built */}
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("footer.made")}</p>
        </div>
      </footer>
    </div>
  );
}
