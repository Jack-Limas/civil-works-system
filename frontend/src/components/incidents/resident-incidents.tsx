"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronRight, CircleCheckBig, Megaphone } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Pagination } from "@/components/ui/pagination";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { useIncidentList, type IncidentFilters } from "@/lib/incidents-service";
import { IncidentPriorityBadge, IncidentStatusBadge, IncidentTypeIcon } from "./incident-badges";
import { IncidentStatusActions } from "./incident-status-actions";

const PAGE_SIZE = 20;
type Tab = "active" | "resolved";

/**
 * Resident view, one-handed on site: report in two taps, see what is still
 * open on their projects and move it forward right from the card.
 */
export function ResidentIncidents({ onOpen, onReport }: { onOpen: (id: string) => void; onReport: () => void }) {
  const t = useTranslations("incidents");
  const tr = useTranslations("incidents.resident");
  const format = useFormatter();
  const [tab, setTab] = useState<Tab>("active");
  const [page, setPage] = useState(1);
  const filters: IncidentFilters =
    tab === "active" ? { state: "active", sort: "priority", page, limit: PAGE_SIZE } : { status: "RESOLVED", sort: "date", page, limit: PAGE_SIZE };
  const { data, isLoading } = useIncidentList(filters);
  const incidents = data?.data ?? [];

  return (
    <>
      <DashboardHeader title={tr("title")} subtitle={tr("subtitle")} />
      <main className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <button
              type="button"
              onClick={onReport}
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-accent px-5 text-left text-white shadow-lg shadow-accent/20 transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20" aria-hidden>
                <Megaphone size={26} />
              </span>
              <span>
                <span className="block text-lg font-semibold">{tr("reportButton")}</span>
                <span className="block text-sm text-white/85">{tr("reportHint")}</span>
              </span>
            </button>
          </RevealItem>

          <RevealItem>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">{tr("mine")}</h2>
                {data && <span className="font-mono-data text-xs text-ink-muted">{data.summary.open + data.summary.inProgress}</span>}
              </div>
              <div role="tablist" aria-label={tr("mine")} className="grid grid-cols-2 rounded-xl border border-line bg-surface-2 p-1">
                {(["active", "resolved"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => {
                      setTab(value);
                      setPage(1);
                    }}
                    className={`min-h-11 rounded-lg text-sm font-medium transition-colors ${tab === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}
                  >
                    {tr(`tabs.${value}`)}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
                  ))}
                </div>
              ) : incidents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface p-8 text-center">
                  <CircleCheckBig size={28} className="text-success" aria-hidden />
                  <p className="text-sm text-ink-muted">{tab === "active" ? tr("emptyActive") : tr("emptyResolved")}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {incidents.map((incident) => (
                    <li key={incident.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                      <button
                        type="button"
                        onClick={() => onOpen(incident.id)}
                        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <IncidentTypeIcon type={incident.type} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-ink">{t(`types.${incident.type}`)}</span>
                            <IncidentPriorityBadge priority={incident.priority} />
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-sm text-ink-muted">{incident.description}</span>
                          <span className="mt-1 block truncate text-xs text-ink-muted">
                            {incident.project?.name} · {format.dateTime(new Date(incident.date), { day: "numeric", month: "short" })}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-2">
                          <IncidentStatusBadge status={incident.status} />
                          <ChevronRight size={18} className="text-ink-muted" aria-hidden />
                        </span>
                      </button>
                      {incident.status !== "RESOLVED" && (
                        <div className="border-t border-line px-4 py-3">
                          <IncidentStatusActions incident={incident} isAdmin={false} size="lg" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </RevealItem>
        </Reveal>
        {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />}
      </main>
    </>
  );
}
