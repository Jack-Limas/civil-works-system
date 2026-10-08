import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
      <Logo size={40} />
      <p className="font-mono-data text-5xl font-semibold text-accent">404</p>
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="max-w-sm text-sm text-ink-muted">{t("description")}</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-2">
          {t("backHome")}
        </Link>
        <Link href="/dashboard" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
          {t("backDashboard")}
        </Link>
      </div>
    </main>
  );
}
