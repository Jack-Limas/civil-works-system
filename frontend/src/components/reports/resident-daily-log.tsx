"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, NotebookPen, UsersRound } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Modal } from "@/components/ui/modal";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { useProjects } from "@/lib/projects-service";
import { useCompiledDay, useFieldReports } from "@/lib/reports-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { WEATHER_ICON, WEATHER_TONE, useLogDate } from "./compiled-day";
import { FieldReportForm } from "./field-report-form";
import { FieldReportStatusBadge } from "./field-report-detail";

/**
 * Resident "My daily log": a big "today" card (sent or not, per project),
 * a form prefilled with what was already recorded, and their history.
 */
export function ResidentDailyLog({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useTranslations("fieldReports");
  const logDate = useLogDate();
  const reduceMotion = useReducedMotion();
  const errorMessage = useApiErrorMessage();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: projects, isLoading: projectsLoading } = useProjects({ limit: 100 });
  const [chosen, setChosen] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = projects?.data ?? [];
  // Derived (not synced in an effect): the explicit choice, else the first project
  const projectId = chosen ?? list[0]?.id ?? "";
  const { data: compiled, isLoading: compiledLoading, error: compiledError } = useCompiledDay(projectId);
  const { data: history, isLoading: historyLoading } = useFieldReports({ authorId: userId, limit: 30 }, !!userId);
  const sentId = compiled?.existingReportId ?? null;
  const loadingToday = projectsLoading || (!!projectId && compiledLoading);

  return (
    <>
      <DashboardHeader title={t("myTitle")} subtitle={t("mySubtitle")} />
      <main className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          {list.length > 1 && (
            <RevealItem>
              <div role="radiogroup" aria-label={t("chooseProject")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={projectId === p.id}
                    onClick={() => setChosen(p.id)}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                      projectId === p.id ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </RevealItem>
          )}

          <RevealItem>
            {loadingToday ? (
              <div className="h-44 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" aria-busy="true" />
            ) : compiled ? (
              <motion.section
                key={`${projectId}-${sentId ?? "pending"}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`relative overflow-hidden rounded-2xl border p-5 ${sentId ? "border-success/40 bg-success/5" : "border-accent/40 bg-accent/5"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("today")}</p>
                <p className="mt-0.5 text-lg font-semibold first-letter:uppercase text-ink">{t("todayDate", { date: logDate(compiled.date) })}</p>
                <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${sentId ? "text-success" : "text-accent"}`}>
                  {sentId ? <CheckCircle2 size={17} aria-hidden /> : <NotebookPen size={17} aria-hidden />}
                  {sentId ? t("todaySent") : t("todayPending")}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink-muted">
                  {(Object.entries(compiled.counts) as Array<[keyof typeof compiled.counts, number]>)
                    .filter(([, n]) => n > 0)
                    .map(([key, n]) => (
                      <li key={key} className="rounded-full bg-surface px-2.5 py-1">
                        {t(`sections.${key === "materialMovements" ? "materials" : key}`)} · <span className="font-mono-data">{n}</span>
                      </li>
                    ))}
                </ul>
                <button
                  type="button"
                  onClick={() => (sentId ? onOpen(sentId) : setFormOpen(true))}
                  className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    sentId ? "border border-success/40 bg-surface text-success" : "bg-accent text-white shadow-lg shadow-accent/20"
                  }`}
                >
                  {sentId ? t("todayEdit") : t("todayAction")}
                  <ChevronRight size={18} aria-hidden />
                </button>
              </motion.section>
            ) : compiledError ? (
              <p role="alert" className="rounded-2xl border border-critical/30 bg-critical/5 p-5 text-sm text-critical">
                {errorMessage(compiledError)}
              </p>
            ) : null}
          </RevealItem>

          <RevealItem>
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">{t("history")}</h2>
              {historyLoading ? (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
                  ))}
                </div>
              ) : (history?.data.length ?? 0) === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-ink-muted">{t("historyEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {history?.data.map((r) => {
                    const Icon = r.weather ? WEATHER_ICON[r.weather] : null;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(r.id)}
                          className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent/50"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2" aria-hidden>
                            {Icon && r.weather ? <Icon size={18} className={WEATHER_TONE[r.weather]} /> : <NotebookPen size={18} className="text-ink-muted" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium first-letter:uppercase text-ink">{logDate(r.date)}</span>
                            <span className="block truncate text-xs text-ink-muted">
                              {r.project.name}
                              {r.workersOnSite !== null && (
                                <>
                                  {" · "}
                                  <UsersRound size={11} className="inline" aria-hidden /> {r.workersOnSite}
                                </>
                              )}
                            </span>
                          </span>
                          <FieldReportStatusBadge status={r.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </RevealItem>
        </Reveal>
      </main>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={compiled ? t("form.title", { date: logDate(compiled.date, "short") }) : t("form.newTitle")} size="lg">
        {formOpen && compiled && (
          <FieldReportForm
            mode="create"
            projectId={projectId}
            compiled={compiled}
            onDone={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
            onExists={(id) => {
              setFormOpen(false);
              onOpen(id);
            }}
          />
        )}
      </Modal>
    </>
  );
}
