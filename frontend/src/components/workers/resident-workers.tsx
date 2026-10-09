"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HardHat, Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass } from "@/components/ui/form";
import { useWorkerDirectory } from "@/lib/workers-service";
import { WorkerStatusBadge } from "./worker-status-badge";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Resident view: who works on their projects (name, trade, status). The API
 * never sends document or phone to residents, so there is nothing to hide here.
 */
export function ResidentWorkers() {
  const t = useTranslations("workers");
  const tr = useTranslations("workers.resident");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useWorkerDirectory({ search: debounced || undefined, limit: 200 });
  const workers = data?.data ?? [];

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={tr("subtitle")} />
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
        <Reveal className="space-y-4">
          <RevealItem>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filters.searchResident")}
                aria-label={t("filters.searchResident")}
                className={`${fieldClass} min-h-12 bg-surface pl-10`}
              />
            </div>
            {data && <p className="mt-2 text-xs text-ink-muted">{tr("count", { count: data.pagination.total })}</p>}
          </RevealItem>

          <RevealItem>
            {isLoading ? (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
                ))}
              </div>
            ) : workers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-muted">
                {debounced ? t("emptyFiltered") : tr("empty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {workers.map((w) => (
                  <li key={w.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent" aria-hidden>
                      <HardHat size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${w.status === "ACTIVE" ? "text-ink" : "text-ink-muted"}`}>{w.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {w.position}
                        {w.project && ` · ${w.project.name}`}
                      </p>
                    </div>
                    <WorkerStatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            )}
          </RevealItem>
        </Reveal>
      </main>
    </>
  );
}
