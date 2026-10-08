"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, ClipboardList, Coins, Gauge, NotebookPen, Package, TriangleAlert, type LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import { useFieldReports } from "@/lib/reports-service";
import { useAuthStore } from "@/store/auth.store";
import type { ReportType } from "@/types/reports";

type CardKey = ReportType | "daily";

const CARDS: Array<{ key: CardKey; icon: LucideIcon; tone: string; adminOnly?: boolean }> = [
  { key: "progress", icon: Gauge, tone: "bg-accent/15 text-accent" },
  { key: "financial", icon: Coins, tone: "bg-success/15 text-success", adminOnly: true },
  { key: "materials", icon: Package, tone: "bg-warning/15 text-warning" },
  { key: "incidents", icon: TriangleAlert, tone: "bg-critical/15 text-critical" },
  { key: "daily", icon: NotebookPen, tone: "bg-ai/15 text-ai" },
];

function PendingLogs() {
  const t = useTranslations("reports");
  const format = useFormatter();
  const { data, isLoading } = useFieldReports({ status: "SUBMITTED", limit: 5 });
  const logs = data?.data ?? [];

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <ClipboardList size={17} className="text-ai" aria-hidden /> {t("pendingLogs")}
        </h2>
        {!!data?.pendingReview && (
          <span className="rounded-full bg-ai/15 px-2.5 py-0.5 font-mono-data text-xs font-semibold text-ai">{data.pendingReview}</span>
        )}
      </header>
      {isLoading ? (
        <div className="space-y-2 p-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">{t("pendingLogsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {logs.map((log) => (
            <li key={log.id}>
              <Link
                href={{ pathname: "/reports/daily", query: { report: log.id } }}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{log.project.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {log.author.name} · {format.dateTime(new Date(`${log.date}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" })}
                  </p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line px-5 py-3">
        <Link href="/reports/daily" className="text-sm font-medium text-accent hover:underline">
          {t("seeAllLogs")}
        </Link>
      </div>
    </section>
  );
}

/** Reports hub (CSR): one card per report; admins also see logs waiting for review. */
export default function ReportsPage() {
  const t = useTranslations("reports");
  const tLogs = useTranslations("fieldReports");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const cards = CARDS.filter((c) => !c.adminOnly || isAdmin);

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={isAdmin ? t("subtitle") : t("residentSubtitle")} />
      <main className="p-4 sm:p-6">
        <Reveal className={`grid grid-cols-1 gap-5 ${isAdmin ? "xl:grid-cols-[1fr_360px]" : ""}`}>
          <RevealItem>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cards.map(({ key, icon: Icon, tone }) => {
                const title = key === "daily" && !isAdmin ? tLogs("myTitle") : t(`types.${key}.title`);
                return (
                  <li key={key}>
                    <Link
                      href={key === "daily" ? "/reports/daily" : `/reports/${key}`}
                      className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`} aria-hidden>
                        <Icon size={22} />
                      </span>
                      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
                      <p className="mt-1 flex-1 text-sm text-ink-muted">{t(`types.${key}.description`)}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                        {t("open")}
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </RevealItem>
          {isAdmin && (
            <RevealItem>
              <PendingLogs />
            </RevealItem>
          )}
        </Reveal>
      </main>
    </>
  );
}
