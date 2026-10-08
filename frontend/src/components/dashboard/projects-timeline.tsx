"use client";

import { useTranslations } from "next-intl";
import { useProjects } from "@/lib/projects-service";
import { Link } from "@/i18n/navigation";

function progressColor(pct: number) {
  if (pct >= 75) return "bg-success";
  if (pct >= 40) return "bg-accent";
  return "bg-warning";
}

export function ProjectsTimeline() {
  const t = useTranslations("dashboard.timeline");
  const { data, isLoading } = useProjects({ status: "IN_PROGRESS", limit: 8 });
  const projects = data?.data ?? [];

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{t("title")}</h2>
        <Link href="/projects" className="text-xs text-accent hover:underline">
          {t("seeAll")}
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
              <div className="h-2 w-full animate-pulse rounded-full bg-surface-2 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && projects.length === 0 && <p className="text-sm text-ink-muted">{t("empty")}</p>}

      <ul className="space-y-5">
        {projects.map((p) => (
          <li key={p.id}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <Link href={`/projects/${p.id}`} className="truncate font-medium text-ink hover:text-accent">
                {p.name}
              </Link>
              <span className="shrink-0 font-mono-data text-ink-muted">
                {t("completed", { value: p.progressPercentage })}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={p.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={p.name}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor(p.progressPercentage)}`}
                style={{ width: `${Math.min(100, p.progressPercentage)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-muted">{p.municipality}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
