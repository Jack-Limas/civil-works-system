"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { useProjects } from "@/lib/projects-service";
import { Link } from "@/i18n/navigation";

export function UpcomingMilestonesWidget() {
  const t = useTranslations("dashboard.milestones");
  const format = useFormatter();
  const { data, isLoading } = useProjects({ status: "IN_PROGRESS", limit: 50 });

  const projects = useMemo(
    () =>
      [...(data?.data ?? [])]
        .sort((a, b) => new Date(a.estimatedEndDate).getTime() - new Date(b.estimatedEndDate).getTime())
        .slice(0, 3),
    [data]
  );

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={16} className="text-accent" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
      </div>

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {projects.map((p) => {
          const date = new Date(p.estimatedEndDate);
          return (
            <li key={p.id} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2 text-center">
                <span className="text-[10px] font-medium uppercase text-ink-muted">
                  {format.dateTime(date, { month: "short" })}
                </span>
                <span className="font-mono-data text-sm font-semibold leading-none text-ink">
                  {format.dateTime(date, { day: "numeric" })}
                </span>
              </div>
              <div className="min-w-0">
                <Link href={`/projects/${p.id}`} className="block truncate text-sm font-medium text-ink hover:text-accent">
                  {p.name}
                </Link>
                <p className="text-xs text-ink-muted">{p.municipality}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {!isLoading && projects.length === 0 && <p className="text-sm text-ink-muted">{t("empty")}</p>}
    </section>
  );
}
